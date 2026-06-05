import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.edit_permission import EmployeeEditPermission
from app.models.enums import EditableSection, RoleName
from app.models.user import User

router = APIRouter(prefix="/permissions", tags=["permissions"])


class GrantRequest(BaseModel):
    employee_id: uuid.UUID
    section: EditableSection
    start_at: datetime
    expiry_at: datetime


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    employee_id: uuid.UUID
    section: EditableSection
    start_at: datetime
    expiry_at: datetime
    is_revoked: bool
    is_active: bool


def _is_active(p: EmployeeEditPermission) -> bool:
    now = datetime.now(timezone.utc)
    return not p.is_revoked and p.start_at <= now <= p.expiry_at


@router.post("", response_model=PermissionOut, status_code=201)
def grant_permission(
    payload: GrantRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> PermissionOut:
    if payload.expiry_at <= payload.start_at:
        raise HTTPException(status_code=400, detail="expiry_at must be after start_at")
    perm = EmployeeEditPermission(
        employee_id=payload.employee_id,
        section=payload.section,
        granted_by=user.id,
        start_at=payload.start_at,
        expiry_at=payload.expiry_at,
    )
    db.add(perm)
    db.flush()

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action="grant_permission", entity_type="permission",
               entity_id=str(perm.id), changes={"employee_id": str(payload.employee_id), "section": payload.section.value})

    db.commit()
    db.refresh(perm)

    # Notify the employee that they have temporary edit access
    emp_user = db.scalar(select(User).where(User.employee_id == payload.employee_id))
    if emp_user:
        from app.api.notifications import Notification
        db.add(Notification(
            user_id=emp_user.id,
            title="Temporary Edit Access Granted",
            message=f"You can now edit your {payload.section.value} until {payload.expiry_at.strftime('%b %d, %Y %H:%M')}.",
        ))
        db.commit()

    return PermissionOut(**{k: getattr(perm, k) for k in PermissionOut.model_fields if k != "is_active"}, is_active=_is_active(perm))


@router.get("", response_model=list[PermissionOut])
def list_permissions(
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PermissionOut]:
    stmt = select(EmployeeEditPermission)
    if user.role.name == RoleName.employee:
        stmt = stmt.where(EmployeeEditPermission.employee_id == user.employee_id)
    elif employee_id:
        stmt = stmt.where(EmployeeEditPermission.employee_id == employee_id)
    rows = db.scalars(stmt.order_by(EmployeeEditPermission.expiry_at.desc())).all()
    return [
        PermissionOut(**{k: getattr(r, k) for k in PermissionOut.model_fields if k != "is_active"}, is_active=_is_active(r))
        for r in rows
    ]


@router.delete("/{perm_id}", status_code=204)
def revoke_permission(
    perm_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> None:
    perm = db.get(EmployeeEditPermission, perm_id)
    if perm is None:
        raise HTTPException(status_code=404, detail="Permission not found")
    perm.is_revoked = True

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action="revoke_permission", entity_type="permission",
               entity_id=str(perm.id), changes={"employee_id": str(perm.employee_id), "section": perm.section.value})

    db.commit()
