import uuid
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin

import enum
from sqlalchemy import Enum as SAEnum


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    half_day = "half_day"
    on_leave = "on_leave"
    holiday = "holiday"
    weekend = "weekend"


class AttendanceRecord(Base, UUIDMixin, TimestampMixin):
    """Daily attendance record per employee."""

    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", name="uq_attendance_emp_date"),
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"),
        index=True, nullable=False
    )
    work_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    check_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    check_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    work_hours: Mapped[float | None] = mapped_column(Numeric(5, 2))
    status: Mapped[AttendanceStatus] = mapped_column(
        SAEnum(AttendanceStatus, name="attendance_status"),
        default=AttendanceStatus.present, nullable=False
    )
    source: Mapped[str | None] = mapped_column(String(50))  # biometric, web, mobile, manual
