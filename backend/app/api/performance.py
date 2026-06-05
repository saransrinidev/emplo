import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.api.helpers import require_view_employee
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.performance import PerformanceReview
from app.models.user import User
from app.schemas.performance import PerformanceReviewCreate, PerformanceReviewOut

router = APIRouter(prefix="/performance", tags=["performance"])


def _to_out(db: Session, review: PerformanceReview) -> PerformanceReviewOut:
    reviewer_name = None
    if review.reviewer_id:
        reviewer = db.get(Employee, review.reviewer_id)
        reviewer_name = reviewer.full_name if reviewer else None
    return PerformanceReviewOut(
        id=review.id,
        employee_id=review.employee_id,
        review_period=review.review_period,
        review_date=review.review_date,
        reviewer_name=reviewer_name,
        rating=review.rating,
        strengths=review.strengths,
        areas_for_improvement=review.areas_for_improvement,
        comments=review.comments,
    )


@router.get("", response_model=list[PerformanceReviewOut])
def list_reviews(
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PerformanceReviewOut]:
    target = employee_id or user.employee_id
    if target is None:
        return []
    require_view_employee(db, user, target)
    stmt = (
        select(PerformanceReview)
        .where(PerformanceReview.employee_id == target)
        .order_by(PerformanceReview.review_date.desc())
    )
    return [_to_out(db, r) for r in db.scalars(stmt).all()]


@router.post("", response_model=PerformanceReviewOut, status_code=201)
def add_review(
    payload: PerformanceReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> PerformanceReviewOut:
    # Set reviewer_id to the HR's employee_id if not provided
    data = payload.model_dump()
    if not data.get("reviewer_id") and user.employee_id:
        data["reviewer_id"] = user.employee_id

    review = PerformanceReview(**data)
    db.add(review)
    db.flush()

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action="add_performance_review", entity_type="performance",
               entity_id=str(review.id), changes={"employee_id": str(payload.employee_id), "rating": data.get("rating")})

    db.commit()
    db.refresh(review)

    # Notify the employee about the new review
    emp = db.get(Employee, payload.employee_id)
    if emp:
        from app.api.notifications import Notification
        emp_user = db.scalar(select(User).where(User.employee_id == emp.id))
        if emp_user:
            db.add(Notification(
                user_id=emp_user.id,
                title="Performance Review Added",
                message=f"A new performance review for {data.get('review_period', 'this period')} has been submitted. Rating: {data.get('rating', 'N/A')}/5",
            ))
            db.commit()

    return _to_out(db, review)
