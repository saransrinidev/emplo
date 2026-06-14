import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import LeaveStatus, LeaveType


class LeaveRequestCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str | None = None

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start and v < start:
            raise ValueError("end_date must be on or after start_date")
        return v


class LeaveManagerAction(BaseModel):
    """Manager forwards or rejects the request."""
    action: str  # "forward" or "reject"
    remarks: str | None = None

    @field_validator("action")
    @classmethod
    def valid_action(cls, v: str) -> str:
        if v not in ("forward", "reject"):
            raise ValueError("action must be 'forward' or 'reject'")
        return v


class LeaveHRAction(BaseModel):
    """HR approves or rejects the request."""
    action: str  # "approve" or "reject"
    remarks: str | None = None

    @field_validator("action")
    @classmethod
    def valid_action(cls, v: str) -> str:
        if v not in ("approve", "reject"):
            raise ValueError("action must be 'approve' or 'reject'")
        return v


class LeaveRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str | None = None
    status: LeaveStatus
    manager_id: uuid.UUID | None = None
    manager_remarks: str | None = None
    hr_id: uuid.UUID | None = None
    hr_remarks: str | None = None
    created_at: datetime
    updated_at: datetime

    # Populated via join in responses
    employee_name: str | None = None
    department: str | None = None
