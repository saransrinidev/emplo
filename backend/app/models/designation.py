import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class Designation(Base, UUIDMixin, TimestampMixin):
    """Normalized designation/title reference table."""

    __tablename__ = "designations"
    __table_args__ = (UniqueConstraint("title", "department_id", name="uq_designation_title_dept"),)

    title: Mapped[str] = mapped_column(String(150), nullable=False)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL")
    )
    level: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    department: Mapped["Department | None"] = relationship(  # noqa: F821
        back_populates="designations"
    )
