import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BankAccountCreate(BaseModel):
    employee_id: uuid.UUID
    account_holder_name: str
    bank_name: str
    account_number: str  # plaintext in; will be encrypted before storage
    ifsc_swift_code: str
    branch: str | None = None
    is_primary: bool = True


class BankAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    account_holder_name: str
    bank_name: str
    account_number_masked: str  # last 4 digits only
    ifsc_swift_code: str
    branch: str | None = None
    is_primary: bool
    created_at: datetime
    updated_at: datetime


class BankAccountUpdate(BaseModel):
    account_holder_name: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    ifsc_swift_code: str | None = None
    branch: str | None = None
    is_primary: bool | None = None
