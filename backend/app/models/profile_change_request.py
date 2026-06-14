import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import EditableSection

import enum


class ChangeStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ProfileChangeRequest(Base, UUIDMixin, TimestampMixin):
    """Employee-submitted profile change pending HR approval."""

    __tablename__ = "profile_change_requests"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"),
        index=True, nullable=False
    )
    section: Mapped[EditableSection] = mapped_column(
        SAEnum(EditableSection, name="editable_section", create_type=False), nullable=False
    )
    proposed_changes: Mapped[dict] = mapped_column(JSONB, nullable=False)
    previous_values: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[ChangeStatus] = mapped_column(
        SAEnum(ChangeStatus, name="change_status"), default=ChangeStatus.pending, nullable=False
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    review_remarks: Mapped[str | None] = mapped_column(String(500))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
