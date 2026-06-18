"""SQLAlchemy ORM models.

Importing every model here registers them on Base.metadata so that
create_all / Alembic can see the full schema.
"""

from app.db.base import Base
from app.models.address import EmergencyContact, EmployeeAddress
from app.models.attendance_record import AttendanceRecord
from app.models.audit_log import AuditLog
from app.models.bank_account import EmployeeBankAccount
from app.models.certification import Certification
from app.models.department import Department
from app.models.designation import Designation
from app.models.document import Document
from app.models.edit_permission import EmployeeEditPermission
from app.models.edit_request import EditAccessRequest
from app.models.employee import Employee
from app.models.holiday import Holiday, HolidayCalendar
from app.models.leave_balance import LeaveBalance
from app.models.leave_request import LeaveRequest
from app.models.leave_type import LeaveType
from app.models.message import Message
from app.models.password_reset import PasswordResetToken
from app.models.performance import PerformanceReview
from app.models.profile_change_request import ProfileChangeRequest
from app.models.role import Role
from app.models.salary import SalaryRevision
from app.models.task import Task
from app.models.ticket import Ticket, TicketComment
from app.models.user import User

__all__ = [
    "Base",
    "Role",
    "User",
    "Employee",
    "EmployeeAddress",
    "EmergencyContact",
    "AttendanceRecord",
    "Department",
    "Designation",
    "Document",
    "Certification",
    "SalaryRevision",
    "PerformanceReview",
    "EmployeeEditPermission",
    "EditAccessRequest",
    "AuditLog",
    "LeaveRequest",
    "LeaveType",
    "LeaveBalance",
    "Holiday",
    "HolidayCalendar",
    "EmployeeBankAccount",
    "ProfileChangeRequest",
    "PasswordResetToken",
    "Message",
    "Task",
    "Ticket",
    "TicketComment",
]
