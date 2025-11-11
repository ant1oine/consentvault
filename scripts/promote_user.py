#!/usr/bin/env python3
"""Promote a regular user to superadmin with audit logging."""
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + "/.."))

from app.db import SessionLocal, User
from app.utils.audit import record_audit


def main():
    email = input("User Email to promote: ").strip()
    
    if not email:
        print("❌ Email is required.")
        sys.exit(1)
    
    confirm = input(f"⚠️  Are you sure you want to promote {email} to superadmin? (yes/no): ").strip().lower()
    
    if confirm != "yes":
        print("❌ Cancelled.")
        sys.exit(0)
    
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        
        if not user:
            print(f"❌ No user found with email: {email}")
            sys.exit(1)
        
        if user.is_superadmin:
            print(f"⚠️  User {email} is already a superadmin.")
            db.close()
            sys.exit(0)
        
        user.is_superadmin = True
        db.commit()
        db.refresh(user)
        
        record_audit("user_promoted", "superadmin", {
            "user_email": email,
            "user_id": str(user.id)
        })
        
        print(f"✅ {email} has been promoted to superadmin")
    except Exception as e:
        db.rollback()
        print(f"❌ Error promoting user: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

