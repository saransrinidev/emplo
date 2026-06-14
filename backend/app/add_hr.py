"""Add a new HR admin user.

Run: backend\.venv\Scripts\python.exe backend\scripts\add_hr.py
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

# ---- edit these ----
NEW_EMAIL = "newhr@company.com"
NEW_NAME = "New HR"
NEW_PASSWORD = "ChangeMe123"
EMP_CODE = "EMP-0002"
# --------------------


def add_hr() -> None:
    seed_roles()  # make sure roles exist
    db = SessionLocal()
    try:
        hr_role = db.scalar(select(Role).where(Role.name == RoleName.hr_admin))

        if db.scalar(select(User).where(User.email == NEW_EMAIL)):
            print(f"{NEW_EMAIL} already exists. Skipping.")
            return

        emp = Employee(
            employee_code=EMP_CODE,
            full_name=NEW_NAME,
            email=NEW_EMAIL,
            date_of_joining=date.today(),
            department="Human Resources",
            designation="HR Administrator",
            employment_status="Active",
        )
        db.add(emp)
        db.flush()

        user = User(
            email=NEW_EMAIL,
            password_hash=hash_password(NEW_PASSWORD),
            role_id=hr_role.id,
            employee_id=emp.id,
        )
        db.add(user)
        db.commit()
        print(f"HR admin created: {NEW_EMAIL} / {NEW_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    add_hr()
