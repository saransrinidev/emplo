import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import DocumentType, VerificationStatus


class Document(Base, UUIDMixin, TimestampMixin):
    """Educational / general documents stored in blob storage."""

    __tablename__ = "documents"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    document_name: Mapped[str | None] = mapped_column(String(255))
    document_type: Mapped[DocumentType] = mapped_column(
        SAEnum(DocumentType, name="document_type"), nullable=False
    )
    file_url: Mapped[str] = mapped_column(String, nullable=False)  # TEXT for base64 data URLs
    status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus, name="document_status"),
        default=VerificationStatus.uploaded,
        nullable=False,
    )
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    employee: Mapped["Employee"] = relationship(back_populates="documents")  # noqa: F821
