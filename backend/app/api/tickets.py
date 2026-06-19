"""Unified ticket/request system.

Employees can create tickets for various request types. HR manages them.
Each ticket has a thread of comments for back-and-forth communication.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.ticket import (
    Ticket,
    TicketComment,
    TicketPriority,
    TicketStatus,
    TicketType,
)
from app.models.user import User

router = APIRouter(prefix="/tickets", tags=["tickets"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CreateTicket(BaseModel):
    ticket_type: TicketType
    subject: str
    description: str | None = None
    priority: TicketPriority = TicketPriority.medium
    metadata: dict | None = None  # extra data per type


class UpdateTicketStatus(BaseModel):
    status: TicketStatus
    resolution_notes: str | None = None


class AddComment(BaseModel):
    message: str
    is_internal: bool = False  # HR-only flag


class CommentOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None = None
    message: str
    is_internal: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TicketOut(BaseModel):
    id: uuid.UUID
    ticket_number: str
    employee_id: uuid.UUID
    employee_name: str | None = None
    ticket_type: TicketType
    priority: TicketPriority
    subject: str
    description: str | None = None
    status: TicketStatus
    metadata: dict | None = None
    assigned_to: uuid.UUID | None = None
    resolved_by: uuid.UUID | None = None
    resolved_at: datetime | None = None
    resolution_notes: str | None = None
    comments: list[CommentOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _generate_ticket_number(db: Session) -> str:
    """Generate a sequential ticket number like TKT-0001."""
    count = db.scalar(select(func.count()).select_from(Ticket)) or 0
    return f"TKT-{count + 1:04d}"


def _get_user_name(db: Session, user_id: uuid.UUID | None) -> str | None:
    if not user_id:
        return None
    user = db.get(User, user_id)
    if user and user.employee_id:
        emp = db.get(Employee, user.employee_id)
        return emp.full_name if emp else user.email
    return user.email if user else None


def _to_out(ticket: Ticket, db: Session, include_comments: bool = False) -> TicketOut:
    emp = db.get(Employee, ticket.employee_id)
    comments = []
    if include_comments:
        stmt = (
            select(TicketComment)
            .where(TicketComment.ticket_id == ticket.id)
            .order_by(TicketComment.created_at.asc())
        )
        for c in db.scalars(stmt).all():
            comments.append(CommentOut(
                id=c.id,
                ticket_id=c.ticket_id,
                user_id=c.user_id,
                user_name=_get_user_name(db, c.user_id),
                message=c.message,
                is_internal=c.is_internal,
                created_at=c.created_at,
            ))

    return TicketOut(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        employee_id=ticket.employee_id,
        employee_name=emp.full_name if emp else None,
        ticket_type=ticket.ticket_type,
        priority=ticket.priority,
        subject=ticket.subject,
        description=ticket.description,
        status=ticket.status,
        metadata=ticket.extra_data,
        assigned_to=ticket.assigned_to,
        resolved_by=ticket.resolved_by,
        resolved_at=ticket.resolved_at,
        resolution_notes=ticket.resolution_notes,
        comments=comments,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


# ─── Employee: Create ticket ─────────────────────────────────────────────────

@router.post("", response_model=TicketOut, status_code=201)
def create_ticket(
    payload: CreateTicket,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TicketOut:
    """Employee/Manager creates a request ticket."""
    if not user.employee_id:
        raise HTTPException(400, "No employee record linked")

    ticket = Ticket(
        ticket_number=_generate_ticket_number(db),
        employee_id=user.employee_id,
        ticket_type=payload.ticket_type,
        priority=payload.priority,
        subject=payload.subject,
        description=payload.description,
        extra_data=payload.metadata,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Notify HR and manager
    from app.api.notify import notify_hr_and_manager
    emp = db.get(Employee, user.employee_id)
    emp_name = emp.full_name if emp else "An employee"
    notify_hr_and_manager(
        db, user,
        title=f"New Ticket: {ticket.ticket_number}",
        message=f"{emp_name} raised a {payload.ticket_type.value} request: {payload.subject}",
    )
    db.commit()

    return _to_out(ticket, db)


# ─── Employee: View my tickets ────────────────────────────────────────────────

@router.get("/my", response_model=list[TicketOut])
def my_tickets(
    status: TicketStatus | None = None,
    ticket_type: TicketType | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TicketOut]:
    if not user.employee_id:
        return []
    stmt = (
        select(Ticket)
        .where(Ticket.employee_id == user.employee_id)
        .order_by(Ticket.created_at.desc())
    )
    if status:
        stmt = stmt.where(Ticket.status == status)
    if ticket_type:
        stmt = stmt.where(Ticket.ticket_type == ticket_type)
    return [_to_out(t, db) for t in db.scalars(stmt).all()]


# ─── Employee: View single ticket with comments ──────────────────────────────

@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TicketOut:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(404, "Ticket not found")
    # Employees can only view their own; Managers can view their team's
    if user.role.name == RoleName.employee and ticket.employee_id != user.employee_id:
        raise HTTPException(403, "Not authorized to view this ticket")
    if user.role.name == RoleName.manager:
        # Check if ticket belongs to a direct report
        emp = db.get(Employee, ticket.employee_id)
        if emp and emp.manager_id != user.employee_id and ticket.employee_id != user.employee_id:
            raise HTTPException(403, "Not authorized to view this ticket")
    # Filter out internal comments for non-HR
    out = _to_out(ticket, db, include_comments=True)
    if user.role.name != RoleName.hr_admin:
        out.comments = [c for c in out.comments if not c.is_internal]
    return out


# ─── Employee/HR: Add comment ─────────────────────────────────────────────────

@router.post("/{ticket_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    ticket_id: uuid.UUID,
    payload: AddComment,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CommentOut:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(404, "Ticket not found")
    if user.role.name == RoleName.employee and ticket.employee_id != user.employee_id:
        raise HTTPException(403, "Not authorized")
    # Only HR can mark comments as internal
    is_internal = payload.is_internal and user.role.name == RoleName.hr_admin

    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=user.id,
        message=payload.message,
        is_internal=is_internal,
    )
    db.add(comment)

    # If ticket is open and HR is commenting, move to in_progress
    if ticket.status == TicketStatus.open and user.role.name == RoleName.hr_admin:
        ticket.status = TicketStatus.in_progress

    db.commit()
    db.refresh(comment)

    # Notify the other party
    if user.role.name == RoleName.hr_admin:
        # Notify employee
        emp_user = db.scalar(select(User).where(User.employee_id == ticket.employee_id))
        if emp_user and not is_internal:
            from app.api.notifications import Notification
            db.add(Notification(
                user_id=emp_user.id,
                title=f"Update on {ticket.ticket_number}",
                message=f"HR responded to your ticket: {ticket.subject}",
            ))
            db.commit()

    return CommentOut(
        id=comment.id,
        ticket_id=comment.ticket_id,
        user_id=comment.user_id,
        user_name=_get_user_name(db, comment.user_id),
        message=comment.message,
        is_internal=comment.is_internal,
        created_at=comment.created_at,
    )


# ─── HR: List all tickets ─────────────────────────────────────────────────────

@router.get("", response_model=list[TicketOut])
def list_all_tickets(
    status: TicketStatus | None = None,
    ticket_type: TicketType | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[TicketOut]:
    stmt = select(Ticket).order_by(Ticket.created_at.desc()).limit(limit).offset(offset)
    if status:
        stmt = stmt.where(Ticket.status == status)
    if ticket_type:
        stmt = stmt.where(Ticket.ticket_type == ticket_type)
    return [_to_out(t, db) for t in db.scalars(stmt).all()]


# ─── HR: Update ticket status ─────────────────────────────────────────────────

@router.put("/{ticket_id}/status", response_model=TicketOut)
def update_ticket_status(
    ticket_id: uuid.UUID,
    payload: UpdateTicketStatus,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> TicketOut:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(404, "Ticket not found")

    ticket.status = payload.status
    if payload.status in (TicketStatus.resolved, TicketStatus.closed):
        ticket.resolved_by = user.id
        ticket.resolved_at = datetime.now(timezone.utc)
        ticket.resolution_notes = payload.resolution_notes
    db.commit()
    db.refresh(ticket)

    # Notify employee of status change
    emp_user = db.scalar(select(User).where(User.employee_id == ticket.employee_id))
    if emp_user:
        from app.api.notifications import Notification
        status_label = payload.status.value.replace("_", " ").title()
        db.add(Notification(
            user_id=emp_user.id,
            title=f"Ticket {ticket.ticket_number} — {status_label}",
            message=payload.resolution_notes or f"Your request has been marked as {status_label}.",
        ))
        db.commit()

    return _to_out(ticket, db)


# ─── HR: Assign ticket ────────────────────────────────────────────────────────

class AssignTicket(BaseModel):
    assigned_to: uuid.UUID


@router.put("/{ticket_id}/assign", response_model=TicketOut)
def assign_ticket(
    ticket_id: uuid.UUID,
    payload: AssignTicket,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> TicketOut:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(404, "Ticket not found")
    ticket.assigned_to = payload.assigned_to
    if ticket.status == TicketStatus.open:
        ticket.status = TicketStatus.in_progress
    db.commit()
    db.refresh(ticket)
    return _to_out(ticket, db)
