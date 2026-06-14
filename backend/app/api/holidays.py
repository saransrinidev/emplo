"""Holiday calendar management."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import RoleName
from app.models.holiday import Holiday, HolidayCalendar
from app.models.user import User
from app.schemas.holiday import (
    HolidayCalendarCreate,
    HolidayCalendarOut,
    HolidayCreate,
    HolidayOut,
)

router = APIRouter(prefix="/holidays", tags=["holidays"])


# ─── Calendars ────────────────────────────────────────────────────────────────

@router.get("/calendars", response_model=list[HolidayCalendarOut])
def list_calendars(
    year: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[HolidayCalendar]:
    stmt = select(HolidayCalendar).order_by(HolidayCalendar.year.desc())
    if year:
        stmt = stmt.where(HolidayCalendar.year == year)
    return list(db.scalars(stmt).all())


@router.post("/calendars", response_model=HolidayCalendarOut, status_code=201)
def create_calendar(
    payload: HolidayCalendarCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> HolidayCalendar:
    if db.scalar(select(HolidayCalendar).where(HolidayCalendar.name == payload.name)):
        raise HTTPException(400, "Calendar name already exists")
    cal = HolidayCalendar(**payload.model_dump())
    db.add(cal)
    db.commit()
    db.refresh(cal)
    return cal


@router.delete("/calendars/{cal_id}", status_code=204)
def delete_calendar(
    cal_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> None:
    cal = db.get(HolidayCalendar, cal_id)
    if cal is None:
        raise HTTPException(404, "Calendar not found")
    db.delete(cal)
    db.commit()


# ─── Holidays ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[HolidayOut])
def list_holidays(
    calendar_id: uuid.UUID | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Holiday]:
    stmt = select(Holiday).order_by(Holiday.holiday_date)
    if calendar_id:
        stmt = stmt.where(Holiday.calendar_id == calendar_id)
    if year:
        from sqlalchemy import extract
        stmt = stmt.where(extract("year", Holiday.holiday_date) == year)
    return list(db.scalars(stmt).all())


@router.post("", response_model=HolidayOut, status_code=201)
def add_holiday(
    payload: HolidayCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> Holiday:
    if db.get(HolidayCalendar, payload.calendar_id) is None:
        raise HTTPException(400, "Calendar not found")
    holiday = Holiday(**payload.model_dump())
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


@router.delete("/{holiday_id}", status_code=204)
def remove_holiday(
    holiday_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> None:
    h = db.get(Holiday, holiday_id)
    if h is None:
        raise HTTPException(404, "Holiday not found")
    db.delete(h)
    db.commit()
