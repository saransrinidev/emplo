import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

# Inline lightweight notification model (the table already exists)
from app.db.base import Base, TimestampMixin, UUIDMixin
from sqlalchemy import Boolean, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

router = APIRouter(prefix="/notifications", tags=["notifications"])


# --- Model (defined here to avoid circular imports since it's simple) ---
class Notification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notifications"
    __table_args__ = {"extend_existing": True}

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        index=True, nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


# --- Schema ---
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    message: str
    is_read: bool
    created_at: str


# --- Endpoints ---
@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[NotificationOut]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    rows = db.scalars(stmt).all()
    return [
        NotificationOut(
            id=n.id, title=n.title, message=n.message,
            is_read=n.is_read, created_at=str(n.created_at),
        )
        for n in rows
    ]


@router.post("/read-all", status_code=204)
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    db.commit()


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    count = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
    ) or 0
    return {"count": count}
