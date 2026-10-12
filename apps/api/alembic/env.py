"""Alembic environment configuration for F1 Race Intelligence."""

from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Import all ORM models so Alembic can detect schema changes via autogenerate.
# The side-effect of the import populates Base.metadata.
import sys

# Allow running alembic from the apps/api directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base  # noqa: E402  (after sys.path adjustment)
import models  # noqa: F401, E402 — registers all ORM models on Base.metadata

# ---------------------------------------------------------------------------
# Alembic Config object (provides access to values in alembic.ini)
# ---------------------------------------------------------------------------
config = context.config

# Interpret the config file for Python logging if present.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_database_url() -> str:
    """Resolve DATABASE_URL from environment, falling back to alembic.ini."""
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    return config.get_main_option("sqlalchemy.url", "")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine, though
    an Engine is acceptable here as well.  By skipping the Engine creation
    we don't need a DBAPI to be available.
    """
    url = _get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we create an Engine and associate a connection with the
    context.
    """
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
