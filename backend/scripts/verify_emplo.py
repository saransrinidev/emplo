"""Quick check: list tables in the emplo schema."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg
from app.core.config import get_settings

settings = get_settings()
dsn = settings.database_url.replace("postgresql+psycopg://", "postgresql://")
kw = {}
mode = (settings.db_ssl_mode or "").strip().lower()
if mode and mode != "disable":
    kw["sslmode"] = mode

with psycopg.connect(dsn, **kw) as conn, conn.cursor() as cur:
    cur.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'emplo' ORDER BY table_name;"
    )
    rows = [r[0] for r in cur.fetchall()]
    print(f"emplo schema has {len(rows)} tables:")
    for r in rows:
        print(" -", r)
