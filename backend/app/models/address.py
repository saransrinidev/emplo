import uuid

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AddressType


class EmployeeAddress(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "employee_addresses"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    address_type: Mapped[AddressType] = mapped_column(
        SAEnum(AddressType, name="address_type"), nullable=False
    )
    address_line: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    country: Mapped[str | None] = mapped_column(String(100))

    employee: Mapped["Employee"] = relationship(back_populates="addresses")  # noqa: F821


class EmergencyContact(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "emergency_contacts"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    relationship_to: Mapped[str | None] = mapped_column("relationship", String(100))
    contact_number: Mapped[str | None] = mapped_column(String(20))

    employee: Mapped["Employee"] = relationship(  # noqa: F821
        back_populates="emergency_contacts"
    )
