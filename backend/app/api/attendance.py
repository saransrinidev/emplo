"""Attendance / Leave management endpoints.

Flow: Employee applies → Manager forwards to HR → HR approves/rejects.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.audit_helper import log_action
from app.api.deps import get_current_user, require_roles
from app.api.notify import notify_hr_and_manager, notify_hr_only
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import LeaveStatus, RoleName
from app.models.leave_request import LeaveRequest
from app.models.user import User
from app.schemas.leave_request import (
    LeaveHRAction,
    LeaveManagerAction,
    LeaveRequestCreate,
    LeaveRequestOut,
)
router = APIRouter(prefix="/attendance", tags=["attendance"])


# ─── Leave balance helpers ────────────────────────────────────────────────────

def _calculate_days(lr: LeaveRequest) -> float:
    """Calculate number of leave days from start_date to end_date (inclusive)."""
    return float((lr.end_date - lr.start_date).days + 1)


def _update_leave_balance_on_forward(db: Session, lr: LeaveRequest) -> None:
    """When manager forwards: increment 'pending' on the balance."""
    from app.models.leave_balance import LeaveBalance
    from app.models.leave_type import LeaveType
    from datetime import date
    days = _calculate_days(lr)
    lt = db.scalar(select(LeaveType).where(LeaveType.code == lr.leave_type.value))
    if not lt:
        return
    year = date.today().year
    bal = db.scalar(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == lr.employee_id,
            LeaveBalance.leave_type_id == lt.id,
            LeaveBalance.year == year,
        )
    )
    if bal:
        bal.pending = float(bal.pending) + days


def _update_leave_balance_on_approve(db: Session, lr: LeaveRequest) -> None:
    """When HR approves: move from 'pending' to 'used'."""
    from app.models.leave_balance import LeaveBalance
    from app.models.leave_type import LeaveType
    from datetime import date
    days = _calculate_days(lr)
    lt = db.scalar(select(LeaveType).where(LeaveType.code == lr.leave_type.value))
    if not lt:
        return
    year = date.today().year
    bal = db.scalar(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == lr.employee_id,
            LeaveBalance.leave_type_id == lt.id,
            LeaveBalance.year == year,
        )
    )
    if bal:
        bal.pending = max(0, float(bal.pending) - days)
        bal.used = float(bal.used) + days


def _update_leave_balance_on_reject(db: Session, lr: LeaveRequest) -> None:
    """When HR rejects: release 'pending' days."""
    from app.models.leave_balance import LeaveBalance
    from app.models.leave_type import LeaveType
    from datetime import date
    days = _calculate_days(lr)
    lt = db.scalar(select(LeaveType).where(LeaveType.code == lr.leave_type.value))
    if not lt:
        return
    year = date.today().year
    bal = db.scalar(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == lr.employee_id,
            LeaveBalance.leave_type_id == lt.id,
            LeaveBalance.year == year,
        )
    )
    if bal:
        bal.pending = max(0, float(bal.pending) - days)


def _to_out(lr: LeaveRequest, db: Session) -> LeaveRequestOut:
    """Convert model to response schema, attaching employee name."""
    emp = db.get(Employee, lr.employee_id)
    return LeaveRequestOut(
        id=lr.id,
        employee_id=lr.employee_id,
        leave_type=lr.leave_type,
        start_date=lr.start_date,
        end_date=lr.end_date,
        reason=lr.reason,
        status=lr.status,
        manager_id=lr.manager_id,
        manager_remarks=lr.manager_remarks,
        hr_id=lr.hr_id,
        hr_remarks=lr.hr_remarks,
        created_at=lr.created_at,
        updated_at=lr.updated_at,
        employee_name=emp.full_name if emp else None,
        department=emp.department if emp else None,
    )


# ─── Employee: apply for leave ───────────────────────────────────────────────

@router.post("", response_model=LeaveRequestOut, status_code=201)
def apply_for_leave(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeaveRequestOut:
    if not user.employee_id:
        raise HTTPException(400, "No employee record linked to this account")

    if payload.end_date < payload.start_date:
        raise HTTPException(400, "End date cannot be before start date")

    lr = LeaveRequest(
        employee_id=user.employee_id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status=LeaveStatus.pending,
    )
    db.add(lr)
    db.flush()

    log_action(
        db,
        actor_id=user.id,
        action="apply_leave",
        entity_type="leave_request",
        entity_id=str(lr.id),
        changes={"leave_type": lr.leave_type.value, "start_date": str(lr.start_date), "end_date": str(lr.end_date)},
    )
    db.commit()
    db.refresh(lr)

    # Notify manager
    emp = db.get(Employee, user.employee_id)
    emp_name = emp.full_name if emp else "An employee"
    notify_hr_and_manager(
        db, user,
        title="Leave Request Submitted",
        message=f"{emp_name} applied for {lr.leave_type.value} leave from {lr.start_date} to {lr.end_date}",
    )
    db.commit()

    return _to_out(lr, db)


# ─── Employee: view own leave requests ────────────────────────────────────────

@router.get("/my", response_model=list[LeaveRequestOut])
def my_leave_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LeaveRequestOut]:
    if not user.employee_id:
        return []
    stmt = (
        select(LeaveRequest)
        .where(LeaveRequest.employee_id == user.employee_id)
        .order_by(LeaveRequest.created_at.desc())
    )
    results = list(db.scalars(stmt).all())
    return [_to_out(lr, db) for lr in results]


# ─── Manager: view team pending requests ──────────────────────────────────────

@router.get("/team", response_model=list[LeaveRequestOut])
def team_leave_requests(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.manager, RoleName.hr_admin)),
) -> list[LeaveRequestOut]:
    """Manager sees pending requests from direct reports. HR sees all."""
    if user.role.name == RoleName.hr_admin:
        stmt = (
            select(LeaveRequest)
            .where(LeaveRequest.status == LeaveStatus.forwarded_to_hr)
            .order_by(LeaveRequest.created_at.desc())
        )
    else:
        # Manager: find direct reports
        if not user.employee_id:
            return []
        report_ids = list(
            db.scalars(
                select(Employee.id).where(Employee.manager_id == user.employee_id)
            )
        )
        if not report_ids:
            return []
        stmt = (
            select(LeaveRequest)
            .where(
                LeaveRequest.employee_id.in_(report_ids),
                LeaveRequest.status == LeaveStatus.pending,
            )
            .order_by(LeaveRequest.created_at.desc())
        )
    results = list(db.scalars(stmt).all())
    return [_to_out(lr, db) for lr in results]


# ─── All leave requests (HR dashboard / calendar view) ────────────────────────

@router.get("/all", response_model=list[LeaveRequestOut])
def all_leave_requests(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[LeaveRequestOut]:
    stmt = select(LeaveRequest).order_by(LeaveRequest.created_at.desc())
    if status:
        stmt = stmt.where(LeaveRequest.status == status)
    results = list(db.scalars(stmt).all())
    return [_to_out(lr, db) for lr in results]


# ─── Manager: forward or reject ──────────────────────────────────────────────

@router.put("/{leave_id}/manager", response_model=LeaveRequestOut)
def manager_action(
    leave_id: uuid.UUID,
    payload: LeaveManagerAction,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.manager)),
) -> LeaveRequestOut:
    lr = db.get(LeaveRequest, leave_id)
    if lr is None:
        raise HTTPException(404, "Leave request not found")
    if lr.status != LeaveStatus.pending:
        raise HTTPException(400, "Request is not in pending state")

    # Verify this is the manager of the employee
    if not user.employee_id:
        raise HTTPException(403, "No employee record linked")
    emp = db.get(Employee, lr.employee_id)
    if not emp or emp.manager_id != user.employee_id:
        raise HTTPException(403, "You are not the manager of this employee")

    if payload.action == "forward":
        lr.status = LeaveStatus.forwarded_to_hr
        _update_leave_balance_on_forward(db, lr)
    else:
        lr.status = LeaveStatus.rejected

    lr.manager_id = user.employee_id
    lr.manager_remarks = payload.remarks
    db.flush()

    log_action(
        db,
        actor_id=user.id,
        action=f"manager_{payload.action}_leave",
        entity_type="leave_request",
        entity_id=str(lr.id),
        changes={"status": lr.status.value, "remarks": payload.remarks},
    )
    db.commit()
    db.refresh(lr)

    # Notify HR if forwarded
    if payload.action == "forward":
        notify_hr_only(
            db, user,
            title="Leave Forwarded for Approval",
            message=f"Manager forwarded leave request from {emp.full_name} ({lr.leave_type.value} leave, {lr.start_date} to {lr.end_date})",
        )
        db.commit()

    return _to_out(lr, db)


# ─── HR: approve or reject ───────────────────────────────────────────────────

@router.put("/{leave_id}/hr", response_model=LeaveRequestOut)
def hr_action(
    leave_id: uuid.UUID,
    payload: LeaveHRAction,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> LeaveRequestOut:
    lr = db.get(LeaveRequest, leave_id)
    if lr is None:
        raise HTTPException(404, "Leave request not found")
    if lr.status != LeaveStatus.forwarded_to_hr:
        raise HTTPException(400, "Request must be forwarded by manager before HR can act")

    if payload.action == "approve":
        lr.status = LeaveStatus.approved
        # Update leave balance: increment 'used', decrement 'pending'
        _update_leave_balance_on_approve(db, lr)
    else:
        lr.status = LeaveStatus.rejected
        # Release pending balance
        _update_leave_balance_on_reject(db, lr)

    lr.hr_id = user.id
    lr.hr_remarks = payload.remarks
    db.flush()

    log_action(
        db,
        actor_id=user.id,
        action=f"hr_{payload.action}_leave",
        entity_type="leave_request",
        entity_id=str(lr.id),
        changes={"status": lr.status.value, "remarks": payload.remarks},
    )
    db.commit()
    db.refresh(lr)

    return _to_out(lr, db)
