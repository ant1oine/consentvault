"""
Minimal seed script to ensure tests have a default organization, admin user, and API key.

Safe to run multiple times (idempotent).
"""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from apps.api.app.db.session import SessionLocal
from apps.api.app.models.organization import Organization, OrganizationStatus, DataRegion
from apps.api.app.models.user import User, UserRole
from apps.api.app.models.api_key import ApiKey, ApiKeyRole
from apps.api.app.core.security import hash_api_key, encrypt_field
from apps.api.app.core.config import settings
from apps.api.app.utils.ids import generate_ulid


def main():
    db = SessionLocal()
    
    try:
        # Ensure organization exists
        org = db.query(Organization).first()
        if not org:
            org = Organization(
                name="Test Org",
                data_region=DataRegion.KSA,
                status=OrganizationStatus.ACTIVE,
            )
            db.add(org)
            db.commit()
            db.refresh(org)
            print(f"✅ Created default org (id={org.id})")
        else:
            print(f"✅ Found existing org: {org.name} (id={org.id})")

        # Ensure admin user exists
        admin = db.query(User).filter(
            User.email == "admin@test.com",
            User.organization_id == org.id
        ).first()
        
        if not admin:
            admin = User(
                id=generate_ulid(),
                organization_id=org.id,
                email="admin@test.com",
                display_name="Test Admin",
                role=UserRole.ADMIN,
                active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("✅ Created admin user (admin@test.com / admin)")
        else:
            print("✅ Admin user already exists")

        # Ensure API key exists
        api_key = db.query(ApiKey).filter(
            ApiKey.organization_id == org.id
        ).first()
        
        if not api_key:
            plaintext_key = "test_api_key_12345"
            hashed_key = hash_api_key(plaintext_key)
            
            # Generate HMAC secret
            hmac_secret = "test_hmac_secret_12345"
            encrypted_hmac_secret = encrypt_field(hmac_secret, settings.master_encryption_key)
            
            api_key = ApiKey(
                organization_id=org.id,
                name="Test Key",
                hashed_key=hashed_key,
                hmac_secret=encrypted_hmac_secret,
                role=ApiKeyRole.ADMIN,
                active=True,
            )
            db.add(api_key)
            db.commit()
            print(f"✅ Created API key for tests ({plaintext_key})")
        else:
            print("✅ Existing API key found")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
