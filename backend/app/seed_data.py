"""Seed realistic demo data so every page has real records to show.

Creates: roles (via seed_roles), three employees (HR, a manager, an employee)
with linked login users, addresses, emergency contacts, documents,
certifications, salary revisions, and performance reviews.

Run: backend\\.venv\\Scripts\\python.exe backend\\seed_demo.py
Login accounts (all password: Secret123):
    hr@company.com        (hr_admin)
    priya@company.com     (manager)
    alex@company.com      (employee)
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.address import EmergencyContact, EmployeeAddress
from app.models.certification import Certification
from app.models.document import Document
from app.models.employee import Employee
from app.models.enums import (
    AddressType,
    ApprovalStatus,
    CertificationCategory,
    DocumentType,
    RoleName,
    VerificationStatus,
)
from app.models.performance import PerformanceReview
from app.models.role import Role
from app.models.salary import SalaryRevision
from app.models.user import User
from app.seed import seed_roles


def _role(db, name: RoleName) -> Role:
    return db.scalar(select(Role).where(Role.name == name))


def _get_or_create_employee(db, code: str, **kwargs) -> Employee:
    emp = db.scalar(select(Employee).where(Employee.employee_code == code))
    if emp:
        return emp
    emp = Employee(employee_code=code, **kwargs)
    db.add(emp)
    db.flush()
    return emp


def _get_or_create_user(db, email: str, role: Role, employee: Employee) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        user.employee_id = employee.id
        user.role_id = role.id
        return user
    user = User(
        email=email,
        password_hash=hash_password("Secret123"),
        role_id=role.id,
        employee_id=employee.id,
    )
    db.add(user)
    return user


def seed_demo() -> None:
    seed_roles()
    db = SessionLocal()
    try:
        hr_role = _role(db, RoleName.hr_admin)
        mgr_role = _role(db, RoleName.manager)
        emp_role = _role(db, RoleName.employee)

        # --- Manager ---
        priya = _get_or_create_employee(
            db, "EMP-1001", full_name="Priya Nair", email="priya@company.com",
            mobile_number="+1 555 0101", date_of_birth=date(1985, 7, 12),
            gender="Female", marital_status="Married",
            date_of_joining=date(2018, 3, 1), department="Engineering",
            designation="Engineering Manager", employment_status="Active",
            work_location="Austin, TX",
        )

        # --- HR admin ---
        hr = _get_or_create_employee(
            db, "EMP-1000", full_name="Maria Gomez", email="hr@company.com",
            mobile_number="+1 555 0100", date_of_birth=date(1983, 1, 22),
            gender="Female", marital_status="Married",
            date_of_joining=date(2017, 1, 10), department="Human Resources",
            designation="HR Administrator", employment_status="Active",
            work_location="Austin, TX",
        )

        # --- Employee (reports to Priya) ---
        alex = _get_or_create_employee(
            db, "EMP-1042", full_name="Alex Morgan", email="alex@company.com",
            mobile_number="+1 555 0142", date_of_birth=date(1992, 4, 18),
            gender="Female", marital_status="Single",
            date_of_joining=date(2021, 9, 1), department="Engineering",
            designation="Senior Software Engineer", employment_status="Active",
            work_location="Remote",
        )
        db.flush()
        alex.manager_id = priya.id

        _get_or_create_user(db, "hr@company.com", hr_role, hr)
        _get_or_create_user(db, "priya@company.com", mgr_role, priya)
        _get_or_create_user(db, "alex@company.com", emp_role, alex)
        db.flush()

        # Only add child records if Alex has none yet (idempotent-ish).
        if not alex.addresses:
            db.add_all([
                EmployeeAddress(
                    employee_id=alex.id, address_type=AddressType.current,
                    address_line="12 Maple Street", city="Austin", state="TX",
                    postal_code="78701", country="USA",
                ),
                EmployeeAddress(
                    employee_id=alex.id, address_type=AddressType.permanent,
                    address_line="12 Maple Street", city="Austin", state="TX",
                    postal_code="78701", country="USA",
                ),
            ])
        if not alex.emergency_contacts:
            db.add(EmergencyContact(
                employee_id=alex.id, contact_name="Jordan Morgan",
                relationship_to="Sibling", contact_number="+1 555 0199",
            ))
        if not alex.documents:
            db.add_all([
                Document(
                    employee_id=alex.id, document_name="Degree Certificate",
                    document_type=DocumentType.degree,
                    file_url="https://files.example.com/alex/degree.pdf",
                    status=VerificationStatus.verified,
                    verified_at=datetime.now(timezone.utc),
                ),
                Document(
                    employee_id=alex.id, document_name="12th Certificate",
                    document_type=DocumentType.intermediate,
                    file_url="https://files.example.com/alex/12th.pdf",
                    status=VerificationStatus.verified,
                    verified_at=datetime.now(timezone.utc),
                ),
                Document(
                    employee_id=alex.id, document_name="Transcript",
                    document_type=DocumentType.transcript,
                    file_url="https://files.example.com/alex/transcript.pdf",
                    status=VerificationStatus.uploaded,
                ),
            ])
        if not alex.certifications:
            db.add_all([
                Certification(
                    employee_id=alex.id, certificate_name="AWS Solutions Architect",
                    certificate_number="AWS-2023-8841", category=CertificationCategory.aws,
                    issued_date=date(2023, 3, 10), expiry_date=date(2026, 3, 10),
                    verification_status=VerificationStatus.verified,
                ),
                Certification(
                    employee_id=alex.id, certificate_name="Azure Fundamentals",
                    certificate_number="AZ-900-5521", category=CertificationCategory.azure,
                    issued_date=date(2022, 6, 1),
                    expiry_date=date.today() + timedelta(days=45),
                    verification_status=VerificationStatus.verified,
                ),
                Certification(
                    employee_id=alex.id, certificate_name="Professional Scrum Master",
                    certificate_number="PSM-7723", category=CertificationCategory.scrum,
                    issued_date=date(2024, 2, 20), expiry_date=None,
                    verification_status=VerificationStatus.uploaded,
                ),
            ])
        if not alex.salary_revisions:
            db.add_all([
                SalaryRevision(
                    employee_id=alex.id, effective_date=date(2021, 9, 1),
                    previous_salary=Decimal("0"), revised_salary=Decimal("98000"),
                    revision_percentage=Decimal("0"), comments="Joining",
                    approval_status=ApprovalStatus.approved,
                ),
                SalaryRevision(
                    employee_id=alex.id, effective_date=date(2023, 4, 1),
                    previous_salary=Decimal("98000"), revised_salary=Decimal("110000"),
                    revision_percentage=Decimal("12.2"), comments="Annual revision",
                    approval_status=ApprovalStatus.approved,
                ),
                SalaryRevision(
                    employee_id=alex.id, effective_date=date(2024, 4, 1),
                    previous_salary=Decimal("110000"), revised_salary=Decimal("124000"),
                    revision_percentage=Decimal("12.7"), comments="Annual revision",
                    approval_status=ApprovalStatus.approved,
                ),
            ])
        if not alex.performance_reviews:
            db.add_all([
                PerformanceReview(
                    employee_id=alex.id, review_period="FY2023",
                    review_date=date(2023, 3, 12), reviewer_id=priya.id,
                    rating=Decimal("4.2"), strengths="Delivery speed",
                    areas_for_improvement="Documentation", comments="Strong year.",
                ),
                PerformanceReview(
                    employee_id=alex.id, review_period="FY2024",
                    review_date=date(2024, 3, 15), reviewer_id=priya.id,
                    rating=Decimal("4.5"), strengths="Ownership, mentoring",
                    areas_for_improvement="Delegation", comments="Promotion track.",
                ),
            ])

        db.commit()
        print("Demo data seeded.")
        print("Logins (password: Secret123):")
        print("  hr@company.com     (hr_admin)")
        print("  priya@company.com  (manager)")
        print("  alex@company.com   (employee)")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
