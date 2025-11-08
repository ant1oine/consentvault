"""Alembic environment configuration."""
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, text
from sqlalchemy.engine import Connection
from alembic import context
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from apps.api.app.db.base import Base

# Import all models to register them
from apps.api.app.models import *  # noqa: F401, F403

config = context.config

# Override sqlalchemy.url with DATABASE_URL from environment if available
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def pre_cleanup_stale_enums(engine):
    """
    Run before Alembic migrations start.
    Ensures that stale user-defined enum types (like userrole_enum)
    are dropped outside of the Alembic transactional context.
    """
    with engine.connect() as conn:
        print("🔍 Checking for stale enums before migration...")
        enums = conn.execute(
            text("""
                SELECT n.nspname, t.typname
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname ILIKE '%userrole%'
                AND n.nspname NOT IN ('pg_catalog', 'information_schema');
            """)
        ).fetchall()

        for schema, name in enums:
            print(f"⚠️  Dropping stale enum before migration: {schema}.{name}")
            conn.execute(text(f'DROP TYPE IF EXISTS "{schema}"."{name}" CASCADE;'))
        conn.commit()
        print("✅ Enum cleanup complete.")


def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    # 🧹 Clean stale enums *before* entering Alembic's transaction context
    pre_cleanup_stale_enums(connectable)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
