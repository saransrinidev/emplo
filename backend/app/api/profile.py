from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.employee import Employee
from app.models.user import User
from app.schemas.profile import ProfileOut
from sqlalchemy.orm import Session

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileOut:
    if not user.employee_id:
        raise HTTPException(
            status_code=404,
            detail="No employee record is linked to this account.",
        )
    emp = db.get(Employee, user.employee_id)
    if emp is None:
        raise HTTPException(status_code=404, detail="Employee record not found")

    manager_name = None
    if emp.manager_id:
        mgr = db.get(Employee, emp.manager_id)
        manager_name = mgr.full_name if mgr else None

    return ProfileOut(
        id=emp.id,
        employee_code=emp.employee_code,
        full_name=emp.full_name,
        email=emp.email,
        mobile_number=emp.mobile_number,
        date_of_birth=emp.date_of_birth,
        gender=emp.gender,
        marital_status=emp.marital_status,
        date_of_joining=emp.date_of_joining,
        department=emp.department,
        designation=emp.designation,
        manager_name=manager_name,
        employment_status=emp.employment_status,
        work_location=emp.work_location,
        addresses=emp.addresses,
        emergency_contacts=emp.emergency_contacts,
    )
