"""Salary Structure API — component-level salary breakdown.

Provides endpoints to view and update the salary structure with
auto-calculation of totals.
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.api.helpers import require_view_employee
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.salary_structure import SalaryStructure
from app.models.user import User

router = APIRouter(prefix="/salary-structure", tags=["salary-structure"])


# ─── Default Components ───────────────────────────────────────────────────────

DEFAULT_EARNINGS = {
    "basic_pay": 0,
    "hra": 0,
    "dearness_allowance": 0,
    "special_allowance": 0,
    "conveyance_allowance": 0,
    "medical_allowance": 0,
    "internet_allowance": 0,
    "telephone_allowance": 0,
    "food_allowance": 0,
    "shift_allowance": 0,
    "performance_bonus": 0,
    "incentives": 0,
    "overtime": 0,
    "other_allowances": 0,
}

DEFAULT_DEDUCTIONS = {
    "employee_pf": 0,
    "employee_esi": 0,
    "professional_tax": 0,
    "income_tax_tds": 0,
    "labour_welfare_fund": 0,
    "nps_employee": 0,
    "insurance_deduction": 0,
    "loan_recovery": 0,
    "advance_recovery": 0,
    "other_deductions": 0,
}

DEFAULT_EMPLOYER_CONTRIBUTIONS = {
    "employer_pf": 0,
    "employer_esi": 0,
    "gratuity": 0,
    "employer_insurance": 0,
    "employer_nps": 0,
}


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SalaryStructureIn(BaseModel):
    earnings: dict = {}
    deductions: dict = {}
    employer_contributions: dict = {}
    effective_date: str | None = None  # YYYY-MM-DD


class SalaryStructureOut(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    effective_date: str
    earnings: dict
    deductions: dict
    employer_contributions: dict
    gross_salary: float
    total_deductions: float
    net_salary: float
    employer_cost: float
    monthly_ctc: float
    annual_ctc: float

    class Config:
        from_attributes = True


class SalaryComparisonOut(BaseModel):
    component: str
    category: str
    previous: float
    current: float
    difference: float
    percentage_change: float | None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _calculate_totals(earnings: dict, deductions: dict, employer_contributions: dict) -> dict:
    """Calculate all salary totals from components."""
    gross = sum(float(v) for v in earnings.values() if v)
    total_ded = sum(float(v) for v in deductions.values() if v)
    emp_cost = sum(float(v) for v in employer_contributions.values() if v)
    net = gross - total_ded
    monthly_ctc = gross + emp_cost
    annual_ctc = monthly_ctc * 12
    return {
        "gross_salary": round(gross, 2),
        "total_deductions": round(total_ded, 2),
        "net_salary": round(max(net, 0), 2),
        "employer_cost": round(emp_cost, 2),
        "monthly_ctc": round(monthly_ctc, 2),
        "annual_ctc": round(annual_ctc, 2),
    }


def _to_out(s: SalaryStructure) -> SalaryStructureOut:
    return SalaryStructureOut(
        id=s.id,
        employee_id=s.employee_id,
        effective_date=str(s.effective_date),
        earnings=s.earnings,
        deductions=s.deductions,
        employer_contributions=s.employer_contributions,
        gross_salary=float(s.gross_salary),
        total_deductions=float(s.total_deductions),
        net_salary=float(s.net_salary),
        employer_cost=float(s.employer_cost),
        monthly_ctc=float(s.monthly_ctc),
        annual_ctc=float(s.annual_ctc),
    )


# ─── Get salary structure for an employee ─────────────────────────────────────

@router.get("/my", response_model=SalaryStructureOut | None)
def get_my_salary_structure(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the current user's salary structure."""
    if not user.employee_id:
        return None
    structure = db.scalar(
        select(SalaryStructure).where(SalaryStructure.employee_id == user.employee_id)
    )
    if not structure:
        return None
    return _to_out(structure)


@router.get("/{employee_id}", response_model=SalaryStructureOut | None)
def get_salary_structure(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the current salary structure breakdown for an employee."""
    require_view_employee(db, user, employee_id)
    structure = db.scalar(
        select(SalaryStructure).where(SalaryStructure.employee_id == employee_id)
    )
    if not structure:
        return None
    return _to_out(structure)


# ─── Get default template ─────────────────────────────────────────────────────

@router.get("/template/default")
def get_default_template() -> dict:
    """Return the default salary component template."""
    return {
        "earnings": DEFAULT_EARNINGS,
        "deductions": DEFAULT_DEDUCTIONS,
        "employer_contributions": DEFAULT_EMPLOYER_CONTRIBUTIONS,
    }


# ─── Create or Update salary structure ────────────────────────────────────────

@router.put("/{employee_id}", response_model=SalaryStructureOut)
def upsert_salary_structure(
    employee_id: uuid.UUID,
    payload: SalaryStructureIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> SalaryStructureOut:
    """Create or update the salary structure for an employee."""
    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")

    # Validate no negative values
    for category, components in [("earnings", payload.earnings), ("deductions", payload.deductions), ("employer_contributions", payload.employer_contributions)]:
        for key, val in components.items():
            if val and float(val) < 0:
                raise HTTPException(400, f"{category}.{key} cannot be negative")

    # Calculate totals
    totals = _calculate_totals(payload.earnings, payload.deductions, payload.employer_contributions)
    if totals["net_salary"] < 0:
        raise HTTPException(400, "Net salary cannot be negative. Reduce deductions.")

    effective = date.today()
    if payload.effective_date:
        try:
            effective = date.fromisoformat(payload.effective_date)
        except ValueError:
            raise HTTPException(400, "Invalid effective_date format")

    # Upsert
    existing = db.scalar(select(SalaryStructure).where(SalaryStructure.employee_id == employee_id))
    if existing:
        existing.earnings = payload.earnings
        existing.deductions = payload.deductions
        existing.employer_contributions = payload.employer_contributions
        existing.effective_date = effective
        existing.gross_salary = totals["gross_salary"]
        existing.total_deductions = totals["total_deductions"]
        existing.net_salary = totals["net_salary"]
        existing.employer_cost = totals["employer_cost"]
        existing.monthly_ctc = totals["monthly_ctc"]
        existing.annual_ctc = totals["annual_ctc"]
        db.commit()
        db.refresh(existing)
        return _to_out(existing)
    else:
        structure = SalaryStructure(
            employee_id=employee_id,
            effective_date=effective,
            earnings=payload.earnings,
            deductions=payload.deductions,
            employer_contributions=payload.employer_contributions,
            **totals,
        )
        db.add(structure)
        db.commit()
        db.refresh(structure)
        return _to_out(structure)


# ─── Calculate totals (preview without saving) ────────────────────────────────

@router.post("/calculate", response_model=dict)
def calculate_preview(
    payload: SalaryStructureIn,
    _: User = Depends(get_current_user),
) -> dict:
    """Preview calculated totals without saving. Used for live auto-calculation in UI."""
    return _calculate_totals(payload.earnings, payload.deductions, payload.employer_contributions)
