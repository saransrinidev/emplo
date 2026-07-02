from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.certification import Certification
from app.models.document import Document
from app.models.employee import Employee
from app.models.enums import ApprovalStatus, DocumentType, RoleName, VerificationStatus
from app.models.performance import PerformanceReview
from app.models.salary import SalaryRevision
from app.models.user import User
from app.schemas.dashboard import (
    EmployeeDashboardOut,
    HrDashboardOut,
    ManagerDashboardOut,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/employee", response_model=EmployeeDashboardOut)
def employee_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EmployeeDashboardOut:
    if not user.employee_id:
        raise HTTPException(status_code=404, detail="No employee record linked")
    emp = db.get(Employee, user.employee_id)
    if emp is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Manager name
    manager_name = None
    if emp.manager_id:
        mgr = db.get(Employee, emp.manager_id)
        manager_name = mgr.full_name if mgr else None

    # Current salary
    current = db.scalars(
        select(SalaryRevision)
        .where(
            SalaryRevision.employee_id == emp.id,
            SalaryRevision.approval_status == ApprovalStatus.approved,
        )
        .order_by(SalaryRevision.effective_date.desc())
        .limit(1)
    ).first()

    # Latest performance rating
    latest_review = db.scalars(
        select(PerformanceReview)
        .where(PerformanceReview.employee_id == emp.id)
        .order_by(PerformanceReview.review_date.desc())
        .limit(1)
    ).first()

    # Certification count and expiring
    cert_count = db.scalar(
        select(func.count())
        .select_from(Certification)
        .where(Certification.employee_id == emp.id)
    ) or 0

    soon = date.today() + timedelta(days=90)
    expiring = db.scalar(
        select(func.count())
        .select_from(Certification)
        .where(
            Certification.employee_id == emp.id,
            Certification.expiry_date.is_not(None),
            Certification.expiry_date <= soon,
            Certification.expiry_date >= date.today(),
        )
    ) or 0

    return EmployeeDashboardOut(
        designation=emp.designation,
        date_of_joining=str(emp.date_of_joining) if emp.date_of_joining else None,
        manager_name=manager_name,
        current_salary=current.revised_salary if current else None,
        latest_rating=str(latest_review.rating) if latest_review and latest_review.rating else None,
        certification_count=cert_count,
        expiring_soon=expiring,
    )


@router.get("/manager", response_model=ManagerDashboardOut)
def manager_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.manager, RoleName.hr_admin)),
) -> ManagerDashboardOut:
    reports = list(
        db.scalars(select(Employee).where(Employee.manager_id == user.employee_id)).all()
    )
    report_ids = [e.id for e in reports]

    # Average team rating
    avg_rating = None
    if report_ids:
        avg = db.scalar(
            select(func.avg(PerformanceReview.rating)).where(
                PerformanceReview.employee_id.in_(report_ids)
            )
        )
        avg_rating = f"{float(avg):.1f}" if avg is not None else None

    # Cert expiry alerts (within 90 days)
    cert_alerts = 0
    missing_docs = 0
    upcoming_anniversaries = 0

    if report_ids:
        soon = date.today() + timedelta(days=90)
        cert_alerts = db.scalar(
            select(func.count())
            .select_from(Certification)
            .where(
                Certification.employee_id.in_(report_ids),
                Certification.expiry_date.is_not(None),
                Certification.expiry_date <= soon,
                Certification.expiry_date >= date.today(),
            )
        ) or 0

        # Missing documents
        with_docs = set(
            db.scalars(
                select(Document.employee_id).where(Document.employee_id.in_(report_ids))
            ).all()
        )
        missing_docs = len([rid for rid in report_ids if rid not in with_docs])

        # Upcoming work anniversaries (within next 30 days)
        today = date.today()
        for emp in reports:
            if emp.date_of_joining:
                # Calculate this year's anniversary
                try:
                    anniversary = emp.date_of_joining.replace(year=today.year)
                    if anniversary < today:
                        anniversary = anniversary.replace(year=today.year + 1)
                    if 0 <= (anniversary - today).days <= 30:
                        upcoming_anniversaries += 1
                except ValueError:
                    pass  # leap year edge case

    return ManagerDashboardOut(
        team_members=len(reports),
        avg_team_rating=avg_rating,
        cert_expiry_alerts=cert_alerts,
        missing_documents=missing_docs,
        upcoming_anniversaries=upcoming_anniversaries,
    )


@router.get("/hr", response_model=HrDashboardOut)
def hr_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> HrDashboardOut:
    total = db.scalar(select(func.count()).select_from(Employee)) or 0
    active = db.scalar(
        select(func.count())
        .select_from(Employee)
        .where(Employee.employment_status == "Active")
    ) or 0

    ninety_days_ago = date.today() - timedelta(days=90)
    new_joiners = db.scalar(
        select(func.count())
        .select_from(Employee)
        .where(Employee.date_of_joining.is_not(None), Employee.date_of_joining >= ninety_days_ago)
    ) or 0

    # Missing documents — employees missing any required document type
    required_types = [DocumentType.school, DocumentType.intermediate, DocumentType.degree]
    all_emp_ids = list(db.scalars(select(Employee.id)).all())
    present_map: dict = {}
    if all_emp_ids:
        rows = db.execute(
            select(Document.employee_id, Document.document_type)
        ).all()
        for eid, dtype in rows:
            present_map.setdefault(eid, set()).add(dtype)
    missing = sum(
        1
        for eid in all_emp_ids
        if any(t not in present_map.get(eid, set()) for t in required_types)
    )

    today = date.today()

    # Expired certifications
    expired = db.scalar(
        select(func.count())
        .select_from(Certification)
        .where(Certification.expiry_date.is_not(None), Certification.expiry_date < today)
    ) or 0

    # Pending verifications
    pending = db.scalar(
        select(func.count())
        .select_from(Document)
        .where(Document.status == VerificationStatus.uploaded)
    ) or 0

    # Certifications expiring in 30/60/90 days
    certs_30 = db.scalar(
        select(func.count()).select_from(Certification).where(
            Certification.expiry_date.is_not(None),
            Certification.expiry_date >= today,
            Certification.expiry_date <= today + timedelta(days=30),
        )
    ) or 0
    certs_60 = db.scalar(
        select(func.count()).select_from(Certification).where(
            Certification.expiry_date.is_not(None),
            Certification.expiry_date >= today,
            Certification.expiry_date <= today + timedelta(days=60),
        )
    ) or 0
    certs_90 = db.scalar(
        select(func.count()).select_from(Certification).where(
            Certification.expiry_date.is_not(None),
            Certification.expiry_date >= today,
            Certification.expiry_date <= today + timedelta(days=90),
        )
    ) or 0

    # Recent salary revisions (last 30 days)
    thirty_days_ago = today - timedelta(days=30)
    recent_revisions = db.scalar(
        select(func.count()).select_from(SalaryRevision).where(
            SalaryRevision.effective_date >= thirty_days_ago,
        )
    ) or 0

    return HrDashboardOut(
        total_employees=total,
        active_employees=active,
        new_joiners=new_joiners,
        employees_missing_documents=missing,
        expired_certifications=expired,
        pending_verifications=pending,
        certs_expiring_30=certs_30,
        certs_expiring_60=certs_60,
        certs_expiring_90=certs_90,
        recent_salary_revisions=recent_revisions,
    )


from app.schemas.dashboard import (
    MissingDocEmployee,
    MissingDocumentsOut,
)

# Documents considered mandatory for a complete employee profile
REQUIRED_DOCUMENT_TYPES = [
    DocumentType.school,
    DocumentType.intermediate,
    DocumentType.degree,
]


def _missing_types_for(present: set) -> list[str]:
    labels = {
        DocumentType.school: "School Certificate (10th)",
        DocumentType.intermediate: "Intermediate Certificate (12th)",
        DocumentType.degree: "Degree Certificate",
    }
    return [labels[t] for t in REQUIRED_DOCUMENT_TYPES if t not in present]


@router.get("/missing-documents", response_model=MissingDocumentsOut)
def missing_documents(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin, RoleName.manager)),
) -> MissingDocumentsOut:
    """List employees who are missing one or more required documents.

    HR sees all employees; a manager sees only their direct reports.
    """
    query = select(Employee)
    if user.role.name == RoleName.manager:
        query = query.where(Employee.manager_id == user.employee_id)

    employees = list(db.scalars(query).all())
    emp_ids = [e.id for e in employees]

    # Map employee_id -> set of document_types present
    present_map: dict = {}
    if emp_ids:
        rows = db.execute(
            select(Document.employee_id, Document.document_type).where(
                Document.employee_id.in_(emp_ids)
            )
        ).all()
        for eid, dtype in rows:
            present_map.setdefault(eid, set()).add(dtype)

    results: list[MissingDocEmployee] = []
    for emp in employees:
        present = present_map.get(emp.id, set())
        missing = _missing_types_for(present)
        if missing:
            results.append(
                MissingDocEmployee(
                    id=str(emp.id),
                    full_name=emp.full_name,
                    employee_code=emp.employee_code,
                    department=emp.department,
                    designation=emp.designation,
                    missing_documents=missing,
                )
            )

    return MissingDocumentsOut(total=len(results), employees=results)


from app.schemas.dashboard import AnalyticsOut, DepartmentStat


@router.get("/analytics", response_model=AnalyticsOut)
def analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> AnalyticsOut:
    """Org-wide analytics: headcount, attrition, tenure, department breakdown."""
    total = db.scalar(select(func.count()).select_from(Employee)) or 0
    active = db.scalar(
        select(func.count()).select_from(Employee)
        .where(Employee.employment_status.in_(["Active", "active", None]))
    ) or 0

    # Attrition: employees with status 'terminated' or 'resigned' in last 12 months
    one_year_ago = date.today() - timedelta(days=365)
    left = db.scalar(
        select(func.count()).select_from(Employee)
        .where(Employee.employment_status.in_(["Terminated", "terminated", "Resigned", "resigned"]))
    ) or 0
    attrition_rate = round((left / total * 100), 1) if total > 0 else 0.0

    # Avg tenure
    today = date.today()
    employees_with_doj = list(
        db.scalars(select(Employee.date_of_joining).where(Employee.date_of_joining.is_not(None)))
    )
    avg_tenure = 0.0
    if employees_with_doj:
        tenures = [(today - doj).days / 30 for doj in employees_with_doj]
        avg_tenure = round(sum(tenures) / len(tenures), 1)

    # Department distribution
    dept_rows = db.execute(
        select(Employee.department, func.count())
        .where(Employee.department.is_not(None))
        .group_by(Employee.department)
        .order_by(func.count().desc())
    ).all()
    department_distribution = [DepartmentStat(department=r[0], count=r[1]) for r in dept_rows]

    # Monthly joiners (last 12 months)
    monthly_joiners = []
    for i in range(12):
        # Calculate month start by simple subtraction
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        month_start = date(y, m, 1)
        # Next month start
        nm = m + 1
        ny = y
        if nm > 12:
            nm = 1
            ny += 1
        month_end = date(ny, nm, 1) - timedelta(days=1)
        count = db.scalar(
            select(func.count()).select_from(Employee)
            .where(
                Employee.date_of_joining.is_not(None),
                Employee.date_of_joining >= month_start,
                Employee.date_of_joining <= month_end,
            )
        ) or 0
        monthly_joiners.append({"month": month_start.strftime("%Y-%m"), "count": count})
    monthly_joiners.reverse()

    # Gender distribution
    gender_rows = db.execute(
        select(Employee.gender, func.count())
        .where(Employee.gender.is_not(None))
        .group_by(Employee.gender)
    ).all()
    gender_distribution = [{"gender": r[0], "count": r[1]} for r in gender_rows]

    return AnalyticsOut(
        total_employees=total,
        active_employees=active,
        attrition_rate=attrition_rate,
        avg_tenure_months=avg_tenure,
        department_distribution=department_distribution,
        monthly_joiners=monthly_joiners,
        gender_distribution=gender_distribution,
    )
