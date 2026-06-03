import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.user import User


def can_view_employee(db: Session, user: User, employee_id: uuid.UUID) -> bool:
    """RBAC: employees see only themselves; managers see direct reports; HR sees all."""
    role = user.role.name
    if role == RoleName.hr_admin:
        return True
    if role == RoleName.employee:
        return user.employee_id == employee_id
    if role == RoleName.manager:
        if user.employee_id == employee_id:
            return True
        target = db.get(Employee, employee_id)
        return bool(target and target.manager_id == user.employee_id)
    return False


def require_view_employee(db: Session, user: User, employee_id: uuid.UUID) -> None:
    if not can_view_employee(db, user, employee_id):
        raise HTTPException(status_code=403, detail="Not allowed to view this record")
