import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import CertificationCategory, VerificationStatus


class CertificationCreate(BaseModel):
    employee_id: uuid.UUID
    certificate_name: str
    certificate_number: str | None = None
    category: CertificationCategory = CertificationCategory.other
    issued_date: date | None = None
    expiry_date: date | None = None
    file_url: str | None = None


class CertificationUpdate(BaseModel):
    certificate_name: str | None = None
    certificate_number: str | None = None
    category: CertificationCategory | None = None
    issued_date: date | None = None
    expiry_date: date | None = None
    file_url: str | None = None
    verification_status: VerificationStatus | None = None


class CertificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    certificate_name: str
    certificate_number: str | None = None
    category: CertificationCategory
    issued_date: date | None = None
    expiry_date: date | None = None
    file_url: str | None = None
    verification_status: VerificationStatus
