from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import DocumentType, VerificationStatus


class Document(Base, TimestampMixin):
    """Educational / general documents stored in blob storage (S3 or Azure)."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    document_type: Mapped[DocumentType] = mapped_column(
        SAEnum(DocumentType, name="document_type"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(255))
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus, name="document_status"),
        default=VerificationStatus.uploaded,
        nullable=False,
    )
    verified_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    employee: Mapped["Employee"] = relationship(back_populates="documents")  # noqa: F821
