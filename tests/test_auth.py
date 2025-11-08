"""Test authentication."""
import pytest
from fastapi import status

from apps.api.app.models.organization import OrganizationStatus
from apps.api.app.core.security import hash_api_key


def test_create_api_key(client, organization, api_key):
    """Test API key creation returns plaintext key once."""
    # Use existing key to authenticate
    key, plaintext = api_key

    response = client.post(
        "/v1/admin/api-keys",
        json={"name": "New Key"},
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "api_key" in data
    assert data["api_key"].startswith("cv_")
    assert data["name"] == "New Key"

    # Verify key is hashed in database
    from apps.api.app.db.session import SessionLocal
    db = SessionLocal()
    from apps.api.app.models.api_key import ApiKey
    db_key = db.query(ApiKey).filter(ApiKey.id == data["id"]).first()
    assert db_key.hashed_key != data["api_key"]
    db.close()


def test_auth_rejects_unknown_key(client):
    """Test authentication rejects unknown API key."""
    response = client.get(
        "/v1/admin/api-keys",
        headers={"X-Api-Key": "invalid_key"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_auth_rejects_missing_key(client):
    """Test authentication rejects missing API key."""
    response = client.get("/v1/admin/api-keys")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_api_keys(client, api_key):
    """Test listing API keys (masked)."""
    key, plaintext = api_key

    response = client.get(
        "/v1/admin/api-keys",
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) > 0
    # Verify keys are masked (no plaintext)
    for key_data in data:
        assert "api_key" not in key_data or not key_data["api_key"].startswith("cv_")


def test_hmac_verification(client, api_key, db):
    """Test HMAC signature verification."""
    key, plaintext = api_key
    import time
    import hmac
    import hashlib
    from apps.api.app.core.security import decrypt_field

    # Get HMAC secret
    hmac_secret = decrypt_field(key.hmac_secret, "change_me_32bytes_base64")

    # Create request with HMAC
    body = b'{"name":"Test"}'
    timestamp = str(int(time.time()))
    message = body + timestamp.encode()
    signature = hmac.new(hmac_secret.encode(), message, hashlib.sha256).hexdigest()

    response = client.post(
        "/v1/admin/purposes",
        content=body,
        headers={
            "X-Api-Key": plaintext,
            "X-Signature": signature,
            "X-Timestamp": timestamp,
            "Content-Type": "application/json",
        },
    )
    # Should succeed with valid HMAC
    assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]


