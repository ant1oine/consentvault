#!/usr/bin/env python3
"""Link a user to an organization."""
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + "/.."))

from app.db import SessionLocal, Org, User, OrgUser

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python link_user_to_org.py <user_email> <org_name> <role>")
        print("Example: python link_user_to_org.py user@test.com 'My Company' admin")
        print("Roles: admin, editor, viewer")
        sys.exit(1)

    user_email = sys.argv[1]
    org_name = sys.argv[2]
    role = sys.argv[3]

    if role not in ("admin", "editor", "viewer"):
        print(f"❌ Invalid role: {role}. Must be one of: admin, editor, viewer")
        sys.exit(1)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            print(f"❌ User not found: {user_email}")
            sys.exit(1)

        org = db.query(Org).filter(Org.name == org_name).first()
        if not org:
            print(f"❌ Organization not found: {org_name}")
            sys.exit(1)

        # Check if already linked
        existing = db.query(OrgUser).filter(
            OrgUser.org_id == org.id,
            OrgUser.user_id == user.id
        ).first()
        if existing:
            print(f"⚠️  User {user_email} is already linked to {org_name} as {existing.role}")
            sys.exit(0)

        membership = OrgUser(
            org_id=org.id,
            user_id=user.id,
            role=role,
        )
        db.add(membership)
        db.commit()
        print(f"✅ Linked {user_email} to {org_name} as {role}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error linking user to org: {e}")
        sys.exit(1)
    finally:
        db.close()

