"""Payslip PDF generation.

Generates a monthly payslip PDF for an employee based on their salary data.
Uses reportlab for PDF creation.
"""
import io
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.helpers import require_view_employee
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import ApprovalStatus
from app.models.salary import SalaryRevision
from app.models.user import User

router = APIRouter(prefix="/payslip", tags=["payslip"])


def _get_current_salary(db: Session, employee_id: uuid.UUID) -> float | None:
    """Get current approved salary for an employee."""
    rev = db.scalars(
        select(SalaryRevision)
        .where(
            SalaryRevision.employee_id == employee_id,
            SalaryRevision.approval_status == ApprovalStatus.approved,
        )
        .order_by(SalaryRevision.effective_date.desc())
        .limit(1)
    ).first()
    return float(rev.revised_salary) if rev else None


def _generate_payslip_pdf(
    emp: Employee,
    month: int,
    year: int,
    annual_ctc: float,
) -> io.BytesIO:
    """Generate a payslip PDF and return as BytesIO buffer."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    except ImportError:
        raise HTTPException(500, "PDF generation requires reportlab. Install with: pip install reportlab")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=15*mm, rightMargin=15*mm)
    styles = getSampleStyleSheet()
    elements = []

    # Title style
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=18, spaceAfter=6, textColor=colors.HexColor("#1e40af"))
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=10, textColor=colors.gray)
    header_style = ParagraphStyle("Header", parent=styles["Heading2"], fontSize=12, spaceAfter=10, textColor=colors.HexColor("#1e3a5f"))

    # Monthly calculations
    monthly_gross = round(annual_ctc / 12, 2)
    basic = round(monthly_gross * 0.4, 2)
    hra = round(monthly_gross * 0.2, 2)
    special_allowance = round(monthly_gross * 0.2, 2)
    other_allowance = round(monthly_gross * 0.1, 2)
    pf_deduction = round(basic * 0.12, 2)
    professional_tax = 200.0
    total_deductions = round(pf_deduction + professional_tax, 2)
    net_pay = round(monthly_gross - total_deductions, 2)

    month_name = date(year, month, 1).strftime("%B %Y")

    # Company header
    elements.append(Paragraph("EMPLO", title_style))
    elements.append(Paragraph("Payslip for " + month_name, subtitle_style))
    elements.append(Spacer(1, 10*mm))

    # Employee info table
    elements.append(Paragraph("Employee Information", header_style))
    info_data = [
        ["Employee Name", emp.full_name, "Employee Code", emp.employee_code],
        ["Department", emp.department or "—", "Designation", emp.designation or "—"],
        ["Date of Joining", str(emp.date_of_joining) if emp.date_of_joining else "—", "Pay Period", month_name],
    ]
    info_table = Table(info_data, colWidths=[80, 140, 80, 140])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.gray),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.gray),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8*mm))

    # Earnings & Deductions
    elements.append(Paragraph("Earnings & Deductions", header_style))
    salary_data = [
        ["Earnings", "Amount (₹)", "Deductions", "Amount (₹)"],
        ["Basic Pay", f"{basic:,.2f}", "Provident Fund (12%)", f"{pf_deduction:,.2f}"],
        ["HRA", f"{hra:,.2f}", "Professional Tax", f"{professional_tax:,.2f}"],
        ["Special Allowance", f"{special_allowance:,.2f}", "", ""],
        ["Other Allowance", f"{other_allowance:,.2f}", "", ""],
        ["", "", "", ""],
        ["Gross Earnings", f"{monthly_gross:,.2f}", "Total Deductions", f"{total_deductions:,.2f}"],
    ]
    salary_table = Table(salary_data, colWidths=[120, 100, 120, 100])
    salary_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f1f5f9")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("ALIGN", (3, 0), (3, -1), "RIGHT"),
    ]))
    elements.append(salary_table)
    elements.append(Spacer(1, 8*mm))

    # Net pay
    net_data = [["Net Pay (Take Home)", f"₹ {net_pay:,.2f}"]]
    net_table = Table(net_data, colWidths=[340, 100])
    net_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 12),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    elements.append(net_table)
    elements.append(Spacer(1, 12*mm))

    # Footer
    elements.append(Paragraph("This is a system-generated payslip. No signature required.", subtitle_style))
    elements.append(Paragraph(f"Generated on {date.today().strftime('%B %d, %Y')} by Emplo HRMS", subtitle_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer


@router.get("/download")
def download_payslip(
    employee_id: uuid.UUID | None = None,
    month: int = Query(default=None),
    year: int = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Download a payslip PDF for a given month/year."""
    # Default to current month
    today = date.today()
    if not month:
        month = today.month
    if not year:
        year = today.year

    # Resolve target employee
    target_id = employee_id or user.employee_id
    if not target_id:
        raise HTTPException(400, "No employee record linked")
    require_view_employee(db, user, target_id)

    emp = db.get(Employee, target_id)
    if not emp:
        raise HTTPException(404, "Employee not found")

    # Get salary
    annual_ctc = _get_current_salary(db, target_id)
    if not annual_ctc:
        raise HTTPException(400, "No approved salary found for this employee")

    pdf_buffer = _generate_payslip_pdf(emp, month, year, annual_ctc)
    filename = f"payslip_{emp.employee_code}_{year}_{month:02d}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
