from decimal import Decimal

from pydantic import BaseModel


class EmployeeDashboardOut(BaseModel):
    # Profile summary
    designation: str | None = None
    date_of_joining: str | None = None
    manager_name: str | None = None
    current_salary: Decimal | None = None
    latest_rating: str | None = None
    # Certifications
    certification_count: int = 0
    expiring_soon: int = 0


class ManagerDashboardOut(BaseModel):
    team_members: int = 0
    avg_team_rating: str | None = None
    cert_expiry_alerts: int = 0
    missing_documents: int = 0
    upcoming_anniversaries: int = 0


class HrDashboardOut(BaseModel):
    total_employees: int = 0
    active_employees: int = 0
    new_joiners: int = 0
    employees_missing_documents: int = 0
    expired_certifications: int = 0
    pending_verifications: int = 0
    certs_expiring_30: int = 0
    certs_expiring_60: int = 0
    certs_expiring_90: int = 0
    recent_salary_revisions: int = 0
