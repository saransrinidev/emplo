from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class AuditLog(Base, TimestampMixin):
    """Tracks who changed what, when, and the approval status of the change."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))  # who
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)  # what table
    entity_id: Mapped[str | None] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # create/update/...
    changes: Mapped[dict | None] = mapped_column(JSONB)  # before/after diff
    approval_status: Mapped[str | None] = mapped_column(String(50))
