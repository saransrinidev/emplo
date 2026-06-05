import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.api.helpers import require_view_employee
from app.db.session import get_db
from app.models.enums import ApprovalStatus, RoleName
from app.models.salary import SalaryRevision
from app.models.user import User
from app.schemas.salary import (
    CurrentSalaryOut,
    SalaryRevisionCreate,
    SalaryRevisionOut,
)

router = APIRouter(prefix="/salary", tags=["salary"])


def _resolve_target(user: User, employee_id: uuid.UUID | None) -> uuid.UUID | None:
    return employee_id or user.employee_id


@router.get("/history", response_model=list[SalaryRevisionOut])
def salary_history(
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SalaryRevision]:
    target = _resolve_target(user, employee_id)
    if target is None:
        return []
    require_view_employee(db, user, target)
    stmt = (
        select(SalaryRevision)
        .where(SalaryRevision.employee_id == target)
        .order_by(SalaryRevision.effective_date.desc())
    )
    return list(db.scalars(stmt).all())


@router.get("/current", response_model=CurrentSalaryOut)
def current_salary(
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CurrentSalaryOut:
    target = _resolve_target(user, employee_id)
    if target is None:
        return CurrentSalaryOut()
    require_view_employee(db, user, target)
    # Current salary = latest APPROVED revision only.
    stmt = (
        select(SalaryRevision)
        .where(
            SalaryRevision.employee_id == target,
            SalaryRevision.approval_status == ApprovalStatus.approved,
        )
        .order_by(SalaryRevision.effective_date.desc())
        .limit(1)
    )
    latest = db.scalars(stmt).first()
    if latest is None:
        return CurrentSalaryOut()
    return CurrentSalaryOut(
        current_salary=latest.revised_salary,
        latest_revision_date=latest.effective_date,
    )


@router.post("/revisions", response_model=SalaryRevisionOut, status_code=201)
def add_revision(
    payload: SalaryRevisionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> SalaryRevision:
    revision = SalaryRevision(**payload.model_dump(), created_by=user.id)
    db.add(revision)
    db.flush()

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action="add_salary_revision", entity_type="salary",
               entity_id=str(revision.id), changes={"employee_id": str(payload.employee_id), "revised_salary": str(payload.revised_salary)})

    db.commit()
    db.refresh(revision)
    return revision
