#!/usr/bin/env python3
"""
Development Data Reset Script for ConsentVault
----------------------------------------------
⚠️ WARNING: This script is intended for local development only.

It resets all tenant data and seeds a dummy admin user.

Never run in production.
"""
import os
import sys
from contextlib import closing
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from sqlalchemy import create_engine, text

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


def print_colored(message: str, color: str = Colors.RESET) -> None:
    """Print colored message."""
    print(f"{color}{message}{Colors.RESET}")


def reset_dev_data() -> None:
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

    # Create engine
    engine = create_engine(database_url, pool_pre_ping=True)
    
    with closing(engine.connect()) as conn:
        org_id = None
        org_name = None
        
        # Operation 1: Find or create the latest organization
        try:
            print_colored("📊 Identifying latest organization...", Colors.BLUE)
            result = conn.execute(
                text("""
                    SELECT id, name
                    FROM organizations
                    ORDER BY created_at DESC
                    LIMIT 1
                """)
            )
            latest_org = result.fetchone()
            
            if not latest_org:
                print_colored("⚙️  No organizations found — creating default organization...", Colors.YELLOW)
                # Create default organization
                conn.execute(
                    text("""
                        INSERT INTO organizations (name, data_region, status, created_at)
                        VALUES ('Default Organization', 'KSA', 'active', NOW())
                        RETURNING id, name
                    """)
                )
                result = conn.execute(
                    text("""
                        SELECT id, name
                        FROM organizations
                        ORDER BY created_at DESC
                        LIMIT 1
                    """)
                )
                latest_org = result.fetchone()
                conn.commit()
            
            org_id, org_name = latest_org
            print_colored(f"✅ Keeping organization ID {org_id}", Colors.GREEN)
        except Exception as e:
            conn.rollback()
            print_colored(f"❌ Error identifying organization: {e}", Colors.RED)
            sys.exit(1)
        
        # Operation 2: Reassign API keys
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
        
        # Operation 3: Reassign users
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
            print_colored("🗑️  Deleting other organizations...", Colors.BLUE)
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
        
        # Operation 7: Seed default admin user
        if env == "development":
            try:
                print_colored("👤 Seeding default admin user...", Colors.BLUE)
                user_id = generate_ulid()
                conn.execute(
                    text("""
                        INSERT INTO users (id, organization_id, email, display_name, role, active, created_at, updated_at)
                        VALUES (:user_id, :org_id, :email, :display_name, :role, :active, NOW(), NOW())
                        ON CONFLICT (organization_id, email) DO NOTHING
                    """),
                    {
                        "user_id": user_id,
                        "org_id": org_id,
                        "email": "admin@example.com",
                        "display_name": "Admin User",
                        "role": "ADMIN",
                        "active": True,
                    }
                )
                conn.commit()
                print_colored(
                    "   ✅ Admin user seeded successfully: admin@example.com / role=ADMIN",
                    Colors.GREEN
                )
            except Exception as e:
                conn.rollback()
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
        print_colored("✅ Development data reset complete.", Colors.GREEN + Colors.BOLD)
        print_colored("📊 Remaining data summary:", Colors.CYAN)
        print_colored(f"  • Organizations: {org_count}", Colors.CYAN)
        print_colored(f"  • Users: {user_count}", Colors.CYAN)
        print_colored(f"  • API Keys: {api_key_count}", Colors.CYAN)


if __name__ == "__main__":
    try:
        reset_dev_data()
    except Exception as e:
        print_colored(f"❌ Fatal error: {e}", Colors.RED)
        import traceback
        traceback.print_exc()
        sys.exit(1)
