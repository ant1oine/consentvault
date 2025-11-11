#!/usr/bin/env python3
"""Create a regular user (non-superadmin) interactively with audit logging."""
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + "/.."))

from app.db import SessionLocal, User
from app.security import get_password_hash
from app.utils.audit import record_audit


def main():
    email = input("User Email: ").strip()
    password = input("Password: ").strip()
    
    if not email or not password:
        print("❌ Email and password are required.")
        sys.exit(1)
    
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"❌ User {email} already exists.")
            sys.exit(1)
        
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            is_superadmin=False  # Always False for safe interactive creation
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        record_audit("user_created", email, {"is_superadmin": False, "user_id": str(user.id)})
        
        print(f"✅ Created user {email}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating user: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

