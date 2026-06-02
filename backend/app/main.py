from fastapi import APIRouter, Depends, FastAPI
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.db.session import get_db

app = FastAPI(title="Employee & HR Portal API", version="0.1.0")

router = APIRouter()


@router.get("/health")
def health() -> dict:
    """Liveness check. Does not touch the database."""
    return {"status": "ok"}


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)) -> dict:
    """Readiness check. Confirms the database is reachable and lists tables."""
    db.execute(text("SELECT 1"))
    tables = sorted(inspect(db.get_bind()).get_table_names())
    return {"status": "ok", "connected": True, "tables": tables}


app.include_router(router)
