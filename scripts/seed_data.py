"""
Seed initial data: organizations and users.
Can be safely re-run (skips if already exists).
"""
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + "/.."))
import secrets

from app.db import SessionLocal, Org, OrgMember


def print_info(msg):
    print(f"\033[94mℹ️  {msg}\033[0m")


def print_success(msg):
    print(f"\033[92m✅ {msg}\033[0m")


def print_error(msg):
    print(f"\033[91m❌ {msg}\033[0m")


def main():
    """Seed organizations and users."""
    db = SessionLocal()

    # Organizations to create
    orgs_data = [
        {"name": "Wellness Clinics UAE", "region": "UAE"},
        {"name": "CloudServe Technologies", "region": "UAE"},
    ]

    # Users to create
    users_data = [
        {
            "org": "Wellness Clinics UAE",
            "email": "mariam.alzahra@wellnessuae.ae",
            "name": "Mariam Al Zahra",
            "role": "patient",
        },
        {
            "org": "Wellness Clinics UAE",
            "email": "omar.khalid@wellnessuae.ae",
            "name": "Omar Khalid",
            "role": "patient",
        },
        {
            "org": "CloudServe Technologies",
            "email": "ahmed.rahman@cloudserve.ae",
            "name": "Ahmed Rahman",
            "role": "subscriber",
        },
    ]

    # Create organizations
    org_map = {}
    for org_data in orgs_data:
        existing = db.query(Org).filter(Org.name == org_data["name"]).first()
        if existing:
            print_info(f"Organization '{org_data['name']}' already exists, skipping.")
            org_map[org_data["name"]] = existing
        else:
            # Generate secure API key
            api_key = secrets.token_hex(16)
            org = Org(
                name=org_data["name"],
                region=org_data["region"],
                api_key=api_key,
            )
            db.add(org)
            db.commit()
            db.refresh(org)
            org_map[org_data["name"]] = org
            print_success(f"Seeded {org.name}")
            print(f"  ID: {org.id}")
            print(f"  API Key: {org.api_key}")

    # Create users
    for user_data in users_data:
        org = org_map.get(user_data["org"])
        if not org:
            print_error(f"Organization '{user_data['org']}' not found, skipping user {user_data['email']}")
            continue

        existing = (
            db.query(OrgMember)
            .filter(
                OrgMember.org_id == org.id,
                OrgMember.email == user_data["email"],
            )
            .first()
        )
        if existing:
            print_info(f"User '{user_data['email']}' already exists for '{org.name}', skipping.")
        else:
            user = OrgMember(
                org_id=org.id,
                email=user_data["email"],
                name=user_data["name"],
                role=user_data["role"],
            )
            db.add(user)
            db.commit()
            print_success(f"Created user: {user_data['name']} ({user_data['email']}) in {org.name}")

    db.close()
    print_success("Seed data completed!")


if __name__ == "__main__":
    main()

