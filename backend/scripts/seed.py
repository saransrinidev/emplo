"""Seed the database with the initial HR administrator account.

Optionally pass --reset to wipe all existing data first.

Usage (from workspace root):
    backend\\.venv\\Scripts\\python.exe backend\\scripts\\seed.py
    backend\\.venv\\Scripts\\python.exe backend\\scripts\\seed.py --reset
"""
import os
import sys

# Make the `app` package importable when run as a standalone script.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

from app.db.session import SessionLocal
from app.seed_data import seed_demo

# Tables cleared in FK-safe order (children before parents).
_RESET_TABLES = [
    "audit_logs",
    "employee_edit_permissions",
    "performance_reviews",
    "salary_revisions",
    "certifications",
    "documents",
    "emergency_contacts",
    "employee_addresses",
    "notifications",
    "users",
    "employees",
]


def reset_all() -> None:
    db = SessionLocal()
    try:
        for table in _RESET_TABLES:
            try:
                db.execute(text(f"DELETE FROM {table}"))
            except Exception:
                db.rollback()
        db.commit()
        print("All data cleared.")
    finally:
        db.close()


if __name__ == "__main__":
    if "--reset" in sys.argv:
        print("Resetting all data...")
        reset_all()
    print("Seeding HR admin...")
    seed_demo()
