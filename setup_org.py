#!/usr/bin/env python3
"""One-shot script to create organization and admin API key."""
import secrets
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from apps.api.app.db.session import SessionLocal
from apps.api.app.models.organization import Organization, OrganizationStatus, DataRegion
from apps.api.app.models.api_key import ApiKey
from apps.api.app.core.security import hash_api_key, encrypt_field
from apps.api.app.core.config import settings


def main():
    """Create organization and API key."""
    db = SessionLocal()
    try:
        # Check if organization already exists
        org = db.query(Organization).filter(
            Organization.name == "Default Organization"
        ).first()
        
        if org:
            print(f"Organization '{org.name}' already exists (ID: {org.id})")
            print("Creating new API key for existing organization...")
        else:
            # Create organization
            org = Organization(
                name="Default Organization",
                data_region=DataRegion.KSA,
                status=OrganizationStatus.ACTIVE,
            )
            db.add(org)
            db.commit()
            db.refresh(org)
            print(f"Created new organization: {org.name} (ID: {org.id})")

        # Generate API key
        plaintext_key = f"cv_{secrets.token_urlsafe(32)}"
        hashed_key = hash_api_key(plaintext_key)

        # Generate HMAC secret
        hmac_secret = secrets.token_urlsafe(32)
        encrypted_hmac_secret = encrypt_field(hmac_secret, settings.master_encryption_key)

        # Create API key
        api_key = ApiKey(
            organization_id=org.id,
            name="Admin Key",
            hashed_key=hashed_key,
            hmac_secret=encrypted_hmac_secret,
            active=True,
        )
        db.add(api_key)
        db.commit()

        print()
        print("=" * 60)
        print("API Key Created")
        print("=" * 60)
        print(f"Organization ID: {org.id}")
        print(f"Organization Name: {org.name}")
        print(f"Data Region: {org.data_region.value}")
        print()
        print("⚠️  API Key (save this - shown only once):")
        print(f"  {plaintext_key}")
        print()
        print("HMAC Secret (for request signing):")
        print(f"  {hmac_secret}")
        print("=" * 60)
    except Exception as e:
        db.rollback()
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()


