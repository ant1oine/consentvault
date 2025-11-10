"""
Create a new user and attach to an organization.
- If no org exists → create one and make the user admin.
- If org exists → assign viewer role unless specified.
"""
import os
import sys

# Add both /app and /app/app to the Python path to ensure imports work in Docker
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.extend([
    os.path.abspath(os.path.join(base_dir, "..")),
    os.path.abspath(os.path.join(base_dir, "..", "app")),
])

from app.db import SessionLocal, User, Org, OrgUser
from app.security import hash_password


def print_error(msg):
    print(f"\033[91m❌ {msg}\033[0m")


def print_success(msg):
    print(f"\033[92m✅ {msg}\033[0m")


def main():
    if len(sys.argv) < 3:
        print_error("Usage: python create_user.py <email> <password> [role]")
        sys.exit(1)

    email = sys.argv[1].strip()
    password = sys.argv[2].strip()
    role = sys.argv[3].strip() if len(sys.argv) > 3 else None

    db = SessionLocal()

    if db.query(User).filter(User.email == email).first():
        print_error(f"User {email} already exists.")
        sys.exit(1)

    org = db.query(Org).first()
    if not org:
        org = Org(name="Default Organization")
        db.add(org)
        db.commit()
        db.refresh(org)
        print_success("Created default organization.")

    if not role:
        existing_admin = db.query(OrgUser).filter(OrgUser.role == "admin").first()
        role = "admin" if not existing_admin else "viewer"

    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)

    membership = OrgUser(org_id=org.id, user_id=user.id, role=role)
    db.add(membership)
    db.commit()

    print_success(f"Created user {email} as {role} in org '{org.name}'.")


if __name__ == "__main__":
    main()
