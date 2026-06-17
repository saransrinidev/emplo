from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.api import (
    attendance,
    attendance_records,
    audit,
    auth,
    bank_accounts,
    certifications,
    dashboard,
    departments,
    documents,
    edit_requests,
    employees,
    export,
    holidays,
    leave_management,
    notifications,
    password_reset,
    performance,
    permissions,
    profile,
    profile_changes,
    salary,
    tickets,
    upload,
)
from app.core.middleware import RequestContextMiddleware
from app.core.rate_limit import limiter
from app.db.session import get_db

app = FastAPI(title="Emplo API", version="1.0.0", description="HRMS backend for Emplo")

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Request context middleware (captures IP + User-Agent for audit)
app.add_middleware(RequestContextMiddleware)

# CORS
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
app.include_router(password_reset.router)
app.include_router(attendance.router)
app.include_router(attendance_records.router)
app.include_router(profile.router)
app.include_router(employees.router)
app.include_router(departments.router)
app.include_router(leave_management.router)
app.include_router(holidays.router)
app.include_router(bank_accounts.router)
app.include_router(profile_changes.router)
app.include_router(documents.router)
app.include_router(certifications.router)
app.include_router(salary.router)
app.include_router(performance.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(permissions.router)
app.include_router(edit_requests.router)
app.include_router(audit.router)
app.include_router(tickets.router)
app.include_router(export.router)
app.include_router(upload.router)
