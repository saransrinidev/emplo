"""Profile change request workflow.

Employee submits → HR reviews (approve/reject) → if approved, changes are applied.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import EditableSection, RoleName
from app.models.profile_change_request import ChangeStatus, ProfileChangeRequest
from app.models.user import User

router = APIRouter(prefix="/profile-changes", tags=["profile-changes"])


# ─── Employee: submit a change request ────────────────────────────────────────

class SubmitChangeRequest:
    """Inline schema to avoid circular imports."""
    pass

from pydantic import BaseModel


class SubmitRequest(BaseModel):
    section: EditableSection
    proposed_changes: dict


class ReviewRequest(BaseModel):
    action: str  # "approve" or "reject"
    remarks: str | None = None


class ChangeRequestOut(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    section: EditableSection
    proposed_changes: dict
    previous_values: dict | None = None
    status: ChangeStatus
    reviewed_by: uuid.UUID | None = None
    review_remarks: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=ChangeRequestOut, status_code=201)
def submit_change(
    payload: SubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileChangeRequest:
    if not user.employee_id:
        raise HTTPException(400, "No employee record linked")
    emp = db.get(Employee, user.employee_id)
    if emp is None:
        raise HTTPException(400, "Employee not found")

    # Capture previous values for the requested section
    previous: dict = {}
    if payload.section == EditableSection.address:
        previous = {"mobile_number": emp.mobile_number}
    elif payload.section == EditableSection.phone:
        previous = {"mobile_number": emp.mobile_number}
    elif payload.section == EditableSection.certifications:
        previous = {}

    req = ProfileChangeRequest(
        employee_id=user.employee_id,
        section=payload.section,
        proposed_changes=payload.proposed_changes,
        previous_values=previous,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/my", response_model=list[ChangeRequestOut])
def my_changes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProfileChangeRequest]:
    if not user.employee_id:
        return []
    stmt = (
        select(ProfileChangeRequest)
        .where(ProfileChangeRequest.employee_id == user.employee_id)
        .order_by(ProfileChangeRequest.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.get("/pending", response_model=list[ChangeRequestOut])
def pending_changes(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[ProfileChangeRequest]:
    stmt = (
        select(ProfileChangeRequest)
        .where(ProfileChangeRequest.status == ChangeStatus.pending)
        .order_by(ProfileChangeRequest.created_at.asc())
    )
    return list(db.scalars(stmt).all())


@router.put("/{request_id}/review", response_model=ChangeRequestOut)
def review_change(
    request_id: uuid.UUID,
    payload: ReviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> ProfileChangeRequest:
    req = db.get(ProfileChangeRequest, request_id)
    if req is None:
        raise HTTPException(404, "Change request not found")
    if req.status != ChangeStatus.pending:
        raise HTTPException(400, "Request is not pending")

    if payload.action not in ("approve", "reject"):
        raise HTTPException(400, "Action must be 'approve' or 'reject'")

    if payload.action == "approve":
        req.status = ChangeStatus.approved
        # Apply the changes to the employee record
        emp = db.get(Employee, req.employee_id)
        if emp:
            for field, value in req.proposed_changes.items():
                if hasattr(emp, field):
                    setattr(emp, field, value)
    else:
        req.status = ChangeStatus.rejected

    req.reviewed_by = user.id
    req.review_remarks = payload.remarks
    req.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return req
