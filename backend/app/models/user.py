from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    """Authentication record, kept separate from the employee HR record."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), unique=True, nullable=True
    )

    role: Mapped["Role"] = relationship(back_populates="users")  # noqa: F821
    employee: Mapped["Employee | None"] = relationship(  # noqa: F821
        back_populates="user"
    )
