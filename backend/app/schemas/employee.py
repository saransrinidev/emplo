import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class EmployeeBase(BaseModel):
    employee_code: str
    full_name: str
    email: EmailStr
    mobile_number: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    marital_status: str | None = None
    date_of_joining: date | None = None
    department: str | None = None
    designation: str | None = None
    manager_id: uuid.UUID | None = None
    employment_status: str | None = None
    work_location: str | None = None


class EmployeeCreate(EmployeeBase):
    initial_salary: float | None = None  # If provided, creates the first salary revision


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    mobile_number: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    marital_status: str | None = None
    date_of_joining: date | None = None
    department: str | None = None
    designation: str | None = None
    manager_id: uuid.UUID | None = None
    employment_status: str | None = None
    work_location: str | None = None


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
