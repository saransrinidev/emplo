"""Private messaging API.

Access rules:
- Employees can message: their reporting manager, peers (same manager), HR
- Managers can message: their direct reports, their manager, HR
- HR can message anyone
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_, select, and_, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.message import Message
from app.models.user import User

router = APIRouter(prefix="/messages", tags=["messages"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SendMessage(BaseModel):
    receiver_id: uuid.UUID
    content: str


class MessageOut(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str | None = None
    receiver_id: uuid.UUID
    receiver_name: str | None = None
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationPreview(BaseModel):
    employee_id: uuid.UUID
    employee_name: str
    employee_photo: str | None = None
    last_message: str
    last_message_time: datetime
    unread_count: int
    is_sender: bool


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _can_message(db: Session, user: User, sender_emp_id: uuid.UUID, receiver_emp_id: uuid.UUID) -> bool:
    """Check if sender is allowed to message receiver."""
    # HR can message anyone
    if user.role.name == RoleName.hr_admin:
        return True

    sender = db.get(Employee, sender_emp_id)
    receiver = db.get(Employee, receiver_emp_id)
    if not sender or not receiver:
        return False

    # Can message own manager
    if sender.manager_id == receiver_emp_id:
        return True

    # Can message direct reports (if manager)
    if receiver.manager_id == sender_emp_id:
        return True

    # Can message peers (same manager)
    if sender.manager_id and sender.manager_id == receiver.manager_id:
        return True

    # Can message HR
    hr_user = db.scalar(select(User).where(User.employee_id == receiver_emp_id))
    if hr_user and hr_user.role.name == RoleName.hr_admin:
        return True

    return False


def _get_name(db: Session, emp_id: uuid.UUID) -> str | None:
    emp = db.get(Employee, emp_id)
    return emp.full_name if emp else None


# ─── Send message ─────────────────────────────────────────────────────────────

@router.post("", response_model=MessageOut, status_code=201)
def send_message(
    payload: SendMessage,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageOut:
    if not user.employee_id:
        raise HTTPException(400, "No employee record linked")
    if user.employee_id == payload.receiver_id:
        raise HTTPException(400, "Cannot message yourself")
    if not payload.content.strip():
        raise HTTPException(400, "Message cannot be empty")

    # Check receiver exists
    receiver = db.get(Employee, payload.receiver_id)
    if not receiver:
        raise HTTPException(404, "Receiver not found")

    # Check permission
    if not _can_message(db, user, user.employee_id, payload.receiver_id):
        raise HTTPException(403, "You cannot message this person")

    msg = Message(
        sender_id=user.employee_id,
        receiver_id=payload.receiver_id,
        content=payload.content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_name=_get_name(db, msg.sender_id),
        receiver_id=msg.receiver_id,
        receiver_name=_get_name(db, msg.receiver_id),
        content=msg.content,
        is_read=msg.is_read,
        created_at=msg.created_at,
    )


# ─── Get conversations list ───────────────────────────────────────────────────

@router.get("/conversations", response_model=list[ConversationPreview])
def list_conversations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ConversationPreview]:
    """List all people the user has messaged or been messaged by."""
    if not user.employee_id:
        return []

    emp_id = user.employee_id
    # Get all messages involving this user
    msgs = list(db.scalars(
        select(Message)
        .where(or_(Message.sender_id == emp_id, Message.receiver_id == emp_id))
        .order_by(Message.created_at.desc())
    ).all())

    # Group by other party
    conversations: dict[uuid.UUID, ConversationPreview] = {}
    for msg in msgs:
        other_id = msg.receiver_id if msg.sender_id == emp_id else msg.sender_id
        if other_id not in conversations:
            other_emp = db.get(Employee, other_id)
            conversations[other_id] = ConversationPreview(
                employee_id=other_id,
                employee_name=other_emp.full_name if other_emp else "Unknown",
                employee_photo=other_emp.profile_photo if other_emp else None,
                last_message=msg.content[:80],
                last_message_time=msg.created_at,
                unread_count=0,
                is_sender=(msg.sender_id == emp_id),
            )
        # Count unread (messages TO me that are unread)
        if msg.receiver_id == emp_id and not msg.is_read:
            conversations[other_id].unread_count += 1

    return sorted(conversations.values(), key=lambda c: c.last_message_time, reverse=True)


# ─── Get messages with a specific person ──────────────────────────────────────

@router.get("/with/{employee_id}", response_model=list[MessageOut])
def get_conversation(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MessageOut]:
    if not user.employee_id:
        return []

    emp_id = user.employee_id
    msgs = list(db.scalars(
        select(Message)
        .where(
            or_(
                and_(Message.sender_id == emp_id, Message.receiver_id == employee_id),
                and_(Message.sender_id == employee_id, Message.receiver_id == emp_id),
            )
        )
        .order_by(Message.created_at.asc())
    ).all())

    # Mark received messages as read (batch update instead of loop)
    unread_ids = [msg.id for msg in msgs if msg.receiver_id == emp_id and not msg.is_read]
    if unread_ids:
        from sqlalchemy import update
        db.execute(
            update(Message)
            .where(Message.id.in_(unread_ids))
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        db.commit()

    # Cache names (only 2 people in a conversation)
    name_cache: dict[uuid.UUID, str | None] = {}
    for uid in (emp_id, employee_id):
        e = db.get(Employee, uid)
        name_cache[uid] = e.full_name if e else None

    return [
        MessageOut(
            id=m.id, sender_id=m.sender_id, sender_name=name_cache.get(m.sender_id),
            receiver_id=m.receiver_id, receiver_name=name_cache.get(m.receiver_id),
            content=m.content, is_read=m.is_read or m.id in unread_ids, created_at=m.created_at,
        )
        for m in msgs
    ]


# ─── Get contacts (people you can message) ────────────────────────────────────

@router.get("/contacts", response_model=list[dict])
def get_contacts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    """List people the current user is allowed to message."""
    if not user.employee_id:
        return []

    emp = db.get(Employee, user.employee_id)
    if not emp:
        return []

    # HR can message anyone — show all employees
    if user.role.name == RoleName.hr_admin:
        all_emps = list(db.scalars(select(Employee).where(Employee.id != user.employee_id).order_by(Employee.full_name)).all())
        return [{"id": str(e.id), "name": e.full_name, "role": e.designation or "Employee", "photo": e.profile_photo} for e in all_emps]

    contacts: list[dict] = []

    # Own manager
    if emp.manager_id:
        mgr = db.get(Employee, emp.manager_id)
        if mgr:
            contacts.append({"id": str(mgr.id), "name": mgr.full_name, "role": "Manager", "photo": mgr.profile_photo})

    # Direct reports
    reports = list(db.scalars(select(Employee).where(Employee.manager_id == user.employee_id)).all())
    for r in reports:
        contacts.append({"id": str(r.id), "name": r.full_name, "role": "Report", "photo": r.profile_photo})

    # Peers (same manager)
    if emp.manager_id:
        peers = list(db.scalars(
            select(Employee).where(Employee.manager_id == emp.manager_id, Employee.id != user.employee_id)
        ).all())
        for p in peers:
            contacts.append({"id": str(p.id), "name": p.full_name, "role": "Peer", "photo": p.profile_photo})

    # HR admins
    from app.models.role import Role
    hr_role = db.scalar(select(Role).where(Role.name == RoleName.hr_admin))
    if hr_role:
        hr_users = list(db.scalars(select(User).where(User.role_id == hr_role.id, User.employee_id != None, User.employee_id != user.employee_id)).all())
        for hu in hr_users:
            hr_emp = db.get(Employee, hu.employee_id)
            if hr_emp and not any(c["id"] == str(hr_emp.id) for c in contacts):
                contacts.append({"id": str(hr_emp.id), "name": hr_emp.full_name, "role": "HR", "photo": hr_emp.profile_photo})

    return contacts


# ─── Unread count ─────────────────────────────────────────────────────────────

@router.get("/unread-count")
def unread_message_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not user.employee_id:
        return {"count": 0}
    count = db.scalar(
        select(func.count()).select_from(Message)
        .where(Message.receiver_id == user.employee_id, Message.is_read == False)
    ) or 0
    return {"count": count}
