#!/usr/bin/env python3
"""Fix database schema by adding missing columns if they don't exist."""
import os
import sys
import secrets

# Add both /app and /app/app to the Python path to ensure imports work in Docker
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.extend([
    os.path.abspath(os.path.join(base_dir, "..")),
    os.path.abspath(os.path.join(base_dir, "..", "app")),
])

from app.db import engine, SessionLocal, Org
from sqlalchemy import text

def fix_schema():
    """Add missing columns to orgs table if they don't exist."""
    with engine.connect() as conn:
        # Check and add region column
        try:
            conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='orgs' AND column_name='region'
                    ) THEN
                        ALTER TABLE orgs ADD COLUMN region VARCHAR(100) NOT NULL DEFAULT 'UAE';
                    END IF;
                END $$;
            """))
            conn.commit()
            print("✅ Added 'region' column to orgs table")
        except Exception as e:
            print(f"⚠️  Could not add region column: {e}")
            conn.rollback()

        # Check and add api_key column
        try:
            conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='orgs' AND column_name='api_key'
                    ) THEN
                        ALTER TABLE orgs ADD COLUMN api_key VARCHAR(64) UNIQUE;
                        CREATE INDEX IF NOT EXISTS ix_orgs_api_key ON orgs(api_key);
                    END IF;
                END $$;
            """))
            conn.commit()
            print("✅ Added 'api_key' column to orgs table")
        except Exception as e:
            print(f"⚠️  Could not add api_key column: {e}")
            conn.rollback()

    # Generate API keys for orgs that don't have them
    db = SessionLocal()
    try:
        orgs_without_keys = db.query(Org).filter(Org.api_key == None).all()
        for org in orgs_without_keys:
            org.api_key = secrets.token_hex(16)
            print(f"✅ Generated API key for org: {org.name}")
        db.commit()
    except Exception as e:
        print(f"⚠️  Could not generate API keys: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_schema()

