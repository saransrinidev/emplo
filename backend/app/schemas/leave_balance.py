import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LeaveTypeCreate(BaseModel):
    name: str
    code: str
    default_annual_quota: float = 0
    is_paid: bool = True
    carry_forward: bool = False


class LeaveTypeUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    default_annual_quota: float | None = None
    is_paid: bool | None = None
    carry_forward: bool | None = None


class LeaveTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str
    default_annual_quota: float
    is_paid: bool
    carry_forward: bool
    created_at: datetime
    updated_at: datetime


class LeaveBalanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    leave_type_id: uuid.UUID
    year: int
    allocated: float
    used: float
    pending: float
    leave_type_name: str | None = None


class LeaveBalanceAllocate(BaseModel):
    employee_id: uuid.UUID
    leave_type_id: uuid.UUID
    year: int
    allocated: float
