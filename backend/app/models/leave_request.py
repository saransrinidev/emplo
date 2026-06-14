import uuid
from datetime import date

from sqlalchemy import Date, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import LeaveStatus, LeaveType


class LeaveRequest(Base, UUIDMixin, TimestampMixin):
    """Leave / attendance request raised by an employee."""

    __tablename__ = "leave_requests"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    leave_type: Mapped[LeaveType] = mapped_column(
        SAEnum(LeaveType, name="leave_type"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    status: Mapped[LeaveStatus] = mapped_column(
        SAEnum(LeaveStatus, name="leave_status"),
        default=LeaveStatus.pending,
        nullable=False,
    )

    # Manager review
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id")
    )
    manager_remarks: Mapped[str | None] = mapped_column(String(500))

    # HR final approval
    hr_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    hr_remarks: Mapped[str | None] = mapped_column(String(500))

    # Relationships
    employee: Mapped["Employee"] = relationship(  # noqa: F821
        foreign_keys=[employee_id], back_populates="leave_requests"
    )
    manager: Mapped["Employee | None"] = relationship(  # noqa: F821
        foreign_keys=[manager_id]
    )
