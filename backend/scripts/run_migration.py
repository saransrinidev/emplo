"""Apply a raw SQL migration file to the configured database.

Usage (from workspace root):
    backend\\.venv\\Scripts\\python.exe backend\\scripts\\run_migration.py backend\\migrations\\0001_emplo_hrms_schema.sql

Reads DATABASE_URL from backend/.env via the app settings. Does NOT drop
anything; the target script builds an isolated "emplo" schema.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg
from app.core.config import get_settings


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: run_migration.py <path-to-sql-file>")
        sys.exit(1)

    sql_path = sys.argv[1]
    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    settings = get_settings()
    # psycopg wants a plain libpq URL (strip the SQLAlchemy "+psycopg" driver tag).
    dsn = settings.database_url.replace("postgresql+psycopg://", "postgresql://")

    connect_kwargs = {}
    mode = (settings.db_ssl_mode or "").strip().lower()
    if mode and mode != "disable":
        connect_kwargs["sslmode"] = mode

    print(f"Applying {sql_path} ...")
    with psycopg.connect(dsn, **connect_kwargs) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    print("Migration applied successfully.")


if __name__ == "__main__":
    main()
