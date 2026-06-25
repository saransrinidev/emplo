"""Salary structure — component-level breakdown per employee.

Stores individual earnings, deductions, and employer contributions
as a JSONB column for flexibility (components can vary per company).
"""
import uuid
from datetime import date as date_type

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class SalaryStructure(Base, UUIDMixin, TimestampMixin):
    """Current salary structure for an employee — component-level breakdown."""

    __tablename__ = "salary_structures"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"),
        unique=True, index=True, nullable=False
    )
    effective_date: Mapped[date_type] = mapped_column(Date, nullable=False)

    # Component breakdown stored as JSONB for flexibility
    # Format: {"basic": 30000, "hra": 12000, "da": 5000, ...}
    earnings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    deductions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    employer_contributions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Calculated totals (stored for fast queries)
    gross_salary: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    total_deductions: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    net_salary: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    employer_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    monthly_ctc: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    annual_ctc: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    # Reference to the revision that created this structure
    revision_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("salary_revisions.id", ondelete="SET NULL")
    )
