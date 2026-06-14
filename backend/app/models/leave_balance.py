import uuid

from sqlalchemy import ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class LeaveBalance(Base, UUIDMixin, TimestampMixin):
    """Per-employee per-leave-type per-year balance tracker."""

    __tablename__ = "leave_balances"
    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_leave_balance"),
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    leave_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leave_types.id", ondelete="CASCADE"), nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    allocated: Mapped[float] = mapped_column(Numeric(5, 1), default=0, nullable=False)
    used: Mapped[float] = mapped_column(Numeric(5, 1), default=0, nullable=False)
    pending: Mapped[float] = mapped_column(Numeric(5, 1), default=0, nullable=False)

    leave_type: Mapped["LeaveType"] = relationship()  # noqa: F821
