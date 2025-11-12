#!/usr/bin/env python3
"""Create an organization manually with audit logging."""
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + "/.."))
import secrets

from app.db import SessionLocal, Org
from app.services.audit_service import log_event


def main():
    name = input("Org Name: ").strip()
    region = input("Region (e.g. UAE): ").strip()
    
    db = SessionLocal()
    try:
        org = Org(name=name, region=region, api_key=secrets.token_hex(32))
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Use the org itself as the actor context
        log_event(
            db=db,
            actor=org,
            action="org_created",
            entity_type="org",
            entity_id=org.id,
            org_id=org.id,
            metadata={"org": name, "region": region, "org_id": str(org.id)}
        )
        
        print(f"✅ Created org {org.name} ({org.id})")
        print(f"   API Key: {org.api_key}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating org: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
