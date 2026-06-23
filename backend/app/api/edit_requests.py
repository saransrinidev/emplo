"""Profile edit access request workflow.

Flow:
1. Employee/Manager: POST /edit-requests          → request edit access (status=pending)
2. HR:              PUT /edit-requests/{id}/approve → approve with time window (status=approved)
3. Employee:        PUT /edit-requests/{id}/submit  → submit edited data (status=changes_submitted)
4. HR:              PUT /edit-requests/{id}/confirm → confirm to keep OR reject changes

Employee can only edit their profile section while the window is open (status=approved,
within window_start..window_end). The existing /profile/phone and /profile/address
endpoints already check for active EmployeeEditPermission — this flow auto-creates
that permission when HR approves.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.address import EmployeeAddress
from app.models.edit_permission import EmployeeEditPermission
from app.models.edit_request import EditAccessRequest, EditRequestStatus
from app.models.employee import Employee
from app.models.enums import EditableSection, RoleName
from app.models.user import User

router = APIRouter(prefix="/edit-requests", tags=["edit-requests"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CreateEditRequest(BaseModel):
    section: EditableSection
    reason: str | None = None


class ApproveRequest(BaseModel):
    window_hours: int = 24  # 24, 48, 72
    remarks: str | None = None


class SubmitChangesRequest(BaseModel):
    data: dict  # the edited field values


class ConfirmRequest(BaseModel):
    action: str  # "confirm" or "reject"
    remarks: str | None = None


class EditRequestOut(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str | None = None
    section: EditableSection
    reason: str | None = None
    status: EditRequestStatus
    window_hours: int | None = None
    window_start: datetime | None = None
    window_end: datetime | None = None
    hr_remarks: str | None = None
    previous_data: dict | None = None
    submitted_data: dict | None = None
    submitted_at: datetime | None = None
    confirm_remarks: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_current_section_data(db: Session, employee_id: uuid.UUID, section: EditableSection) -> dict:
    """Snapshot current data for a section."""
    emp = db.get(Employee, employee_id)
    if not emp:
        return {}
    if section == EditableSection.phone:
        return {"mobile_number": emp.mobile_number}
    elif section == EditableSection.address:
        addresses = list(db.scalars(
            select(EmployeeAddress).where(EmployeeAddress.employee_id == employee_id)
        ).all())
        return {
            "addresses": [
                {
                    "address_type": a.address_type.value,
                    "address_line": a.address_line,
                    "city": a.city,
                    "state": a.state,
                    "postal_code": a.postal_code,
                    "country": a.country,
                }
                for a in addresses
            ]
        }
    elif section == EditableSection.certifications:
        return {}
    return {}


def _to_out(req: EditAccessRequest, db: Session) -> EditRequestOut:
    emp = db.get(Employee, req.employee_id)
    return EditRequestOut(
        id=req.id,
        employee_id=req.employee_id,
        employee_name=emp.full_name if emp else None,
        section=req.section,
        reason=req.reason,
        status=req.status,
        window_hours=req.window_hours,
        window_start=req.window_start,
        window_end=req.window_end,
        hr_remarks=req.hr_remarks,
        previous_data=req.previous_data,
        submitted_data=req.submitted_data,
        submitted_at=req.submitted_at,
        confirm_remarks=req.confirm_remarks,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


# ─── Employee/Manager: Request edit access ────────────────────────────────────

@router.post("", response_model=EditRequestOut, status_code=201)
def request_edit_access(
    payload: CreateEditRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EditRequestOut:
    """Employee or Manager requests edit access to a profile section."""
    if not user.employee_id:
        raise HTTPException(400, "No employee record linked")

    # Check if there's already a pending/approved request for this section
    existing = db.scalar(
        select(EditAccessRequest).where(
            EditAccessRequest.employee_id == user.employee_id,
            EditAccessRequest.section == payload.section,
            EditAccessRequest.status.in_([
                EditRequestStatus.pending,
                EditRequestStatus.approved,
                EditRequestStatus.changes_submitted,
            ]),
        )
    )
    if existing:
        raise HTTPException(400, "You already have an active request for this section")

    req = EditAccessRequest(
        employee_id=user.employee_id,
        section=payload.section,
        reason=payload.reason,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Notify HR
    from app.api.notify import notify_hr_only
    emp = db.get(Employee, user.employee_id)
    emp_name = emp.full_name if emp else "An employee"
    notify_hr_only(
        db, user,
        title="Profile Edit Request",
        message=f"{emp_name} is requesting edit access to their {payload.section.value} section.",
    )
    db.commit()

    return _to_out(req, db)


# ─── Employee/Manager: View my requests ───────────────────────────────────────

@router.get("/my", response_model=list[EditRequestOut])
def my_edit_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[EditRequestOut]:
    if not user.employee_id:
        return []
    stmt = (
        select(EditAccessRequest)
        .where(EditAccessRequest.employee_id == user.employee_id)
        .order_by(EditAccessRequest.created_at.desc())
    )
    requests = list(db.scalars(stmt).all())
    # Auto-expire requests whose window has passed
    now = datetime.now(timezone.utc)
    for req in requests:
        if req.status == EditRequestStatus.approved and req.window_end and now > req.window_end:
            req.status = EditRequestStatus.expired
    db.commit()
    return [_to_out(r, db) for r in requests]


# ─── HR: View all pending requests ───────────────────────────────────────────

@router.get("/pending", response_model=list[EditRequestOut])
def pending_edit_requests(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[EditRequestOut]:
    stmt = (
        select(EditAccessRequest)
        .where(EditAccessRequest.status.in_([
            EditRequestStatus.pending,
            EditRequestStatus.changes_submitted,
        ]))
        .order_by(EditAccessRequest.created_at.asc())
    )
    return [_to_out(r, db) for r in db.scalars(stmt).all()]


# ─── HR: Approve with time window ────────────────────────────────────────────

@router.put("/{request_id}/approve", response_model=EditRequestOut)
def approve_edit_request(
    request_id: uuid.UUID,
    payload: ApproveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> EditRequestOut:
    req = db.get(EditAccessRequest, request_id)
    if req is None:
        raise HTTPException(404, "Request not found")
    if req.status != EditRequestStatus.pending:
        raise HTTPException(400, "Request is not in pending state")
    if payload.window_hours < 1:
        raise HTTPException(400, "Window must be at least 1 hour")

    now = datetime.now(timezone.utc)
    req.status = EditRequestStatus.approved
    req.approved_by = user.id
    req.window_hours = payload.window_hours
    req.window_start = now
    req.window_end = now + timedelta(hours=payload.window_hours)
    req.hr_remarks = payload.remarks

    # Capture current data before changes
    req.previous_data = _get_current_section_data(db, req.employee_id, req.section)

    # Auto-create an EmployeeEditPermission so existing /profile/* endpoints work
    perm = EmployeeEditPermission(
        employee_id=req.employee_id,
        section=req.section,
        granted_by=user.id,
        start_at=req.window_start,
        expiry_at=req.window_end,
    )
    db.add(perm)
    db.commit()
    db.refresh(req)

    # Notify employee
    from app.api.notifications import Notification
    emp_user = db.scalar(select(User).where(User.employee_id == req.employee_id))
    if emp_user:
        hours = payload.window_hours
        db.add(Notification(
            user_id=emp_user.id,
            title="Edit Access Approved",
            message=f"Your request to edit {req.section.value} has been approved. You have {hours} hour{'s' if hours != 1 else ''} to make changes.",
        ))
        db.commit()

    return _to_out(req, db)


# ─── HR: Reject the request ──────────────────────────────────────────────────

@router.put("/{request_id}/reject", response_model=EditRequestOut)
def reject_edit_request(
    request_id: uuid.UUID,
    payload: ConfirmRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> EditRequestOut:
    req = db.get(EditAccessRequest, request_id)
    if req is None:
        raise HTTPException(404, "Request not found")
    if req.status not in (EditRequestStatus.pending, EditRequestStatus.changes_submitted):
        raise HTTPException(400, "Cannot reject this request in its current state")

    req.status = EditRequestStatus.rejected
    req.hr_remarks = payload.remarks
    req.confirmed_by = user.id
    req.confirmed_at = datetime.now(timezone.utc)
    req.confirm_remarks = payload.remarks

    # If changes_submitted and rejected, revert the data
    if req.previous_data and req.submitted_data:
        _revert_changes(db, req.employee_id, req.section, req.previous_data)

    db.commit()
    db.refresh(req)

    # Notify employee
    from app.api.notifications import Notification
    emp_user = db.scalar(select(User).where(User.employee_id == req.employee_id))
    if emp_user:
        db.add(Notification(
            user_id=emp_user.id,
            title="Edit Request Rejected",
            message=f"Your edit request for {req.section.value} was rejected. {payload.remarks or ''}".strip(),
        ))
        db.commit()

    return _to_out(req, db)


# ─── Employee: Submit changes for HR confirmation ─────────────────────────────

@router.put("/{request_id}/submit", response_model=EditRequestOut)
def submit_changes(
    request_id: uuid.UUID,
    payload: SubmitChangesRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EditRequestOut:
    """Employee clicks 'Confirm my changes' after editing."""
    req = db.get(EditAccessRequest, request_id)
    if req is None:
        raise HTTPException(404, "Request not found")
    if req.employee_id != user.employee_id:
        raise HTTPException(403, "Not your request")
    if req.status != EditRequestStatus.approved:
        raise HTTPException(400, "Request is not in approved state (edit window may have expired)")

    # Check time window
    now = datetime.now(timezone.utc)
    if req.window_end and now > req.window_end:
        req.status = EditRequestStatus.expired
        db.commit()
        raise HTTPException(400, "Edit window has expired")

    req.status = EditRequestStatus.changes_submitted
    req.submitted_data = payload.data
    req.submitted_at = now
    db.commit()
    db.refresh(req)

    # Notify HR
    from app.api.notify import notify_hr_only
    emp = db.get(Employee, req.employee_id)
    emp_name = emp.full_name if emp else "An employee"
    notify_hr_only(
        db, user,
        title="Profile Changes Submitted",
        message=f"{emp_name} has submitted their {req.section.value} changes for confirmation.",
    )
    db.commit()

    return _to_out(req, db)


# ─── HR: Confirm changes (keep) ──────────────────────────────────────────────

@router.put("/{request_id}/confirm", response_model=EditRequestOut)
def confirm_changes(
    request_id: uuid.UUID,
    payload: ConfirmRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> EditRequestOut:
    """HR confirms the submitted changes — data is kept."""
    req = db.get(EditAccessRequest, request_id)
    if req is None:
        raise HTTPException(404, "Request not found")
    if req.status != EditRequestStatus.changes_submitted:
        raise HTTPException(400, "No changes to confirm")

    if payload.action == "confirm":
        req.status = EditRequestStatus.confirmed
        req.confirmed_by = user.id
        req.confirmed_at = datetime.now(timezone.utc)
        req.confirm_remarks = payload.remarks
    elif payload.action == "reject":
        req.status = EditRequestStatus.rejected
        req.confirmed_by = user.id
        req.confirmed_at = datetime.now(timezone.utc)
        req.confirm_remarks = payload.remarks
        # Revert data to previous state
        if req.previous_data:
            _revert_changes(db, req.employee_id, req.section, req.previous_data)
    else:
        raise HTTPException(400, "Action must be 'confirm' or 'reject'")

    db.commit()
    db.refresh(req)

    # Notify employee
    from app.api.notifications import Notification
    emp_user = db.scalar(select(User).where(User.employee_id == req.employee_id))
    if emp_user:
        if req.status == EditRequestStatus.confirmed:
            msg = f"Your {req.section.value} changes have been confirmed and saved."
        else:
            msg = f"Your {req.section.value} changes were rejected and reverted. {payload.remarks or ''}".strip()
        db.add(Notification(user_id=emp_user.id, title="Profile Changes Reviewed", message=msg))
        db.commit()

    return _to_out(req, db)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _revert_changes(db: Session, employee_id: uuid.UUID, section: EditableSection, previous_data: dict) -> None:
    """Revert employee's section data to what it was before the edit window."""
    emp = db.get(Employee, employee_id)
    if not emp:
        return

    if section == EditableSection.phone:
        emp.mobile_number = previous_data.get("mobile_number")

    elif section == EditableSection.address:
        prev_addresses = previous_data.get("addresses", [])
        # Delete current addresses and recreate from previous
        current_addrs = list(db.scalars(
            select(EmployeeAddress).where(EmployeeAddress.employee_id == employee_id)
        ).all())
        for addr in current_addrs:
            db.delete(addr)
        db.flush()
        for a in prev_addresses:
            from app.models.enums import AddressType
            db.add(EmployeeAddress(
                employee_id=employee_id,
                address_type=AddressType(a["address_type"]),
                address_line=a.get("address_line"),
                city=a.get("city"),
                state=a.get("state"),
                postal_code=a.get("postal_code"),
                country=a.get("country"),
            ))
