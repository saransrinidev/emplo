import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.address import EmployeeAddress
from app.models.edit_permission import EmployeeEditPermission
from app.models.employee import Employee
from app.models.enums import AddressType, EditableSection, RoleName
from app.models.user import User
from app.schemas.profile import ProfileOut

router = APIRouter(prefix="/profile", tags=["profile"])


def _has_active_permission(db: Session, employee_id: uuid.UUID, section: EditableSection) -> bool:
    """Check if the employee has an active (non-revoked, within window) permission."""
    now = datetime.now(timezone.utc)
    perm = db.scalar(
        select(EmployeeEditPermission).where(
            EmployeeEditPermission.employee_id == employee_id,
            EmployeeEditPermission.section == section,
            EmployeeEditPermission.is_revoked == False,  # noqa: E712
            EmployeeEditPermission.start_at <= now,
            EmployeeEditPermission.expiry_at >= now,
        )
    )
    return perm is not None


def _can_edit(db: Session, user: User, section: EditableSection) -> bool:
    """HR can always edit. Others need active permission."""
    if user.role.name == RoleName.hr_admin:
        return True
    if not user.employee_id:
        return False
    return _has_active_permission(db, user.employee_id, section)


def _build_profile(db: Session, emp: Employee) -> ProfileOut:
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
        profile_photo=emp.profile_photo,
        addresses=emp.addresses,
        emergency_contacts=emp.emergency_contacts,
    )


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
    return _build_profile(db, emp)


# --- Which sections can the employee currently edit? ---

class EditableSectionsOut(BaseModel):
    phone: bool
    address: bool
    certifications: bool


@router.get("/editable-sections", response_model=EditableSectionsOut)
def get_editable_sections(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EditableSectionsOut:
    if user.role.name == RoleName.hr_admin:
        return EditableSectionsOut(phone=True, address=True, certifications=True)
    if not user.employee_id:
        return EditableSectionsOut(phone=False, address=False, certifications=False)
    return EditableSectionsOut(
        phone=_has_active_permission(db, user.employee_id, EditableSection.phone),
        address=_has_active_permission(db, user.employee_id, EditableSection.address),
        certifications=_has_active_permission(db, user.employee_id, EditableSection.certifications),
    )


# --- Update phone (requires active 'phone' permission) ---

class UpdatePhoneRequest(BaseModel):
    mobile_number: str


@router.put("/phone", response_model=ProfileOut)
def update_phone(
    payload: UpdatePhoneRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileOut:
    if not user.employee_id:
        raise HTTPException(status_code=404, detail="No employee record linked")
    if not _can_edit(db, user, EditableSection.phone):
        raise HTTPException(status_code=403, detail="You don't have active permission to edit your phone number.")
    emp = db.get(Employee, user.employee_id)
    if emp is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.mobile_number = payload.mobile_number

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action="update_phone", entity_type="employee",
               entity_id=str(emp.id), changes={"mobile_number": payload.mobile_number})

    db.commit()
    db.refresh(emp)
    return _build_profile(db, emp)


# --- Update address (requires active 'address' permission) ---

class UpdateAddressRequest(BaseModel):
    address_type: AddressType
    address_line: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None


@router.put("/address", response_model=ProfileOut)
def update_address(
    payload: UpdateAddressRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileOut:
    if not user.employee_id:
        raise HTTPException(status_code=404, detail="No employee record linked")
    if not _can_edit(db, user, EditableSection.address):
        raise HTTPException(status_code=403, detail="You don't have active permission to edit your address.")
    emp = db.get(Employee, user.employee_id)
    if emp is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Find existing address of this type, or create one
    address = db.scalar(
        select(EmployeeAddress).where(
            EmployeeAddress.employee_id == emp.id,
            EmployeeAddress.address_type == payload.address_type,
        )
    )
    if address is None:
        address = EmployeeAddress(employee_id=emp.id, address_type=payload.address_type)
        db.add(address)

    address.address_line = payload.address_line
    address.city = payload.city
    address.state = payload.state
    address.postal_code = payload.postal_code
    address.country = payload.country

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action="update_address", entity_type="employee",
               entity_id=str(emp.id), changes={"address_type": payload.address_type.value, "city": payload.city})

    db.commit()
    db.refresh(emp)
    return _build_profile(db, emp)


# --- Update profile photo (any authenticated user for their own profile) ---

class UpdatePhotoRequest(BaseModel):
    profile_photo: str  # base64 data URL


@router.put("/photo", response_model=ProfileOut)
def update_profile_photo(
    payload: UpdatePhotoRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileOut:
    if not user.employee_id:
        raise HTTPException(status_code=404, detail="No employee record linked")
    emp = db.get(Employee, user.employee_id)
    if emp is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate it's a data URL
    if not payload.profile_photo.startswith("data:image"):
        raise HTTPException(status_code=400, detail="Invalid image format. Must be a data URL.")

    # Limit size (~2MB in base64)
    if len(payload.profile_photo) > 2_800_000:
        raise HTTPException(status_code=400, detail="Image too large. Maximum 2MB.")

    emp.profile_photo = payload.profile_photo

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action="update_photo", entity_type="employee",
               entity_id=str(emp.id), changes={"field": "profile_photo"})

    db.commit()
    db.refresh(emp)
    return _build_profile(db, emp)


@router.delete("/photo", response_model=ProfileOut)
def remove_profile_photo(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileOut:
    if not user.employee_id:
        raise HTTPException(status_code=404, detail="No employee record linked")
    emp = db.get(Employee, user.employee_id)
    if emp is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.profile_photo = None
    db.commit()
    db.refresh(emp)
    return _build_profile(db, emp)
