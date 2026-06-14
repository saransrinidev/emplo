import uuid
from datetime import date as date_type

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class HolidayCalendar(Base, UUIDMixin, TimestampMixin):
    """A named holiday calendar (per region / year)."""

    __tablename__ = "holiday_calendars"

    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100))
    year: Mapped[int] = mapped_column(Integer, nullable=False)

    holidays: Mapped[list["Holiday"]] = relationship(
        back_populates="calendar", cascade="all, delete-orphan"
    )


class Holiday(Base, UUIDMixin, TimestampMixin):
    """A single holiday entry within a calendar."""

    __tablename__ = "holidays"
    __table_args__ = (
        UniqueConstraint("calendar_id", "holiday_date", name="uq_holiday_calendar_date"),
    )

    calendar_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("holiday_calendars.id", ondelete="CASCADE"), nullable=False
    )
    holiday_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    calendar: Mapped["HolidayCalendar"] = relationship(back_populates="holidays")
