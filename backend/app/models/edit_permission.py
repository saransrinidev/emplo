from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import EditableSection


class EmployeeEditPermission(Base, TimestampMixin):
    """Temporary, time-bounded edit access granted by HR for a specific section."""

    __tablename__ = "employee_edit_permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section: Mapped[EditableSection] = mapped_column(
        SAEnum(EditableSection, name="editable_section"), nullable=False
    )
    granted_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expiry_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    employee: Mapped["Employee"] = relationship(  # noqa: F821
        back_populates="edit_permissions"
    )
