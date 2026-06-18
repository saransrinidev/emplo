import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class AddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    address_type: str
    address_line: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None


class EmergencyContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    contact_name: str
    relationship_to: str | None = None
    contact_number: str | None = None


class ProfileOut(BaseModel):
    """Full profile for the current user's employee record."""

    id: uuid.UUID
    employee_code: str
    full_name: str
    email: str
    mobile_number: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    marital_status: str | None = None
    date_of_joining: date | None = None
    department: str | None = None
    designation: str | None = None
    manager_name: str | None = None
    employment_status: str | None = None
    work_location: str | None = None
    profile_photo: str | None = None
    addresses: list[AddressOut] = []
    emergency_contacts: list[EmergencyContactOut] = []
