from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AddressType


class EmployeeAddress(Base, TimestampMixin):
    __tablename__ = "employee_addresses"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
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
