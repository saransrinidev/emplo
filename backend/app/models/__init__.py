"""SQLAlchemy ORM models.

Importing every model here ensures they are all registered on Base.metadata,
which Alembic's autogenerate relies on.
"""

from app.db.base import Base
from app.models.address import EmployeeAddress
from app.models.audit import AuditLog
from app.models.certification import Certification
from app.models.document import Document
from app.models.edit_permission import EmployeeEditPermission
from app.models.employee import Employee
from app.models.notification import Notification
from app.models.performance import PerformanceReview
from app.models.role import Role
from app.models.salary import SalaryRevision
from app.models.user import User

__all__ = [
    "Base",
    "Role",
    "User",
    "Employee",
    "EmployeeAddress",
    "Document",
    "Certification",
    "SalaryRevision",
    "PerformanceReview",
    "EmployeeEditPermission",
    "AuditLog",
    "Notification",
]
