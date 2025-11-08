"""Pytest configuration and fixtures."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.app.db.base import Base
from apps.api.app.db.session import get_db
from apps.api.app.main import app
from apps.api.app.models.organization import Organization, OrganizationStatus, DataRegion
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.purpose import Purpose
from apps.api.app.core.security import hash_api_key, encrypt_field
from apps.api.app.core.config import settings

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create test database session."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create test client with database override."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def organization(db):
    """Create test organization."""
    org = Organization(
        name="Test Org",
        data_region=DataRegion.KSA,
        status=OrganizationStatus.ACTIVE,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@pytest.fixture
def api_key(db, organization):
    """Create test API key."""
    plaintext_key = "test_api_key_12345"
    hashed_key = hash_api_key(plaintext_key)
    hmac_secret = "test_hmac_secret"
    encrypted_hmac_secret = encrypt_field(hmac_secret, settings.master_encryption_key)

    key = ApiKey(
        organization_id=organization.id,
        name="Test Key",
        hashed_key=hashed_key,
        hmac_secret=encrypted_hmac_secret,
        active=True,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return key, plaintext_key


@pytest.fixture
def purpose(db, organization):
    """Create test purpose."""
    purpose = Purpose(
        organization_id=organization.id,
        code="marketing",
        description="Marketing communications",
        active=True,
    )
    db.add(purpose)
    db.commit()
    db.refresh(purpose)
    return purpose


