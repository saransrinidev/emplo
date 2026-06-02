"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-02

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- roles ---
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "name",
            sa.Enum("employee", "manager", "hr_admin", name="role_name"),
            nullable=False,
            unique=True,
        ),
        sa.Column("description", sa.String(length=255), nullable=True),
    )

    # --- employees (self-referential manager_id) ---
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_code", sa.String(length=50), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("mobile_number", sa.String(length=20), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("marital_status", sa.String(length=20), nullable=True),
        sa.Column("date_of_joining", sa.Date(), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("designation", sa.String(length=100), nullable=True),
        sa.Column("manager_id", sa.Integer(), nullable=True),
        sa.Column("employment_status", sa.String(length=50), nullable=True),
        sa.Column("work_location", sa.String(length=100), nullable=True),
        sa.Column("emergency_contact_name", sa.String(length=255), nullable=True),
        sa.Column("emergency_contact_relationship", sa.String(length=100), nullable=True),
        sa.Column("emergency_contact_number", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["manager_id"], ["employees.id"]),
    )
    op.create_index("ix_employees_employee_code", "employees", ["employee_code"], unique=True)
    op.create_index("ix_employees_email", "employees", ["email"])

    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # --- employee_addresses ---
    op.create_table(
        "employee_addresses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column(
            "address_type",
            sa.Enum("current", "permanent", name="address_type"),
            nullable=False,
        ),
        sa.Column("address_line", sa.String(length=500), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_employee_addresses_employee_id", "employee_addresses", ["employee_id"])

    # --- documents ---
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column(
            "document_type",
            sa.Enum("school", "intermediate", "degree", "transcript", "other", name="document_type"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("file_url", sa.String(length=1000), nullable=False),
        sa.Column(
            "status",
            sa.Enum("uploaded", "verified", "rejected", name="document_status"),
            nullable=False,
            server_default="uploaded",
        ),
        sa.Column("verified_by", sa.Integer(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["verified_by"], ["users.id"]),
    )
    op.create_index("ix_documents_employee_id", "documents", ["employee_id"])

    # --- certifications ---
    op.create_table(
        "certifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("certificate_name", sa.String(length=255), nullable=False),
        sa.Column("certificate_number", sa.String(length=100), nullable=True),
        sa.Column(
            "category",
            sa.Enum("microsoft", "aws", "azure", "scrum", "power_bi", "other", name="certification_category"),
            nullable=False,
            server_default="other",
        ),
        sa.Column("issued_date", sa.Date(), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("file_url", sa.String(length=1000), nullable=True),
        sa.Column(
            "verification_status",
            sa.Enum("uploaded", "verified", "rejected", name="certification_status"),
            nullable=False,
            server_default="uploaded",
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_certifications_employee_id", "certifications", ["employee_id"])
    op.create_index("ix_certifications_expiry_date", "certifications", ["expiry_date"])

    # --- salary_revisions ---
    op.create_table(
        "salary_revisions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("previous_salary", sa.Numeric(14, 2), nullable=True),
        sa.Column("revised_salary", sa.Numeric(14, 2), nullable=False),
        sa.Column("revision_percentage", sa.Numeric(6, 2), nullable=True),
        sa.Column("comments", sa.String(length=1000), nullable=True),
        sa.Column(
            "approval_status",
            sa.Enum("pending", "approved", "rejected", name="salary_approval_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
    )
    op.create_index("ix_salary_revisions_employee_id", "salary_revisions", ["employee_id"])

    # --- performance_reviews ---
    op.create_table(
        "performance_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("review_period", sa.String(length=100), nullable=True),
        sa.Column("review_date", sa.Date(), nullable=True),
        sa.Column("reviewer_id", sa.Integer(), nullable=True),
        sa.Column("rating", sa.Numeric(4, 2), nullable=True),
        sa.Column("strengths", sa.String(length=2000), nullable=True),
        sa.Column("areas_for_improvement", sa.String(length=2000), nullable=True),
        sa.Column("comments", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["employees.id"]),
    )
    op.create_index("ix_performance_reviews_employee_id", "performance_reviews", ["employee_id"])

    # --- employee_edit_permissions ---
    op.create_table(
        "employee_edit_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column(
            "section",
            sa.Enum("address", "phone", "certifications", name="editable_section"),
            nullable=False,
        ),
        sa.Column("granted_by", sa.Integer(), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expiry_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["granted_by"], ["users.id"]),
    )
    op.create_index(
        "ix_employee_edit_permissions_employee_id", "employee_edit_permissions", ["employee_id"]
    )

    # --- audit_logs ---
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=100), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("changes", postgresql.JSONB(), nullable=True),
        sa.Column("approval_status", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )

    # --- notifications ---
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "certification_expiry",
                "missing_documents",
                "permission_granted",
                "permission_expiring",
                "salary_revision_completed",
                "performance_review_published",
                name="notification_type",
            ),
            nullable=False,
        ),
        sa.Column("message", sa.String(length=1000), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("audit_logs")
    op.drop_table("employee_edit_permissions")
    op.drop_table("performance_reviews")
    op.drop_table("salary_revisions")
    op.drop_table("certifications")
    op.drop_table("documents")
    op.drop_table("employee_addresses")
    op.drop_table("users")
    op.drop_table("employees")
    op.drop_table("roles")

    # Drop enum types created by the tables above.
    for enum_name in (
        "notification_type",
        "editable_section",
        "salary_approval_status",
        "certification_status",
        "certification_category",
        "document_status",
        "address_type",
        "role_name",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
