from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.certification import Certification
from app.models.document import Document
from app.models.employee import Employee
from app.models.enums import ApprovalStatus, RoleName, VerificationStatus
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

    current = db.scalars(
        select(SalaryRevision)
        .where(
            SalaryRevision.employee_id == emp.id,
            SalaryRevision.approval_status == ApprovalStatus.approved,
        )
        .order_by(SalaryRevision.effective_date.desc())
        .limit(1)
    ).first()

    latest_review = db.scalars(
        select(PerformanceReview)
        .where(PerformanceReview.employee_id == emp.id)
        .order_by(PerformanceReview.review_date.desc())
        .limit(1)
    ).first()

    cert_count = db.scalar(
        select(func.count())
        .select_from(Certification)
        .where(Certification.employee_id == emp.id)
    )
    soon = date.today() + timedelta(days=90)
    expiring = db.scalar(
        select(func.count())
        .select_from(Certification)
        .where(
            Certification.employee_id == emp.id,
            Certification.expiry_date.is_not(None),
            Certification.expiry_date <= soon,
        )
    )

    return EmployeeDashboardOut(
        designation=emp.designation,
        date_of_joining=str(emp.date_of_joining) if emp.date_of_joining else None,
        current_salary=current.revised_salary if current else None,
        latest_rating=str(latest_review.rating) if latest_review and latest_review.rating else None,
        certification_count=cert_count or 0,
        expiring_soon=expiring or 0,
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

    avg_rating = None
    if report_ids:
        avg = db.scalar(
            select(func.avg(PerformanceReview.rating)).where(
                PerformanceReview.employee_id.in_(report_ids)
            )
        )
        avg_rating = f"{float(avg):.1f}" if avg is not None else None

    soon = date.today() + timedelta(days=90)
    cert_alerts = 0
    missing_docs = 0
    if report_ids:
        cert_alerts = db.scalar(
            select(func.count())
            .select_from(Certification)
            .where(
                Certification.employee_id.in_(report_ids),
                Certification.expiry_date.is_not(None),
                Certification.expiry_date <= soon,
            )
        ) or 0
        with_docs = set(
            db.scalars(
                select(Document.employee_id).where(Document.employee_id.in_(report_ids))
            ).all()
        )
        missing_docs = len([rid for rid in report_ids if rid not in with_docs])

    return ManagerDashboardOut(
        team_members=len(reports),
        avg_team_rating=avg_rating,
        cert_expiry_alerts=cert_alerts,
        missing_documents=missing_docs,
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

    all_ids = set(db.scalars(select(Employee.id)).all())
    with_docs = set(db.scalars(select(Document.employee_id)).all())
    missing = len(all_ids - with_docs)

    today = date.today()
    expired = db.scalar(
        select(func.count())
        .select_from(Certification)
        .where(Certification.expiry_date.is_not(None), Certification.expiry_date < today)
    ) or 0
    pending = db.scalar(
        select(func.count())
        .select_from(Document)
        .where(Document.status == VerificationStatus.uploaded)
    ) or 0

    return HrDashboardOut(
        total_employees=total,
        active_employees=active,
        new_joiners=new_joiners,
        employees_missing_documents=missing,
        expired_certifications=expired,
        pending_verifications=pending,
    )
