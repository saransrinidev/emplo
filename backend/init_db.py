"""Create all tables in the database, then seed default roles.

Uses SQLAlchemy's create_all (no Alembic needed for first setup).

Usage (from workspace root):
    backend\\.venv\\Scripts\\python.exe backend\\init_db.py
"""
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from app.models import Base
from app.seed import seed_roles


def main() -> None:
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.\n")

    print("Seeding roles...")
    seed_roles()
    print("\nDatabase initialized.")


if __name__ == "__main__":
    main()
