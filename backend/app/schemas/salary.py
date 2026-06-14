import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import ApprovalStatus


class SalaryRevisionCreate(BaseModel):
    employee_id: uuid.UUID
    effective_date: date
    previous_salary: Decimal | None = None
    revised_salary: Decimal
    revision_percentage: Decimal | None = None
    comments: str | None = None


class SalaryRevisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    effective_date: date
    previous_salary: Decimal | None = None
    revised_salary: Decimal
    revision_percentage: Decimal | None = None
    comments: str | None = None
    approval_status: ApprovalStatus


class CurrentSalaryOut(BaseModel):
    """Derived current salary = latest approved revision."""

    current_salary: Decimal | None = None
    latest_revision_date: date | None = None
