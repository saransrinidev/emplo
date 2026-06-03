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
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> PerformanceReviewOut:
    review = PerformanceReview(**payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return _to_out(db, review)
