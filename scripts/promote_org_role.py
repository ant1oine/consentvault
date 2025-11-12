#!/usr/bin/env python3
"""Promote or demote user role within an organization with audit logging."""
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + "/.."))

from app.db import SessionLocal, Org, User, OrgUser
from app.services.audit_service import log_event


def main():
    db = SessionLocal()
    try:
        print("Available orgs:")
        orgs = db.query(Org).all()
        if not orgs:
            print("❌ No organizations found.")
            sys.exit(1)
        
        for org in orgs:
            print(f"  - {org.name}")
        
        org_name = input("\nOrg Name: ").strip()
        org = db.query(Org).filter_by(name=org_name).first()
        
        if not org:
            print(f"❌ Org not found: {org_name}")
            sys.exit(1)
        
        print("\nAvailable users in this org:")
        org_users = db.query(OrgUser).filter_by(org_id=org.id).all()
        if not org_users:
            print("❌ No users linked to this org yet.")
            sys.exit(1)
        
        for ou in org_users:
            user = db.get(User, ou.user_id)
            if user:
                print(f"  - {user.email} ({ou.role})")
        
        email = input("\nUser Email to promote/demote: ").strip()
        new_role = input("New role (viewer/manager/admin): ").strip().lower()
        
        if new_role not in ["viewer", "manager", "admin", "editor"]:
            print("❌ Invalid role. Must be viewer, manager, admin, or editor.")
            sys.exit(1)
        
        user = db.query(User).filter_by(email=email).first()
        if not user:
            print(f"❌ User not found: {email}")
            sys.exit(1)
        
        org_user = db.query(OrgUser).filter_by(org_id=org.id, user_id=user.id).first()
        if not org_user:
            print(f"❌ {email} is not assigned to {org_name}.")
            sys.exit(1)
        
        old_role = org_user.role
        if old_role == new_role:
            print(f"⚠️  User {email} already has role {new_role} in {org_name}.")
            db.close()
            sys.exit(0)
        
        org_user.role = new_role
        db.commit()
        
        # Create a mock actor object for superadmin
        class SuperadminActor:
            def __init__(self, email):
                self.email = email
        
        actor = SuperadminActor("superadmin")
        log_event(
            db=db,
            actor=actor,
            action="user_role_changed",
            entity_type="org_user",
            entity_id=org_user.id,
            org_id=org.id,
            metadata={
                "user_email": email,
                "org": org_name,
                "old_role": old_role,
                "new_role": new_role,
                "org_id": str(org.id),
                "user_id": str(user.id)
            }
        )
        
        print(f"✅ Updated {email} in {org_name}: {old_role} → {new_role}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error changing user role: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

