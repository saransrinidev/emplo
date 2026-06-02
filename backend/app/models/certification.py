from datetime import date

from sqlalchemy import Date, Enum as SAEnum
from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import CertificationCategory, VerificationStatus


class Certification(Base, TimestampMixin):
    __tablename__ = "certifications"
    # expiry_date is queried heavily by dashboards (30/60/90 day reports).
    __table_args__ = (Index("ix_certifications_expiry_date", "expiry_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    certificate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    certificate_number: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[CertificationCategory] = mapped_column(
        SAEnum(CertificationCategory, name="certification_category"),
        default=CertificationCategory.other,
        nullable=False,
    )
    issued_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)  # nullable: "if applicable"
    file_url: Mapped[str | None] = mapped_column(String(1000))
    verification_status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus, name="certification_status"),
        default=VerificationStatus.uploaded,
        nullable=False,
    )

    employee: Mapped["Employee"] = relationship(  # noqa: F821
        back_populates="certifications"
    )
