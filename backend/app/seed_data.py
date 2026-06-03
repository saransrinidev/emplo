"""Seed the single HR admin account.

Run: backend\\.venv\\Scripts\\python.exe backend\\seed_demo.py
Login (password: Secret123):
    saransrini@company.com  (hr_admin)
"""
from datetime import date

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.role import Role
from app.models.user import User
from app.seed import seed_roles


def _role(db, name: RoleName) -> Role:
    return db.scalar(select(Role).where(Role.name == name))


def seed_demo() -> None:
    seed_roles()
    db = SessionLocal()
    try:
        hr_role = _role(db, RoleName.hr_admin)

        # Check if already exists
        existing = db.scalar(select(User).where(User.email == "saransrini@company.com"))
        if existing:
            print("HR admin already exists. Skipping.")
            return

        # Create employee record
        emp = Employee(
            employee_code="EMP-0001",
            full_name="Saransrini",
            email="saransrini@company.com",
            date_of_joining=date.today(),
            department="Human Resources",
            designation="HR Administrator",
            employment_status="Active",
        )
        db.add(emp)
        db.flush()

        # Create user login
        user = User(
            email="saransrini@company.com",
            password_hash=hash_password("Secret123"),
            role_id=hr_role.id,
            employee_id=emp.id,
        )
        db.add(user)
        db.commit()

        print("Seed complete.")
        print("Login (password: Secret123):")
        print("  saransrini@company.com  (hr_admin)")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
