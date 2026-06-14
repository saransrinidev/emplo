import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class HolidayCalendarCreate(BaseModel):
    name: str
    region: str | None = None
    year: int


class HolidayCalendarOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    region: str | None = None
    year: int
    created_at: datetime
    updated_at: datetime


class HolidayCreate(BaseModel):
    calendar_id: uuid.UUID
    holiday_date: date
    name: str
    is_optional: bool = False


class HolidayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    calendar_id: uuid.UUID
    holiday_date: date
    name: str
    is_optional: bool
    created_at: datetime
    updated_at: datetime
