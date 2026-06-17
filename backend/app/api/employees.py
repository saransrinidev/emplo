import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.role import Role
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=list[EmployeeOut])
def list_employees(
    q: str | None = Query(default=None, description="Search by name, code, or email"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.manager, RoleName.hr_admin)),
) -> list[Employee]:
    stmt = select(Employee)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            Employee.full_name.ilike(like)
            | Employee.employee_code.ilike(like)
            | Employee.email.ilike(like)
        )
    # Managers see only their direct reports.
    if user.role.name == RoleName.manager:
        if not user.employee_id:
            raise HTTPException(status_code=400, detail="Manager has no employee record linked")
        stmt = stmt.where(Employee.manager_id == user.employee_id)
    return list(db.scalars(stmt).all())


# --- List employees with their login role (HR only) ---
# MUST be before /{employee_id} to avoid route conflict.

class EmployeeWithRoleOut(BaseModel):
    id: str
    employee_code: str
    full_name: str
    email: str
    department: str | None = None
    designation: str | None = None
    employment_status: str | None = None
    work_location: str | None = None
    manager_id: str | None = None
    role: str | None = None


@router.get("/with-roles", response_model=list[EmployeeWithRoleOut])
def list_employees_with_roles(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> list[EmployeeWithRoleOut]:
    stmt = select(Employee)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            Employee.full_name.ilike(like)
            | Employee.employee_code.ilike(like)
            | Employee.email.ilike(like)
        )
    employees = list(db.scalars(stmt).all())

    result = []
    for emp in employees:
        user = db.scalar(select(User).where(User.employee_id == emp.id))
        role_name = user.role.name.value if user else None
        result.append(EmployeeWithRoleOut(
            id=str(emp.id),
            employee_code=emp.employee_code,
            full_name=emp.full_name,
            email=emp.email,
            department=emp.department,
            designation=emp.designation,
            employment_status=emp.employment_status,
            work_location=emp.work_location,
            manager_id=str(emp.manager_id) if emp.manager_id else None,
            role=role_name,
        ))
    return result


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Employees may only read their own record.
    if user.role.name == RoleName.employee and user.employee_id != employee.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this employee")
    return employee


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> Employee:
    if db.scalar(select(Employee).where(Employee.employee_code == payload.employee_code)):
        raise HTTPException(status_code=400, detail="Employee code already exists")
    if payload.manager_id is not None and db.get(Employee, payload.manager_id) is None:
        raise HTTPException(status_code=400, detail="Manager not found")

    # Separate initial_salary from the employee fields
    initial_salary = payload.initial_salary
    employee_data = payload.model_dump(exclude={"initial_salary"})
    employee = Employee(**employee_data)
    db.add(employee)
    db.flush()

    # Create initial salary revision if salary is provided
    if initial_salary and initial_salary > 0:
        from app.models.salary import SalaryRevision
        from app.models.enums import ApprovalStatus
        from datetime import date

        revision = SalaryRevision(
            employee_id=employee.id,
            effective_date=payload.date_of_joining or date.today(),
            previous_salary=None,
            revised_salary=initial_salary,
            revision_percentage=None,
            comments="Initial Salary",
            approval_status=ApprovalStatus.approved,
            created_by=user.id,
        )
        db.add(revision)

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action="create", entity_type="employee",
               entity_id=str(employee.id), changes={
                   "full_name": employee.full_name,
                   "email": employee.email,
                   "initial_salary": str(initial_salary) if initial_salary else None,
               })

    db.commit()
    db.refresh(employee)
    return employee


# --- Bulk import employees (HR only) ---

class BulkEmployeeItem(BaseModel):
    employee_code: str
    full_name: str
    email: str
    mobile_number: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    marital_status: str | None = None
    date_of_joining: str | None = None
    department: str | None = None
    designation: str | None = None
    employment_status: str | None = None
    work_location: str | None = None


class BulkImportRequest(BaseModel):
    employees: list[BulkEmployeeItem]


class BulkImportResult(BaseModel):
    total: int
    created: int
    errors: list[str]


@router.post("/bulk-import", response_model=BulkImportResult, status_code=201)
def bulk_import_employees(
    payload: BulkImportRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> BulkImportResult:
    """Import multiple employees from a parsed CSV/Excel payload."""
    created = 0
    errors: list[str] = []

    for i, item in enumerate(payload.employees, start=1):
        row_label = f"Row {i} ({item.employee_code})"

        if not item.employee_code or not item.full_name or not item.email:
            errors.append(f"{row_label}: employee_code, full_name, and email are required.")
            continue

        if db.scalar(select(Employee).where(Employee.employee_code == item.employee_code)):
            errors.append(f"{row_label}: Employee code already exists.")
            continue

        if db.scalar(select(Employee).where(Employee.email == item.email)):
            errors.append(f"{row_label}: Email already exists.")
            continue

        try:
            emp_data = item.model_dump()
            # Parse date strings if provided
            from datetime import date as date_type
            for date_field in ("date_of_birth", "date_of_joining"):
                val = emp_data.get(date_field)
                if val and isinstance(val, str):
                    try:
                        emp_data[date_field] = date_type.fromisoformat(val)
                    except ValueError:
                        errors.append(f"{row_label}: Invalid date format for {date_field}: '{val}' (use YYYY-MM-DD)")
                        emp_data[date_field] = None

            employee = Employee(**emp_data)
            db.add(employee)
            db.flush()
            created += 1
        except Exception as e:
            errors.append(f"{row_label}: {str(e)}")

    db.commit()
    return BulkImportResult(total=len(payload.employees), created=created, errors=errors)


@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: uuid.UUID,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    updates = payload.model_dump(exclude_unset=True)
    new_manager_id = updates.get("manager_id")
    if "manager_id" in updates and new_manager_id is not None:
        if new_manager_id == employee.id:
            raise HTTPException(status_code=400, detail="An employee cannot be their own manager")
        if db.get(Employee, new_manager_id) is None:
            raise HTTPException(status_code=400, detail="Manager not found")
    for field, value in updates.items():
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    return employee


# --- Create login account for an employee (HR only) ---

class CreateLoginRequest(BaseModel):
    password: str
    role: RoleName = RoleName.employee


class UserAccountOut(BaseModel):
    id: str
    email: str
    role: str
    employee_id: str


@router.post("/{employee_id}/create-login", response_model=UserAccountOut, status_code=201)
def create_login_for_employee(
    employee_id: uuid.UUID,
    payload: CreateLoginRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> UserAccountOut:
    """Create a user login account linked to an existing employee record."""
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check if employee already has a user account
    existing_user = db.scalar(select(User).where(User.employee_id == employee.id))
    if existing_user:
        raise HTTPException(status_code=400, detail="Employee already has a login account")

    # Check if email is already used by another user
    email_taken = db.scalar(select(User).where(User.email == employee.email))
    if email_taken:
        raise HTTPException(status_code=400, detail="Email already registered to another account")

    role = db.scalar(select(Role).where(Role.name == payload.role))
    if role is None:
        raise HTTPException(status_code=400, detail="Role not found")

    user = User(
        email=employee.email,
        password_hash=hash_password(payload.password),
        role_id=role.id,
        employee_id=employee.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserAccountOut(
        id=str(user.id),
        email=user.email,
        role=role.name.value,
        employee_id=str(employee.id),
    )


# --- Terminate (delete) an employee (HR only) ---

@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> None:
    """Delete an employee record and their linked user account if any."""
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action="terminate", entity_type="employee",
               entity_id=str(employee.id), changes={"full_name": employee.full_name, "email": employee.email})

    # Delete linked user account if exists
    linked_user = db.scalar(select(User).where(User.employee_id == employee.id))
    if linked_user:
        db.delete(linked_user)

    db.delete(employee)
    db.commit()


# --- Change user role (HR only) ---

class ChangeRoleRequest(BaseModel):
    role: RoleName


@router.put("/{employee_id}/change-role", response_model=UserAccountOut)
def change_employee_role(
    employee_id: uuid.UUID,
    payload: ChangeRoleRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(RoleName.hr_admin)),
) -> UserAccountOut:
    """Change the login role of an employee (promote/demote)."""
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    user = db.scalar(select(User).where(User.employee_id == employee.id))
    if not user:
        raise HTTPException(status_code=400, detail="Employee has no login account")

    old_role = user.role.name.value
    role = db.scalar(select(Role).where(Role.name == payload.role))
    if role is None:
        raise HTTPException(status_code=400, detail="Role not found")

    user.role_id = role.id

    from app.api.audit_helper import log_action
    log_action(db, actor_id=actor.id, action="change_role", entity_type="employee",
               entity_id=str(employee.id), changes={"from": old_role, "to": payload.role.value})

    db.commit()
    db.refresh(user)

    return UserAccountOut(
        id=str(user.id),
        email=user.email,
        role=role.name.value,
        employee_id=str(employee.id),
    )
