from datetime import date

from sqlalchemy import Date, Enum as SAEnum
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ApprovalStatus


class SalaryRevision(Base, TimestampMixin):
    """Full salary history. 'Current salary' is derived from the latest approved row."""

    __tablename__ = "salary_revisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    previous_salary: Mapped[float | None] = mapped_column(Numeric(14, 2))
    revised_salary: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    revision_percentage: Mapped[float | None] = mapped_column(Numeric(6, 2))
    comments: Mapped[str | None] = mapped_column(String(1000))
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        SAEnum(ApprovalStatus, name="salary_approval_status"),
        default=ApprovalStatus.pending,
        nullable=False,
    )
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    employee: Mapped["Employee"] = relationship(  # noqa: F821
        back_populates="salary_revisions"
    )
