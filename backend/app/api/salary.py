"""Salary revision management with approval workflow.

Flow:
1. HR creates a revision proposal (status: pending)
2. Another HR user (or same, for now) approves or rejects
3. Only APPROVED revisions count toward "current salary"
4. Auto-fills previous_salary and revision_percentage from latest approved
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.api.helpers import require_view_employee
from app.db.session import get_db
from app.models.employee import Employee
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


def _get_latest_approved(db: Session, employee_id: uuid.UUID) -> SalaryRevision | None:
    """Get the most recent approved salary revision for an employee."""
    return db.scalars(
        select(SalaryRevision)
        .where(
            SalaryRevision.employee_id == employee_id,
            SalaryRevision.approval_status == ApprovalStatus.approved,
        )
        .order_by(SalaryRevision.effective_date.desc())
        .limit(1)
    ).first()


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
    latest = _get_latest_approved(db, target)
    if latest is None:
        return CurrentSalaryOut()
    return CurrentSalaryOut(
        current_salary=latest.revised_salary,
        latest_revision_date=latest.effective_date,
    )


@router.get("/pending", response_model=list[SalaryRevisionOut])
def pending_revisions(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[SalaryRevision]:
    """List all salary revisions pending approval."""
    stmt = (
        select(SalaryRevision)
        .where(SalaryRevision.approval_status == ApprovalStatus.pending)
        .order_by(SalaryRevision.effective_date.desc())
    )
    return list(db.scalars(stmt).all())


@router.post("/revisions", response_model=SalaryRevisionOut, status_code=201)
def add_revision(
    payload: SalaryRevisionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> SalaryRevision:
    """Create a salary revision proposal. Auto-fills previous salary and % if not provided."""
    emp = db.get(Employee, payload.employee_id)
    if emp is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    if payload.revised_salary <= 0:
        raise HTTPException(status_code=400, detail="Revised salary must be greater than zero")

    data = payload.model_dump()

    # Auto-fill previous_salary from latest approved revision
    latest = _get_latest_approved(db, payload.employee_id)
    if latest and data.get("previous_salary") is None:
        data["previous_salary"] = latest.revised_salary

    # Auto-calculate revision_percentage if we have previous and revised
    if data.get("previous_salary") and data.get("revised_salary") and data.get("revision_percentage") is None:
        prev = float(data["previous_salary"])
        rev = float(data["revised_salary"])
        if prev > 0:
            data["revision_percentage"] = round((rev - prev) / prev * 100, 2)

    # If this is the first salary (no existing approved revision), auto-approve it
    # Otherwise it requires approval
    if latest is None:
        data["approval_status"] = ApprovalStatus.approved
        data["comments"] = data.get("comments") or "Initial Salary"
    else:
        data["approval_status"] = ApprovalStatus.pending

    revision = SalaryRevision(**data, created_by=user.id)
    db.add(revision)
    db.flush()

    from app.api.audit_helper import log_action
    log_action(
        db, actor_id=user.id, action="propose_salary_revision", entity_type="salary",
        entity_id=str(revision.id),
        changes={
            "employee_id": str(payload.employee_id),
            "employee_name": emp.full_name,
            "previous_salary": str(data.get("previous_salary")),
            "revised_salary": str(data["revised_salary"]),
            "revision_percentage": str(data.get("revision_percentage")),
        },
    )

    db.commit()
    db.refresh(revision)

    # Notify other HR admins about the pending revision
    from app.api.notify import notify_hr_only
    notify_hr_only(
        db, user,
        title="Salary Revision Proposed",
        message=f"A salary revision for {emp.full_name} has been proposed: ₹{data.get('previous_salary', '—')} → ₹{data['revised_salary']} ({data.get('revision_percentage', '—')}%). Awaiting approval.",
    )
    db.commit()

    return revision


@router.put("/revisions/{revision_id}/approve", response_model=SalaryRevisionOut)
def approve_revision(
    revision_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> SalaryRevision:
    """Approve a pending salary revision. Only pending revisions can be approved."""
    revision = db.get(SalaryRevision, revision_id)
    if revision is None:
        raise HTTPException(404, "Salary revision not found")
    if revision.approval_status != ApprovalStatus.pending:
        raise HTTPException(400, f"Revision is already {revision.approval_status.value}")

    revision.approval_status = ApprovalStatus.approved
    db.flush()

    from app.api.audit_helper import log_action
    log_action(
        db, actor_id=user.id, action="approve_salary_revision", entity_type="salary",
        entity_id=str(revision.id),
        changes={"status": "approved", "employee_id": str(revision.employee_id)},
    )

    db.commit()
    db.refresh(revision)

    # Notify the employee
    emp_user = db.scalar(select(User).where(User.employee_id == revision.employee_id))
    if emp_user:
        from app.api.notifications import Notification
        db.add(Notification(
            user_id=emp_user.id,
            title="Salary Revision Approved",
            message=f"Your salary has been revised to ₹{revision.revised_salary} effective {revision.effective_date}.",
        ))
        db.commit()

    return revision


@router.put("/revisions/{revision_id}/reject", response_model=SalaryRevisionOut)
def reject_revision(
    revision_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> SalaryRevision:
    """Reject a pending salary revision."""
    revision = db.get(SalaryRevision, revision_id)
    if revision is None:
        raise HTTPException(404, "Salary revision not found")
    if revision.approval_status != ApprovalStatus.pending:
        raise HTTPException(400, f"Revision is already {revision.approval_status.value}")

    revision.approval_status = ApprovalStatus.rejected
    db.flush()

    from app.api.audit_helper import log_action
    log_action(
        db, actor_id=user.id, action="reject_salary_revision", entity_type="salary",
        entity_id=str(revision.id),
        changes={"status": "rejected", "employee_id": str(revision.employee_id)},
    )

    db.commit()
    db.refresh(revision)
    return revision
