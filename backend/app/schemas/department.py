import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DepartmentCreate(BaseModel):
    name: str
    code: str
    head_employee_id: uuid.UUID | None = None
    is_active: bool = True


class DepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    head_employee_id: uuid.UUID | None = None
    is_active: bool | None = None


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str
    head_employee_id: uuid.UUID | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class DesignationCreate(BaseModel):
    title: str
    department_id: uuid.UUID | None = None
    level: int | None = None
    is_active: bool = True


class DesignationUpdate(BaseModel):
    title: str | None = None
    department_id: uuid.UUID | None = None
    level: int | None = None
    is_active: bool | None = None


class DesignationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    department_id: uuid.UUID | None = None
    level: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
