import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.department import Department
from app.models.designation import Designation
from app.models.enums import RoleName
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    DesignationCreate,
    DesignationOut,
    DesignationUpdate,
)

router = APIRouter(prefix="/departments", tags=["departments"])


# ─── Departments ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[DepartmentOut])
def list_departments(
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Department]:
    stmt = select(Department).order_by(Department.name)
    if active_only:
        stmt = stmt.where(Department.is_active == True)  # noqa: E712
    return list(db.scalars(stmt).all())


@router.post("", response_model=DepartmentOut, status_code=201)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> Department:
    if db.scalar(select(Department).where(Department.name == payload.name)):
        raise HTTPException(400, "Department name already exists")
    if db.scalar(select(Department).where(Department.code == payload.code)):
        raise HTTPException(400, "Department code already exists")
    dept = Department(**payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: uuid.UUID,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> Department:
    dept = db.get(Department, dept_id)
    if dept is None:
        raise HTTPException(404, "Department not found")
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] != dept.name:
        if db.scalar(select(Department).where(Department.name == updates["name"])):
            raise HTTPException(400, "Department name already exists")
    if "code" in updates and updates["code"] != dept.code:
        if db.scalar(select(Department).where(Department.code == updates["code"])):
            raise HTTPException(400, "Department code already exists")
    for field, value in updates.items():
        setattr(dept, field, value)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}", status_code=204)
def delete_department(
    dept_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> None:
    dept = db.get(Department, dept_id)
    if dept is None:
        raise HTTPException(404, "Department not found")
    db.delete(dept)
    db.commit()


# ─── Designations ─────────────────────────────────────────────────────────────

@router.get("/designations", response_model=list[DesignationOut])
def list_designations(
    department_id: uuid.UUID | None = Query(default=None),
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Designation]:
    stmt = select(Designation).order_by(Designation.title)
    if department_id:
        stmt = stmt.where(Designation.department_id == department_id)
    if active_only:
        stmt = stmt.where(Designation.is_active == True)  # noqa: E712
    return list(db.scalars(stmt).all())


@router.post("/designations", response_model=DesignationOut, status_code=201)
def create_designation(
    payload: DesignationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> Designation:
    # Validate department exists if provided
    if payload.department_id and db.get(Department, payload.department_id) is None:
        raise HTTPException(400, "Department not found")
    # Check uniqueness within the same department
    existing = db.scalar(
        select(Designation).where(
            Designation.title == payload.title,
            Designation.department_id == payload.department_id,
        )
    )
    if existing:
        raise HTTPException(400, "Designation already exists for this department")
    desig = Designation(**payload.model_dump())
    db.add(desig)
    db.commit()
    db.refresh(desig)
    return desig


@router.put("/designations/{desig_id}", response_model=DesignationOut)
def update_designation(
    desig_id: uuid.UUID,
    payload: DesignationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> Designation:
    desig = db.get(Designation, desig_id)
    if desig is None:
        raise HTTPException(404, "Designation not found")
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(desig, field, value)
    db.commit()
    db.refresh(desig)
    return desig


@router.delete("/designations/{desig_id}", status_code=204)
def delete_designation(
    desig_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> None:
    desig = db.get(Designation, desig_id)
    if desig is None:
        raise HTTPException(404, "Designation not found")
    db.delete(desig)
    db.commit()
