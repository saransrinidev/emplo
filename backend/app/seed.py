"""Seed the database with the three default roles.

Run with: python -m app.seed
"""

from app.db.session import SessionLocal
from app.models.enums import RoleName
from app.models.role import Role


def seed_roles() -> None:
    db = SessionLocal()
    try:
        existing = {r.name for r in db.query(Role).all()}
        created = []
        for role_name in RoleName:
            if role_name not in existing:
                db.add(Role(name=role_name, description=role_name.value))
                created.append(role_name.value)
        db.commit()
        if created:
            print(f"Created roles: {', '.join(created)}")
        else:
            print("All roles already exist. Nothing to do.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()
