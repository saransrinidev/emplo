"""Edit access request: employee asks HR to unlock a section of their profile."""
import uuid
from datetime import datetime
import enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import EditableSection


class EditRequestStatus(str, enum.Enum):
    pending = "pending"                # employee submitted, waiting HR
    approved = "approved"              # HR approved, edit window open
    changes_submitted = "changes_submitted"  # employee submitted changes, waiting HR confirm
    confirmed = "confirmed"            # HR confirmed changes — data kept
    rejected = "rejected"              # HR rejected the request or the changes
    expired = "expired"                # edit window expired before employee submitted


class EditAccessRequest(Base, UUIDMixin, TimestampMixin):
    """Employee requests edit access to a profile section.

    Flow:
    1. Employee creates request (status=pending)
    2. HR approves with a time limit (status=approved, window_hours set, edit window opens)
    3. Employee edits their data and hits "submit changes" (status=changes_submitted, submitted_data captured)
    4. HR reviews submitted_data and confirms or rejects (status=confirmed/rejected)
    """

    __tablename__ = "edit_access_requests"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"),
        index=True, nullable=False
    )
    section: Mapped[EditableSection] = mapped_column(
        SAEnum(EditableSection, name="editable_section", create_type=False), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(Text)
    status: Mapped[EditRequestStatus] = mapped_column(
        SAEnum(EditRequestStatus, name="edit_request_status"),
        default=EditRequestStatus.pending, nullable=False
    )

    # HR approval
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    window_hours: Mapped[int | None] = mapped_column(Integer)  # 24, 48, 72 etc.
    window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    window_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hr_remarks: Mapped[str | None] = mapped_column(String(500))

    # Employee's submitted data
    previous_data: Mapped[dict | None] = mapped_column(JSONB)
    submitted_data: Mapped[dict | None] = mapped_column(JSONB)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # HR final confirmation
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirm_remarks: Mapped[str | None] = mapped_column(String(500))
