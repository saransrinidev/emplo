from datetime import date

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class PerformanceReview(Base, TimestampMixin):
    __tablename__ = "performance_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    review_period: Mapped[str | None] = mapped_column(String(100))
    review_date: Mapped[date | None] = mapped_column(Date)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    rating: Mapped[float | None] = mapped_column(Numeric(4, 2))
    strengths: Mapped[str | None] = mapped_column(String(2000))
    areas_for_improvement: Mapped[str | None] = mapped_column(String(2000))
    comments: Mapped[str | None] = mapped_column(String(2000))

    employee: Mapped["Employee"] = relationship(  # noqa: F821
        back_populates="performance_reviews", foreign_keys=[employee_id]
    )
    reviewer: Mapped["Employee | None"] = relationship(  # noqa: F821
        foreign_keys=[reviewer_id]
    )
