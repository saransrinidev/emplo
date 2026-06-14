"""Attendance check-in/check-out and records."""
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.attendance_record import AttendanceRecord, AttendanceStatus
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.user import User

router = APIRouter(prefix="/attendance-records", tags=["attendance-records"])


class CheckInOut(BaseModel):
    source: str = "web"


class AttendanceRecordOut(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    work_date: date
    check_in: datetime | None = None
    check_out: datetime | None = None
    work_hours: float | None = None
    status: AttendanceStatus
    source: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("/check-in", response_model=AttendanceRecordOut, status_code=201)
def check_in(
    payload: CheckInOut = CheckInOut(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AttendanceRecord:
    if not user.employee_id:
        raise HTTPException(400, "No employee record linked")
    today = date.today()
    # Check if already checked in today
    existing = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == user.employee_id,
            AttendanceRecord.work_date == today,
        )
    )
    if existing:
        if existing.check_in:
            raise HTTPException(400, "Already checked in today")
        existing.check_in = datetime.now(timezone.utc)
        existing.source = payload.source
        existing.status = AttendanceStatus.present
        db.commit()
        db.refresh(existing)
        return existing

    record = AttendanceRecord(
        employee_id=user.employee_id,
        work_date=today,
        check_in=datetime.now(timezone.utc),
        status=AttendanceStatus.present,
        source=payload.source,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/check-out", response_model=AttendanceRecordOut)
def check_out(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AttendanceRecord:
    if not user.employee_id:
        raise HTTPException(400, "No employee record linked")
    today = date.today()
    record = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == user.employee_id,
            AttendanceRecord.work_date == today,
        )
    )
    if record is None or record.check_in is None:
        raise HTTPException(400, "Must check in before checking out")
    if record.check_out is not None:
        raise HTTPException(400, "Already checked out today")

    record.check_out = datetime.now(timezone.utc)
    # Calculate work hours
    delta = record.check_out - record.check_in
    record.work_hours = round(delta.total_seconds() / 3600, 2)
    if record.work_hours < 4:
        record.status = AttendanceStatus.half_day
    db.commit()
    db.refresh(record)
    return record


@router.get("/my", response_model=list[AttendanceRecordOut])
def my_attendance(
    month: int | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AttendanceRecord]:
    if not user.employee_id:
        return []
    stmt = (
        select(AttendanceRecord)
        .where(AttendanceRecord.employee_id == user.employee_id)
        .order_by(AttendanceRecord.work_date.desc())
    )
    if month and year:
        from sqlalchemy import extract
        stmt = stmt.where(
            extract("month", AttendanceRecord.work_date) == month,
            extract("year", AttendanceRecord.work_date) == year,
        )
    return list(db.scalars(stmt).all())


@router.get("/team", response_model=list[AttendanceRecordOut])
def team_attendance(
    work_date: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.manager, RoleName.hr_admin)),
) -> list[AttendanceRecord]:
    target_date = work_date or date.today()
    if user.role.name == RoleName.hr_admin:
        stmt = (
            select(AttendanceRecord)
            .where(AttendanceRecord.work_date == target_date)
            .order_by(AttendanceRecord.check_in)
        )
    else:
        if not user.employee_id:
            return []
        report_ids = list(
            db.scalars(select(Employee.id).where(Employee.manager_id == user.employee_id))
        )
        if not report_ids:
            return []
        stmt = (
            select(AttendanceRecord)
            .where(
                AttendanceRecord.employee_id.in_(report_ids),
                AttendanceRecord.work_date == target_date,
            )
        )
    return list(db.scalars(stmt).all())
