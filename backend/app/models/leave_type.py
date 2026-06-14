from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class LeaveType(Base, UUIDMixin, TimestampMixin):
    """Configurable leave type reference table."""

    __tablename__ = "leave_types"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    default_annual_quota: Mapped[float] = mapped_column(Numeric(5, 1), default=0, nullable=False)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    carry_forward: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
