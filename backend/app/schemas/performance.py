import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PerformanceReviewCreate(BaseModel):
    employee_id: uuid.UUID
    review_period: str | None = None
    review_date: date | None = None
    reviewer_id: uuid.UUID | None = None
    rating: Decimal | None = None
    strengths: str | None = None
    areas_for_improvement: str | None = None
    comments: str | None = None


class PerformanceReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    review_period: str | None = None
    review_date: date | None = None
    reviewer_name: str | None = None
    rating: Decimal | None = None
    strengths: str | None = None
    areas_for_improvement: str | None = None
    comments: str | None = None
