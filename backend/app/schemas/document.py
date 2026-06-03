import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import DocumentType, VerificationStatus


class DocumentCreate(BaseModel):
    employee_id: uuid.UUID
    document_name: str | None = None
    document_type: DocumentType
    file_url: str


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    document_name: str | None = None
    document_type: DocumentType
    file_url: str
    status: VerificationStatus
    created_at: datetime


class VerifyRequest(BaseModel):
    status: VerificationStatus
