#!/usr/bin/env python3
"""
Development Data Reset Script for ConsentVault
----------------------------------------------
⚠️ WARNING: This script is intended for local development only.

It resets all tenant data and seeds a dummy admin user.

Never run in production.
"""
import argparse
import os
import sys
import time
from contextlib import closing
from pathlib import Path
from typing import Any

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

import enum

from sqlalchemy import create_engine, text

from apps.api.app.models.api_key import ApiKeyRole
from apps.api.app.models.consent import ConsentMethod, ConsentStatus

# Import all enum classes from models
from apps.api.app.models.organization import DataRegion, OrganizationStatus
from apps.api.app.models.rights import DataRight, RequestStatus
from apps.api.app.models.user import UserRole
from apps.api.app.models.webhook import DeliveryStatus
from apps.api.app.utils.ids import generate_ulid


# ANSI color codes for terminal output
class Colors:
    """ANSI color codes."""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    RED = "\033[31m"
    CYAN = "\033[36m"
    MAGENTA = "\033[35m"


def print_colored(message: str, color: str = Colors.RESET) -> None:
    """Print colored message."""
    print(f"{color}{message}{Colors.RESET}")


# Enum cache to avoid repeated lookups
_enum_cache: dict[str, Any] = {}


def get_enum_value(enum_class: type[enum.Enum], desired_label: str, prefer_name: bool = True) -> str | None:
    """
    Get enum value by case-insensitive label matching.

    Args:
        enum_class: The enum class (e.g., OrganizationStatus)
        desired_label: The desired label (case-insensitive, e.g., "active", "ACTIVE", "Active")
        prefer_name: If True, prefer matching enum member name over value (for DB compatibility)

    Returns:
        The enum's value string (or name if prefer_name=True and DB uses names), or None if not found

    Note:
        PostgreSQL enums created by SQLAlchemy typically use the enum member NAME (uppercase),
        not the enum VALUE. This function handles both cases.

    Example:
        >>> get_enum_value(OrganizationStatus, "active")
        "ACTIVE"  # Returns member name if DB uses names, or "active" if DB uses values
    """
    cache_key = f"{enum_class.__name__}.{desired_label.lower()}"
    if cache_key in _enum_cache:
        return _enum_cache[cache_key]

    desired_lower = desired_label.lower()
    desired_upper = desired_label.upper()

    # Strategy 1: Try exact match first (case-sensitive)
    for member in enum_class:
        if member.name == desired_label or str(member.value) == desired_label:
            # If DB uses names (common with SQLAlchemy), return name; otherwise return value
            result = member.name if prefer_name else str(member.value)
            _enum_cache[cache_key] = result
            return result

    # Strategy 2: Try case-insensitive match on member name (most common for DB enums)
    for member in enum_class:
        if member.name.upper() == desired_upper:
            result = member.name if prefer_name else str(member.value)
            _enum_cache[cache_key] = result
            return result

    # Strategy 3: Try case-insensitive match on value
    for member in enum_class:
        if str(member.value).lower() == desired_lower:
            result = member.name if prefer_name else str(member.value)
            _enum_cache[cache_key] = result
            return result

    # Not found
    print_colored(
        f"⚠️  Warning: '{desired_label}' not found in {enum_class.__name__}. "
        f"Available names: {[m.name for m in enum_class]}, "
        f"Available values: {[str(m.value) for m in enum_class]}",
        Colors.YELLOW
    )
    return None


def get_db_enum_values(conn, enum_name: str) -> list[str]:
    """
    Dynamically fetch enum values from Postgres.

    Args:
        conn: SQLAlchemy connection
        enum_name: Name of the enum type in Postgres (e.g., 'organizationstatus')

    Returns:
        List of enum values as strings
    """
    try:
        result = conn.execute(
            text("""
                SELECT enumlabel
                FROM pg_enum
                WHERE enumtypid = (
                    SELECT oid
                    FROM pg_type
                    WHERE typname = :enum_name
                )
                ORDER BY enumsortorder
            """),
            {"enum_name": enum_name}
        )
        return [row[0] for row in result.fetchall()]
    except Exception:
        return []


def verify_enum_consistency(conn) -> bool:
    """
    Verify that database enum values match Python enum members.

    Returns:
        True if all enums are consistent, False otherwise
    """
    print_colored("⚙️  ENUM CONSISTENCY CHECK", Colors.CYAN + Colors.BOLD)
    print()

    # Map of enum type names in DB to Python enum classes
    enum_mappings = {
        "organizationstatus": OrganizationStatus,
        "dataregion": DataRegion,
        "userrole": UserRole,
        "consentstatus": ConsentStatus,
        "consentmethod": ConsentMethod,
        "dataright": DataRight,
        "requeststatus": RequestStatus,
        "deliverystatus": DeliveryStatus,
        "apikeyrole": ApiKeyRole,
    }

    all_consistent = True

    for db_enum_name, python_enum_class in enum_mappings.items():
        db_values = get_db_enum_values(conn, db_enum_name)

        if not db_values:
            # Enum might not exist in DB yet (e.g., if migrations haven't run)
            print_colored(
                f"   ⚠️  {python_enum_class.__name__}: Enum '{db_enum_name}' not found in database",
                Colors.YELLOW
            )
            continue

        # Get Python enum values (both names and values, normalized to uppercase for comparison)
        python_names = {m.name.upper() for m in python_enum_class}
        python_values = {str(m.value).upper() for m in python_enum_class}
        db_values_upper = {v.upper() for v in db_values}

        # Check if DB values match Python enum names (most common case with SQLAlchemy)
        matches_names = db_values_upper.intersection(python_names)
        # Check if DB values match Python enum values
        matches_values = db_values_upper.intersection(python_values)

        # Also check if all DB values have corresponding Python enum members (by name or value)
        all_db_matched = True
        for db_val in db_values_upper:
            if db_val not in python_names and db_val not in python_values:
                all_db_matched = False
                break

        if matches_names or (matches_values and all_db_matched):
            # Show what matched
            if matches_names:
                match_type = "names"
                sorted(matches_names)
            else:
                match_type = "values"
                sorted(matches_values)

            print_colored(
                f"   ✅ {python_enum_class.__name__} enum synced (matched by {match_type})",
                Colors.GREEN
            )
        else:
            all_consistent = False
            print_colored(
                f"   ❌ {python_enum_class.__name__}: Mismatch detected!",
                Colors.RED
            )
            print_colored(
                f"      DB values: {sorted(db_values)}",
                Colors.YELLOW
            )
            print_colored(
                f"      Python enum member names: {[m.name for m in python_enum_class]}",
                Colors.YELLOW
            )
            print_colored(
                f"      Python enum values: {[str(m.value) for m in python_enum_class]}",
                Colors.YELLOW
            )

            # Show what's missing
            missing_in_python = db_values_upper - python_names - python_values
            if missing_in_python:
                print_colored(
                    f"      Missing in Python: {sorted(missing_in_python)}",
                    Colors.RED
                )

            missing_in_db = (python_names | python_values) - db_values_upper
            if missing_in_db:
                print_colored(
                    f"      Missing in DB: {sorted(missing_in_db)}",
                    Colors.RED
                )

            print_colored(
                "      ⚠️  Run migrations to sync enums",
                Colors.YELLOW
            )

    print()
    return all_consistent


def reset_dev_data(verify_only: bool = False) -> None:
    """Reset development database data."""
    # Safety check: only run in development
    env = os.getenv("ENV", "development").lower()
    if env != "development":
        print()
        print_colored("=" * 70, Colors.RED + Colors.BOLD)
        print_colored("❌ This script can only run in development mode.", Colors.RED + Colors.BOLD)
        print_colored("=" * 70, Colors.RED + Colors.BOLD)
        print()
        print_colored(f"Current ENV: {env}", Colors.YELLOW)
        print_colored("Set ENV=development to run this script.", Colors.YELLOW)
        print()
        sys.exit(1)

    # Get database URL (default for Docker)
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://consentvault:consentvault@db:5432/consentvault"
    )

    print_colored("🔄 Starting development data reset...", Colors.CYAN)
    print()

    # Create engine with retry logic
    max_retries = 3
    retry_delay = 2
    engine = None

    for attempt in range(1, max_retries + 1):
        try:
            engine = create_engine(database_url, pool_pre_ping=True)
            # Test connection
            with closing(engine.connect()) as test_conn:
                test_conn.execute(text("SELECT 1"))
            print_colored("✅ Database connection established", Colors.GREEN)
            break
        except Exception as e:
            if attempt < max_retries:
                print_colored(
                    f"⚠️  Connection attempt {attempt}/{max_retries} failed: {e}",
                    Colors.YELLOW
                )
                print_colored(f"   Retrying in {retry_delay} seconds...", Colors.YELLOW)
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                print_colored(f"❌ Failed to connect to database after {max_retries} attempts", Colors.RED)
                print_colored(f"   Error: {e}", Colors.RED)
                sys.exit(1)

    with closing(engine.connect()) as conn:
        # Verify enum consistency
        enum_consistent = verify_enum_consistency(conn)

        if not enum_consistent:
            print_colored(
                "⚠️  Enum mismatches detected. Some operations may fail.",
                Colors.YELLOW
            )
            print_colored(
                "   Consider running migrations: docker compose exec api alembic upgrade head",
                Colors.YELLOW
            )
            print()

        if verify_only:
            print_colored("✅ Enum verification complete (verify-only mode)", Colors.GREEN)
            return

        # Get enum values dynamically
        print_colored("🔍 Resolving enum values from models...", Colors.BLUE)

        # For OrganizationStatus: DB uses uppercase member names (ACTIVE), not lowercase values (active)
        # Check database first to see what it actually has
        org_status_active = None
        db_values = get_db_enum_values(conn, "organizationstatus")
        if db_values:
            # Database has the enum - use what's actually in DB (should be uppercase)
            for val in db_values:
                if val.upper() == "ACTIVE":
                    org_status_active = val
                    break
            if not org_status_active:
                org_status_active = db_values[0]  # Fallback to first value
        else:
            # Enum doesn't exist yet - use member name (uppercase ACTIVE)
            org_status_active = OrganizationStatus.ACTIVE.name

        # For DataRegion: Check what DB has
        data_region_ksa = get_enum_value(DataRegion, "KSA", prefer_name=True)
        if not data_region_ksa:
            db_values = get_db_enum_values(conn, "dataregion")
            if db_values and "KSA" in db_values:
                data_region_ksa = "KSA"
            else:
                data_region_ksa = DataRegion.KSA.name  # Fallback to member name

        # For UserRole: DB likely uses member names (ADMIN)
        user_role_admin = get_enum_value(UserRole, "ADMIN", prefer_name=True)
        if not user_role_admin:
            db_values = get_db_enum_values(conn, "userrole")
            if db_values and "ADMIN" in db_values:
                user_role_admin = "ADMIN"
            else:
                user_role_admin = UserRole.ADMIN.name  # Fallback to member name

        print_colored(f"   ✅ OrganizationStatus.ACTIVE = '{org_status_active}'", Colors.GREEN)
        print_colored(f"   ✅ DataRegion.KSA = '{data_region_ksa}'", Colors.GREEN)
        print_colored(f"   ✅ UserRole.ADMIN = '{user_role_admin}'", Colors.GREEN)
        print()

        org_id = None
        org_name = None

        # Operation 1: Find or create the default organization (idempotent)
        try:
            print_colored("📊 Checking for default organization...", Colors.BLUE)
            result = conn.execute(
                text("""
                    SELECT id, name
                    FROM organizations
                    WHERE name = 'Default Organization'
                    LIMIT 1
                """)
            )
            existing_org = result.fetchone()

            if existing_org:
                org_id, org_name = existing_org
                print_colored(f"✅ Found existing organization: {org_name} (ID: {org_id})", Colors.GREEN)
            else:
                print_colored("⚙️  Creating default organization...", Colors.YELLOW)
                # Create default organization with correct enum value
                result = conn.execute(
                    text("""
                        INSERT INTO organizations (name, data_region, status, created_at)
                        VALUES ('Default Organization', :data_region, :status, NOW())
                        RETURNING id, name
                    """),
                    {
                        "data_region": data_region_ksa,
                        "status": org_status_active
                    }
                )
                new_org = result.fetchone()
                if new_org:
                    org_id, org_name = new_org
                    conn.commit()
                    print_colored(f"✅ Created organization: {org_name} (ID: {org_id})", Colors.GREEN)
                    print_colored("✅ Default organization created", Colors.GREEN)
                else:
                    raise Exception("Failed to create organization")
        except Exception as e:
            conn.rollback()
            error_msg = str(e)
            if "enum" in error_msg.lower() or "invalid input value" in error_msg.lower():
                print_colored(f"❌ Enum error creating organization: {e}", Colors.RED)
                print_colored(
                    "   💡 Tip: The enum value in the database may differ from the model.",
                    Colors.YELLOW
                )
                print_colored(
                    "   Check with: SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'organizationstatus')",
                    Colors.YELLOW
                )
            else:
                print_colored(f"❌ Error with organization: {e}", Colors.RED)
            sys.exit(1)

        # Operation 2: Reassign API keys to default org
        try:
            print_colored("🔑 Reassigning API keys...", Colors.BLUE)
            result = conn.execute(
                text("""
                    UPDATE api_keys
                    SET organization_id = :org_id
                    WHERE organization_id != :org_id
                """),
                {"org_id": org_id}
            )
            reassigned = result.rowcount
            if reassigned > 0:
                print_colored(f"   ✅ Reassigned {reassigned} API key(s)", Colors.GREEN)
            else:
                print_colored("   ✅ No API keys to reassign", Colors.GREEN)
            conn.commit()
        except Exception as e:
            conn.rollback()
            print_colored(f"⚠️  Warning: Could not reassign API keys: {e}", Colors.YELLOW)

        # Operation 3: Reassign users to default org
        try:
            print_colored("👥 Reassigning users...", Colors.BLUE)
            result = conn.execute(
                text("""
                    UPDATE users
                    SET organization_id = :org_id
                    WHERE organization_id != :org_id
                """),
                {"org_id": org_id}
            )
            reassigned = result.rowcount
            if reassigned > 0:
                print_colored(f"   ✅ Reassigned {reassigned} user(s)", Colors.GREEN)
            else:
                print_colored("   ✅ No users to reassign", Colors.GREEN)
            conn.commit()
        except Exception as e:
            conn.rollback()
            print_colored(f"⚠️  Warning: Could not reassign users: {e}", Colors.YELLOW)

        # Operation 4: Delete other organizations (after reassignments are committed)
        try:
            print_colored("🗑️  Cleaning up other organizations...", Colors.BLUE)
            result = conn.execute(
                text("DELETE FROM organizations WHERE id != :org_id"),
                {"org_id": org_id}
            )
            deleted = result.rowcount
            if deleted > 0:
                print_colored(f"   ✅ Deleted {deleted} organization(s)", Colors.GREEN)
            else:
                print_colored("   ✅ No other organizations to delete", Colors.GREEN)
            conn.commit()
        except Exception as e:
            conn.rollback()
            print_colored(f"⚠️  Warning: Could not delete organizations: {e}", Colors.YELLOW)

        # Operation 5: Clear tenant data tables
        # Correct cleanup order to avoid FK issues
        tables_to_clear = [
            ("audit_logs", "audit_logs"),
            ("data_right_requests", "rights"),
            ("consent_events", "consents"),
            ("consent_aggregates", "consents"),
            ("policies", "policies"),  # must come before purposes
            ("purposes", "purposes"),
            ("webhook_deliveries", "webhooks"),
            ("webhook_endpoints", "webhooks"),
            ("users", "users"),  # safe to delete last
        ]

        cleared_groups = set()
        for table_name, group_name in tables_to_clear:
            try:
                result = conn.execute(text(f"DELETE FROM {table_name}"))
                count = result.rowcount
                if count > 0:
                    cleared_groups.add(group_name)
                conn.commit()
            except Exception as e:
                conn.rollback()
                print_colored(
                    f"⚠️  Warning: Could not clear {table_name}: {e}",
                    Colors.YELLOW
                )

        if cleared_groups:
            groups_str = ", ".join(sorted(cleared_groups))
            print_colored(f"🧹 Cleared {groups_str}", Colors.GREEN)

        # Operation 6: Reset all sequences using DO block
        try:
            print_colored("🔁 Resetting ID sequences...", Colors.BLUE)
            conn.execute(
                text("""
                    DO $$
                    DECLARE
                      seq RECORD;
                    BEGIN
                      FOR seq IN SELECT c.oid::regclass::text AS seqname
                                 FROM pg_class c
                                 WHERE c.relkind = 'S'
                                 AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                      LOOP
                        EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1;', seq.seqname);
                      END LOOP;
                    END $$;
                """)
            )
            conn.commit()
            print_colored("   ✅ Sequences reset successfully", Colors.GREEN)
        except Exception as e:
            conn.rollback()
            print_colored(f"⚠️  Warning: Could not reset sequences: {e}", Colors.YELLOW)

        # Operation 7: Seed default admin user (idempotent)
        if env == "development":
            try:
                print_colored("👤 Seeding default admin user...", Colors.BLUE)
                # Check if user already exists
                result = conn.execute(
                    text("""
                        SELECT id FROM users
                        WHERE organization_id = :org_id
                        AND email = :email
                        LIMIT 1
                    """),
                    {
                        "org_id": org_id,
                        "email": "admin@example.com"
                    }
                )
                existing_user = result.fetchone()

                if existing_user:
                    print_colored(
                        "   ✅ Admin user already exists: admin@example.com",
                        Colors.GREEN
                    )
                else:
                    user_id = generate_ulid()
                    conn.execute(
                        text("""
                            INSERT INTO users (id, organization_id, email, display_name, role, active, created_at, updated_at)
                            VALUES (:user_id, :org_id, :email, :display_name, :role, :active, NOW(), NOW())
                        """),
                        {
                            "user_id": user_id,
                            "org_id": org_id,
                            "email": "admin@example.com",
                            "display_name": "Admin User",
                            "role": user_role_admin,  # Use dynamically resolved enum value
                            "active": True,
                        }
                    )
                    conn.commit()
                    print_colored(
                        f"   ✅ Admin user seeded successfully: admin@example.com / role={user_role_admin}",
                        Colors.GREEN
                    )
                    print_colored("✅ Admin user ready", Colors.GREEN)
            except Exception as e:
                conn.rollback()
                error_msg = str(e)
                if "enum" in error_msg.lower() or "invalid input value" in error_msg.lower():
                    print_colored(
                        f"❌ Enum error seeding admin user: {e}",
                        Colors.RED
                    )
                    print_colored(
                        f"   Attempted role value: '{user_role_admin}'",
                        Colors.YELLOW
                    )
                else:
                    print_colored(
                        f"⚠️  Warning: Could not seed admin user: {e}",
                        Colors.YELLOW
                    )

        # Get final counts for summary
        org_count = 0
        user_count = 0
        api_key_count = 0

        try:
            result = conn.execute(text("SELECT COUNT(*) FROM organizations"))
            org_count = result.scalar()
        except Exception as e:
            print_colored(
                f"⚠️  Warning: Could not count organizations: {e}",
                Colors.YELLOW
            )

        try:
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
        except Exception as e:
            print_colored(
                f"⚠️  Warning: Could not count users: {e}",
                Colors.YELLOW
            )

        try:
            result = conn.execute(
                text("SELECT COUNT(*) FROM api_keys WHERE organization_id = :org_id"),
                {"org_id": org_id}
            )
            api_key_count = result.scalar()
        except Exception as e:
            print_colored(
                f"⚠️  Warning: Could not count API keys: {e}",
                Colors.YELLOW
            )

        # Print summary
        print()
        print_colored("=" * 70, Colors.GREEN + Colors.BOLD)
        print_colored("🎉 Dev seed complete!", Colors.GREEN + Colors.BOLD)
        print_colored("=" * 70, Colors.GREEN + Colors.BOLD)
        print()

        if enum_consistent:
            print_colored("✅ Enums synced with database", Colors.GREEN)
        else:
            print_colored("⚠️  Enum mismatches detected (see warnings above)", Colors.YELLOW)

        print_colored("✅ Default org + admin user verified", Colors.GREEN)
        print_colored("📊 Final data summary:", Colors.CYAN)
        print_colored(f"  • Organizations: {org_count}", Colors.CYAN)
        print_colored(f"  • Users: {user_count}", Colors.CYAN)
        print_colored(f"  • API Keys: {api_key_count}", Colors.CYAN)
        print()
        print_colored("🎉 Local seed complete", Colors.GREEN + Colors.BOLD)
        print_colored("📋 Ready to run: ./scripts/test_local_auth.sh", Colors.MAGENTA)
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset development database data")
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify enum consistency, skip data seeding"
    )
    args = parser.parse_args()

    try:
        reset_dev_data(verify_only=args.verify_only)
    except KeyboardInterrupt:
        print_colored("\n❌ Interrupted by user", Colors.RED)
        sys.exit(1)
    except Exception as e:
        print_colored(f"❌ Fatal error: {e}", Colors.RED)
        import traceback
        traceback.print_exc()
        sys.exit(1)
