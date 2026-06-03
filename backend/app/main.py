from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.api import (
    audit,
    auth,
    certifications,
    dashboard,
    documents,
    employees,
    notifications,
    performance,
    permissions,
    profile,
    salary,
    upload,
)
from app.db.session import get_db

app = FastAPI(title="Employee & HR Portal API", version="0.1.0")

# Allow the Vite dev server to call the API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

health_router = APIRouter(tags=["health"])


@health_router.get("/health")
def health() -> dict:
    """Liveness check. Does not touch the database."""
    return {"status": "ok"}


@health_router.get("/health/db")
def health_db(db: Session = Depends(get_db)) -> dict:
    """Readiness check. Confirms the database is reachable and lists tables."""
    db.execute(text("SELECT 1"))
    tables = sorted(inspect(db.get_bind()).get_table_names())
    return {"status": "ok", "connected": True, "tables": tables}


app.include_router(health_router)
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(employees.router)
app.include_router(documents.router)
app.include_router(certifications.router)
app.include_router(salary.router)
app.include_router(performance.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(permissions.router)
app.include_router(audit.router)
app.include_router(upload.router)
