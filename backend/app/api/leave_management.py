"""Leave types and leave balance management."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.leave_balance import LeaveBalance
from app.models.leave_type import LeaveType
from app.models.user import User
from app.schemas.leave_balance import (
    LeaveBalanceAllocate,
    LeaveBalanceOut,
    LeaveTypeCreate,
    LeaveTypeOut,
    LeaveTypeUpdate,
)

router = APIRouter(prefix="/leave-management", tags=["leave-management"])


# ─── Leave Types ──────────────────────────────────────────────────────────────

@router.get("/types", response_model=list[LeaveTypeOut])
def list_leave_types(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[LeaveType]:
    return list(db.scalars(select(LeaveType).order_by(LeaveType.name)).all())


@router.post("/types", response_model=LeaveTypeOut, status_code=201)
def create_leave_type(
    payload: LeaveTypeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> LeaveType:
    if db.scalar(select(LeaveType).where(LeaveType.code == payload.code)):
        raise HTTPException(400, "Leave type code already exists")
    if db.scalar(select(LeaveType).where(LeaveType.name == payload.name)):
        raise HTTPException(400, "Leave type name already exists")
    lt = LeaveType(**payload.model_dump())
    db.add(lt)
    db.commit()
    db.refresh(lt)
    return lt


@router.put("/types/{type_id}", response_model=LeaveTypeOut)
def update_leave_type(
    type_id: uuid.UUID,
    payload: LeaveTypeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> LeaveType:
    lt = db.get(LeaveType, type_id)
    if lt is None:
        raise HTTPException(404, "Leave type not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lt, field, value)
    db.commit()
    db.refresh(lt)
    return lt


@router.delete("/types/{type_id}", status_code=204)
def delete_leave_type(
    type_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> None:
    lt = db.get(LeaveType, type_id)
    if lt is None:
        raise HTTPException(404, "Leave type not found")
    db.delete(lt)
    db.commit()


# ─── Leave Balances ───────────────────────────────────────────────────────────

@router.get("/balances", response_model=list[LeaveBalanceOut])
def get_balances(
    employee_id: uuid.UUID | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LeaveBalanceOut]:
    """Get leave balances for an employee. Defaults to current user, current year."""
    target = employee_id or user.employee_id
    if target is None:
        return []
    target_year = year or date.today().year

    stmt = (
        select(LeaveBalance)
        .where(LeaveBalance.employee_id == target, LeaveBalance.year == target_year)
    )
    balances = list(db.scalars(stmt).all())
    result = []
    for b in balances:
        lt = db.get(LeaveType, b.leave_type_id)
        result.append(LeaveBalanceOut(
            id=b.id,
            employee_id=b.employee_id,
            leave_type_id=b.leave_type_id,
            year=b.year,
            allocated=float(b.allocated),
            used=float(b.used),
            pending=float(b.pending),
            leave_type_name=lt.name if lt else None,
        ))
    return result


@router.post("/balances", response_model=LeaveBalanceOut, status_code=201)
def allocate_balance(
    payload: LeaveBalanceAllocate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> LeaveBalanceOut:
    """Allocate or update leave balance for an employee/type/year combination."""
    if db.get(Employee, payload.employee_id) is None:
        raise HTTPException(404, "Employee not found")
    lt = db.get(LeaveType, payload.leave_type_id)
    if lt is None:
        raise HTTPException(404, "Leave type not found")

    # Upsert
    existing = db.scalar(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == payload.employee_id,
            LeaveBalance.leave_type_id == payload.leave_type_id,
            LeaveBalance.year == payload.year,
        )
    )
    if existing:
        existing.allocated = payload.allocated
        db.commit()
        db.refresh(existing)
        bal = existing
    else:
        bal = LeaveBalance(
            employee_id=payload.employee_id,
            leave_type_id=payload.leave_type_id,
            year=payload.year,
            allocated=payload.allocated,
        )
        db.add(bal)
        db.commit()
        db.refresh(bal)

    return LeaveBalanceOut(
        id=bal.id,
        employee_id=bal.employee_id,
        leave_type_id=bal.leave_type_id,
        year=bal.year,
        allocated=float(bal.allocated),
        used=float(bal.used),
        pending=float(bal.pending),
        leave_type_name=lt.name,
    )
