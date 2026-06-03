from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session
import uuid

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import RoleName
from app.models.work_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    actor_id: uuid.UUID | None
    action: str
    entity_type: str
    entity_id: str | None
    changes: dict | None
    approval_status: str | None
    created_at: str


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    entity_type: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[AuditLogOut]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    rows = db.scalars(stmt).all()
    return [
        AuditLogOut(
            id=r.id, actor_id=r.actor_id, action=r.action,
            entity_type=r.entity_type, entity_id=r.entity_id,
            changes=r.changes, approval_status=r.approval_status,
            created_at=str(r.created_at),
        )
        for r in rows
    ]
