import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class EmployeeBankAccount(Base, UUIDMixin, TimestampMixin):
    """Employee bank account details (account number stored encrypted)."""

    __tablename__ = "employee_bank_accounts"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"),
        index=True, nullable=False
    )
    account_holder_name: Mapped[str] = mapped_column(String(150), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(150), nullable=False)
    account_number_enc: Mapped[str] = mapped_column(String(255), nullable=False)
    ifsc_swift_code: Mapped[str] = mapped_column(String(30), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(150))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
