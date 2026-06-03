import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.api.helpers import require_view_employee
from app.db.session import get_db
from app.models.certification import Certification
from app.models.enums import RoleName
from app.models.user import User
from app.schemas.certification import (
    CertificationCreate,
    CertificationOut,
    CertificationUpdate,
)

router = APIRouter(prefix="/certifications", tags=["certifications"])


@router.get("", response_model=list[CertificationOut])
def list_certifications(
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Certification]:
    target = employee_id or user.employee_id
    if target is None:
        return []
    require_view_employee(db, user, target)
    stmt = select(Certification).where(Certification.employee_id == target)
    return list(db.scalars(stmt).all())


@router.get("/expiring", response_model=list[CertificationOut])
def expiring_certifications(
    days: int = 90,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.manager, RoleName.hr_admin)),
) -> list[Certification]:
    cutoff = date.today() + timedelta(days=days)
    stmt = select(Certification).where(
        Certification.expiry_date.is_not(None),
        Certification.expiry_date <= cutoff,
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=CertificationOut, status_code=201)
def add_certification(
    payload: CertificationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Certification:
    # Resolve employee_id: default to current user's linked employee if not provided.
    target_employee_id = payload.employee_id or user.employee_id
    if target_employee_id is None:
        raise HTTPException(status_code=400, detail="No employee record linked to this account")
    # Employees can add their own; HR can add for anyone.
    if user.role.name == RoleName.employee and user.employee_id != target_employee_id:
        raise HTTPException(status_code=403, detail="Cannot add for another employee")
    data = payload.model_dump(exclude={"employee_id"})
    cert = Certification(employee_id=target_employee_id, **data)
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


@router.put("/{cert_id}", response_model=CertificationOut)
def update_certification(
    cert_id: uuid.UUID,
    payload: CertificationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> Certification:
    cert = db.get(Certification, cert_id)
    if cert is None:
        raise HTTPException(status_code=404, detail="Certification not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cert, field, value)
    db.commit()
    db.refresh(cert)
    return cert
