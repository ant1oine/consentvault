#!/usr/bin/env python3
"""Assign a user to an organization with audit logging."""
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + "/.."))

from app.db import SessionLocal, Org, User, OrgUser
from app.services.audit_service import log_event


def main():
    email = input("User Email to assign: ").strip()
    org_name = input("Org Name: ").strip()
    role = input("Role (admin/manager/viewer): ").strip()
    
    if role not in ("admin", "manager", "viewer", "editor"):
        print(f"❌ Invalid role: {role}. Must be one of: admin, manager, viewer, editor")
        sys.exit(1)
    
    db = SessionLocal()
    try:
        org = db.query(Org).filter_by(name=org_name).first()
        user = db.query(User).filter_by(email=email).first()
        
        if not org:
            print(f"❌ Org not found: {org_name}")
            sys.exit(1)
        
        if not user:
            print(f"❌ User not found: {email}")
            sys.exit(1)
        
        # Check if already linked
        existing = db.query(OrgUser).filter(
            OrgUser.org_id == org.id,
            OrgUser.user_id == user.id
        ).first()
        
        if existing:
            print(f"⚠️  User {email} is already linked to {org_name} as {existing.role}")
            sys.exit(0)
        
        org_user = OrgUser(org_id=org.id, user_id=user.id, role=role)
        db.add(org_user)
        db.commit()
        
        # Create a mock actor object for superadmin
        class SuperadminActor:
            def __init__(self, email):
                self.email = email
        
        actor = SuperadminActor("superadmin")
        log_event(
            db=db,
            actor=actor,
            action="user_assigned_to_org",
            entity_type="org_user",
            entity_id=org_user.id,
            org_id=org.id,
            metadata={
                "user": email,
                "org": org_name,
                "role": role,
                "org_id": str(org.id),
                "user_id": str(user.id)
            }
        )
        
        print(f"✅ Assigned {email} to {org_name} as {role}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error assigning user to org: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

