"""CSV export endpoints for HR data.

All exports are restricted to HR admin role.
"""
import csv
import io
from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.leave_request import LeaveRequest
from app.models.salary import SalaryRevision
from app.models.user import User

router = APIRouter(prefix="/export", tags=["export"])


def _csv_response(filename: str, rows: list[dict]) -> StreamingResponse:
    """Generate a StreamingResponse with CSV content."""
    if not rows:
        output = io.StringIO("No data\n")
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/employees")
def export_employees(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> StreamingResponse:
    """Export all employees as CSV."""
    emps = list(db.scalars(select(Employee).order_by(Employee.full_name)).all())
    rows = [
        {
            "employee_code": e.employee_code,
            "full_name": e.full_name,
            "email": e.email,
            "mobile_number": e.mobile_number or "",
            "date_of_birth": str(e.date_of_birth) if e.date_of_birth else "",
            "gender": e.gender or "",
            "marital_status": e.marital_status or "",
            "date_of_joining": str(e.date_of_joining) if e.date_of_joining else "",
            "department": e.department or "",
            "designation": e.designation or "",
            "employment_status": e.employment_status or "",
            "work_location": e.work_location or "",
        }
        for e in emps
    ]
    return _csv_response(f"employees_{date.today().isoformat()}.csv", rows)


@router.get("/salary-revisions")
def export_salary_revisions(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> StreamingResponse:
    """Export all salary revisions as CSV."""
    revs = list(
        db.scalars(
            select(SalaryRevision).order_by(SalaryRevision.effective_date.desc())
        ).all()
    )
    rows = []
    for r in revs:
        emp = db.get(Employee, r.employee_id)
        rows.append({
            "employee_code": emp.employee_code if emp else "",
            "employee_name": emp.full_name if emp else "",
            "effective_date": str(r.effective_date),
            "previous_salary": str(r.previous_salary) if r.previous_salary else "",
            "revised_salary": str(r.revised_salary),
            "revision_percentage": str(r.revision_percentage) if r.revision_percentage else "",
            "approval_status": r.approval_status.value if r.approval_status else "",
            "comments": r.comments or "",
        })
    return _csv_response(f"salary_revisions_{date.today().isoformat()}.csv", rows)


@router.get("/leave-requests")
def export_leave_requests(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> StreamingResponse:
    """Export all leave requests as CSV."""
    reqs = list(
        db.scalars(
            select(LeaveRequest).order_by(LeaveRequest.created_at.desc())
        ).all()
    )
    rows = []
    for lr in reqs:
        emp = db.get(Employee, lr.employee_id)
        rows.append({
            "employee_code": emp.employee_code if emp else "",
            "employee_name": emp.full_name if emp else "",
            "leave_type": lr.leave_type.value,
            "start_date": str(lr.start_date),
            "end_date": str(lr.end_date),
            "status": lr.status.value,
            "reason": lr.reason or "",
            "manager_remarks": lr.manager_remarks or "",
            "hr_remarks": lr.hr_remarks or "",
        })
    return _csv_response(f"leave_requests_{date.today().isoformat()}.csv", rows)


@router.get("/attendance")
def export_attendance(
    month: int | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> StreamingResponse:
    """Export attendance records as CSV (optionally filtered by month/year)."""
    from app.models.attendance_record import AttendanceRecord
    from sqlalchemy import extract

    stmt = select(AttendanceRecord).order_by(AttendanceRecord.work_date.desc())
    if month and year:
        stmt = stmt.where(
            extract("month", AttendanceRecord.work_date) == month,
            extract("year", AttendanceRecord.work_date) == year,
        )
    records = list(db.scalars(stmt).all())
    rows = []
    for r in records:
        emp = db.get(Employee, r.employee_id)
        rows.append({
            "employee_code": emp.employee_code if emp else "",
            "employee_name": emp.full_name if emp else "",
            "work_date": str(r.work_date),
            "check_in": str(r.check_in) if r.check_in else "",
            "check_out": str(r.check_out) if r.check_out else "",
            "work_hours": str(r.work_hours) if r.work_hours else "",
            "status": r.status.value,
            "source": r.source or "",
        })
    return _csv_response(f"attendance_{date.today().isoformat()}.csv", rows)
