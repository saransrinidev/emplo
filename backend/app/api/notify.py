"""Helper to send activity notifications to HR admins and managers."""
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.role import Role
from app.models.user import User


def _get_notification_model():
    """Lazy import to avoid circular dependencies."""
    from app.api.notifications import Notification
    return Notification


def notify_hr_and_manager(
    db: Session,
    actor_user: User,
    title: str,
    message: str,
) -> None:
    """Send a notification to all HR admins and the actor's manager (if any).
    
    Called when an employee or manager does something noteworthy.
    Does NOT notify the actor themselves.
    """
    Notification = _get_notification_model()

    # Find all HR admin users
    hr_role = db.scalar(select(Role).where(Role.name == RoleName.hr_admin))
    if hr_role:
        hr_users = list(db.scalars(
            select(User).where(User.role_id == hr_role.id, User.id != actor_user.id)
        ))
        for hr_user in hr_users:
            db.add(Notification(user_id=hr_user.id, title=title, message=message))

    # If actor has an employee record with a manager, notify the manager too
    if actor_user.employee_id:
        employee = db.get(Employee, actor_user.employee_id)
        if employee and employee.manager_id:
            mgr_user = db.scalar(
                select(User).where(
                    User.employee_id == employee.manager_id,
                    User.id != actor_user.id,
                )
            )
            if mgr_user:
                db.add(Notification(user_id=mgr_user.id, title=title, message=message))


def notify_hr_only(
    db: Session,
    actor_user: User,
    title: str,
    message: str,
) -> None:
    """Send a notification to all HR admins only (when a manager does something).
    Does NOT notify the actor themselves.
    """
    Notification = _get_notification_model()

    hr_role = db.scalar(select(Role).where(Role.name == RoleName.hr_admin))
    if hr_role:
        hr_users = list(db.scalars(
            select(User).where(User.role_id == hr_role.id, User.id != actor_user.id)
        ))
        for hr_user in hr_users:
            db.add(Notification(user_id=hr_user.id, title=title, message=message))
