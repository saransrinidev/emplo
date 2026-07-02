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


# --- Send alert/notification to a user (HR only) ---
from app.api.deps import require_roles
from app.models.enums import RoleName
from app.models.employee import Employee


class SendAlertRequest(BaseModel):
    employee_id: str
    title: str
    message: str
    notify_manager: bool = False


class SendAlertResponse(BaseModel):
    sent_to: list[str]


@router.post("/send-alert", response_model=SendAlertResponse, status_code=201)
def send_alert(
    payload: SendAlertRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> SendAlertResponse:
    """Send a notification to an employee and optionally their manager."""
    emp_id = uuid.UUID(payload.employee_id)
    employee = db.get(Employee, emp_id)
    if employee is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Employee not found")

    sent_to: list[str] = []

    # Send to the employee's user account
    emp_user = db.scalar(select(User).where(User.employee_id == emp_id))
    if emp_user:
        notif = Notification(
            user_id=emp_user.id,
            title=payload.title,
            message=payload.message,
        )
        db.add(notif)
        sent_to.append(employee.email)

    # Send to the employee's manager if requested
    if payload.notify_manager and employee.manager_id:
        mgr_user = db.scalar(select(User).where(User.employee_id == employee.manager_id))
        if mgr_user:
            mgr_notif = Notification(
                user_id=mgr_user.id,
                title=payload.title,
                message=f"[Re: {employee.full_name}] {payload.message}",
            )
            db.add(mgr_notif)
            manager = db.get(Employee, employee.manager_id)
            if manager:
                sent_to.append(manager.email)

    db.commit()
    return SendAlertResponse(sent_to=sent_to)


# --- Mark single notification as read ---

@router.put("/{notification_id}/read", status_code=204)
def mark_one_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    notif = db.get(Notification, notification_id)
    if notif is None or notif.user_id != user.id:
        return None
    notif.is_read = True
    db.commit()


# --- Delete a single notification ---

@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    notif = db.get(Notification, notification_id)
    if notif is None or notif.user_id != user.id:
        return None
    db.delete(notif)
    db.commit()


# --- Clear all notifications ---

@router.delete("", status_code=204)
def clear_all_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Delete all notifications for the current user."""
    from sqlalchemy import delete as sql_delete
    db.execute(
        sql_delete(Notification).where(Notification.user_id == user.id)
    )
    db.commit()
