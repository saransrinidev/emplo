import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class Employee(Base, UUIDMixin, TimestampMixin):
    """The HR record for a person. May exist before a login (User) is created."""

    __tablename__ = "employees"

    employee_code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )

    # Personal information
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    mobile_number: Mapped[str | None] = mapped_column(String(20))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    marital_status: Mapped[str | None] = mapped_column(String(20))

    # Employment information
    date_of_joining: Mapped[date | None] = mapped_column(Date)
    department: Mapped[str | None] = mapped_column(String(100))
    designation: Mapped[str | None] = mapped_column(String(100))
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id")
    )
    employment_status: Mapped[str | None] = mapped_column(String(50))
    work_location: Mapped[str | None] = mapped_column(String(100))

    # Relationships
    manager: Mapped["Employee | None"] = relationship(
        remote_side="Employee.id", back_populates="direct_reports"
    )
    direct_reports: Mapped[list["Employee"]] = relationship(back_populates="manager")
    user: Mapped["User | None"] = relationship(back_populates="employee")  # noqa: F821
    addresses: Mapped[list["EmployeeAddress"]] = relationship(  # noqa: F821
        back_populates="employee", cascade="all, delete-orphan"
    )
    emergency_contacts: Mapped[list["EmergencyContact"]] = relationship(  # noqa: F821
        back_populates="employee", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(  # noqa: F821
        back_populates="employee", cascade="all, delete-orphan"
    )
    certifications: Mapped[list["Certification"]] = relationship(  # noqa: F821
        back_populates="employee", cascade="all, delete-orphan"
    )
    salary_revisions: Mapped[list["SalaryRevision"]] = relationship(  # noqa: F821
        back_populates="employee", cascade="all, delete-orphan"
    )
    performance_reviews: Mapped[list["PerformanceReview"]] = relationship(  # noqa: F821
        back_populates="employee",
        foreign_keys="PerformanceReview.employee_id",
        cascade="all, delete-orphan",
    )
    edit_permissions: Mapped[list["EmployeeEditPermission"]] = relationship(  # noqa: F821
        back_populates="employee", cascade="all, delete-orphan"
    )
    leave_requests: Mapped[list["LeaveRequest"]] = relationship(  # noqa: F821
        back_populates="employee",
        foreign_keys="LeaveRequest.employee_id",
        cascade="all, delete-orphan",
    )
