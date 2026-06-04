"""SQLAlchemy ORM models.

Importing every model here registers them on Base.metadata so that
create_all / Alembic can see the full schema.
"""

from app.db.base import Base
from app.models.address import EmergencyContact, EmployeeAddress
from app.models.certification import Certification
from app.models.document import Document
from app.models.edit_permission import EmployeeEditPermission
from app.models.employee import Employee
from app.models.performance import PerformanceReview
from app.models.role import Role
from app.models.salary import SalaryRevision
from app.models.user import User
from app.models.audit_log import AuditLog

__all__ = [
    "Base",
    "Role",
    "User",
    "Employee",
    "EmployeeAddress",
    "EmergencyContact",
    "Document",
    "Certification",
    "SalaryRevision",
    "PerformanceReview",
    "EmployeeEditPermission",
    "AuditLog",
]
