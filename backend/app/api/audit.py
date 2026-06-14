"""Audit log API — read-only access for HR admins."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.user import User

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_id: uuid.UUID | None = None
    actor_name: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    changes: dict | None = None
    before_data: dict | None = None
    after_data: dict | None = None
    approval_status: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    entity_type: str | None = Query(default=None),
    action: str | None = Query(default=None),
    actor_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[AuditLogOut]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if actor_id:
        stmt = stmt.where(AuditLog.actor_id == actor_id)

    rows = list(db.scalars(stmt).all())

    # Build actor name cache to avoid N+1 queries
    actor_ids = {r.actor_id for r in rows if r.actor_id}
    actor_names: dict[uuid.UUID, str] = {}
    if actor_ids:
        users = list(db.scalars(select(User).where(User.id.in_(actor_ids))).all())
        for u in users:
            if u.employee_id:
                emp = db.get(Employee, u.employee_id)
                actor_names[u.id] = emp.full_name if emp else u.email
            else:
                actor_names[u.id] = u.email

    return [
        AuditLogOut(
            id=r.id,
            actor_id=r.actor_id,
            actor_name=actor_names.get(r.actor_id) if r.actor_id else None,
            action=r.action,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            changes=r.changes,
            before_data=r.before_data,
            after_data=r.after_data,
            approval_status=r.approval_status,
            ip_address=r.ip_address,
            user_agent=r.user_agent,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/actions", response_model=list[str])
def list_actions(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[str]:
    """Return distinct action names for filter dropdowns."""
    from sqlalchemy import distinct
    rows = db.scalars(select(distinct(AuditLog.action)).order_by(AuditLog.action)).all()
    return list(rows)


@router.get("/entity-types", response_model=list[str])
def list_entity_types(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[str]:
    """Return distinct entity types for filter dropdowns."""
    from sqlalchemy import distinct
    rows = db.scalars(select(distinct(AuditLog.entity_type)).order_by(AuditLog.entity_type)).all()
    return list(rows)
