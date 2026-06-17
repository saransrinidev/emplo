"""Alembic environment configuration.

Connects to the same database as the app and autogenerates migrations
from the SQLAlchemy models.
"""
import sys
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Add backend/ to sys.path so app is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings
from app.db.base import Base
from app.models import *  # noqa: F401,F403 — registers all models

settings = get_settings()

config = context.config

# Override sqlalchemy.url from app settings
config.set_main_option(
    "sqlalchemy.url",
    settings.database_url.replace("postgresql+psycopg://", "postgresql+psycopg2://"),
)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL without connecting)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connect to the database)."""
    connect_args = settings.sqlalchemy_connect_args
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = settings.database_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
