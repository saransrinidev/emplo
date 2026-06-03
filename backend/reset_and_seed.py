"""Reset all data and seed only the HR admin account.

Run: backend\\.venv\\Scripts\\python.exe backend\\reset_and_seed.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app", ".."))

from sqlalchemy import text
from app.db.session import SessionLocal
from app.seed_data import seed_demo


def reset_all():
    db = SessionLocal()
    try:
        # Delete in order to respect foreign keys
        db.execute(text("DELETE FROM audit_logs"))
        db.execute(text("DELETE FROM employee_edit_permissions"))
        db.execute(text("DELETE FROM performance_reviews"))
        db.execute(text("DELETE FROM salary_revisions"))
        db.execute(text("DELETE FROM certifications"))
        db.execute(text("DELETE FROM documents"))
        db.execute(text("DELETE FROM emergency_contacts"))
        db.execute(text("DELETE FROM employee_addresses"))
        db.execute(text("DELETE FROM users"))
        db.execute(text("DELETE FROM employees"))
        db.commit()
        print("All data cleared.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing data: {e}")
        # Try simpler approach if table names differ
        try:
            db.execute(text("DELETE FROM users"))
            db.execute(text("DELETE FROM employees"))
            db.commit()
            print("Users and employees cleared.")
        except Exception as e2:
            db.rollback()
            print(f"Fallback also failed: {e2}")
    finally:
        db.close()


if __name__ == "__main__":
    print("Resetting all data...")
    reset_all()
    print("\nSeeding HR admin...")
    seed_demo()
