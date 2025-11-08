"""Tests for user management endpoints."""
import pytest
from apps.api.app.models.api_key import ApiKeyRole


def test_create_user_ok(client, api_key, organization, db):
    """Test creating a user successfully."""
    key, plaintext_key = api_key
    # Set role to ADMIN for mutations
    key.role = ApiKeyRole.ADMIN
    db.commit()
    db.refresh(key)
    
    headers = {
        "X-Api-Key": plaintext_key,
        "X-Organization-ID": str(organization.id),
    }
    response = client.post(
        "/v1/admin/users",
        json={
            "email": "test@example.com",
            "display_name": "Test User",
            "role": "VIEWER",
        },
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["display_name"] == "Test User"
    assert data["role"] == "VIEWER"
    assert data["active"] is True
    assert "id" in data


def test_list_users_scoped(client, api_key, organization, db):
    """Test listing users is scoped to organization."""
    key, plaintext_key = api_key
    # Set role to ADMIN (can create and list users)
    key.role = ApiKeyRole.ADMIN
    db.commit()
    db.refresh(key)
    
    headers = {
        "X-Api-Key": plaintext_key,
        "X-Organization-ID": str(organization.id),
    }
    # Create a user first
    client.post(
        "/v1/admin/users",
        json={"email": "listtest@example.com", "role": "VIEWER"},
        headers=headers,
    )
    
    # List users
    response = client.get("/v1/admin/users", headers=headers)
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    # Should contain at least the user we just created
    emails = [u["email"] for u in users]
    assert "listtest@example.com" in emails


def test_update_role_ok_and_audit(client, api_key, organization, db):
    """Test updating user role and verify audit event."""
    key, plaintext_key = api_key
    # Set role to ADMIN for mutations
    key.role = ApiKeyRole.ADMIN
    db.commit()
    db.refresh(key)
    
    headers = {
        "X-Api-Key": plaintext_key,
        "X-Organization-ID": str(organization.id),
    }
    # Create a user
    create_response = client.post(
        "/v1/admin/users",
        json={"email": "roletest@example.com", "role": "VIEWER"},
        headers=headers,
    )
    assert create_response.status_code == 201
    user_id = create_response.json()["id"]
    
    # Update role
    update_response = client.post(
        f"/v1/admin/users/{user_id}/role",
        json={"role": "ADMIN"},
        headers=headers,
    )
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["role"] == "ADMIN"
    
    # Verify audit event exists
    audit_response = client.get(
        "/v1/audit",
        params={"object_type": "User", "object_id": user_id},
        headers=headers,
    )
    assert audit_response.status_code == 200
    audit_logs = audit_response.json()
    # Should have at least user.created and user.role_changed events
    event_types = [log["event_type"] for log in audit_logs]
    assert "user.created" in event_types
    assert "user.role_changed" in event_types


def test_toggle_active_and_audit(client, api_key, organization, db):
    """Test toggling user active status and verify audit event."""
    key, plaintext_key = api_key
    # Set role to ADMIN for mutations
    key.role = ApiKeyRole.ADMIN
    db.commit()
    db.refresh(key)
    
    headers = {
        "X-Api-Key": plaintext_key,
        "X-Organization-ID": str(organization.id),
    }
    # Create a user
    create_response = client.post(
        "/v1/admin/users",
        json={"email": "activetest@example.com", "role": "VIEWER"},
        headers=headers,
    )
    assert create_response.status_code == 201
    user_id = create_response.json()["id"]
    
    # Deactivate user
    toggle_response = client.post(
        f"/v1/admin/users/{user_id}/active",
        json={"active": False},
        headers=headers,
    )
    assert toggle_response.status_code == 200
    data = toggle_response.json()
    assert data["active"] is False
    
    # Verify audit event
    audit_response = client.get(
        "/v1/audit",
        params={"object_type": "User", "object_id": user_id},
        headers=headers,
    )
    assert audit_response.status_code == 200
    audit_logs = audit_response.json()
    event_types = [log["event_type"] for log in audit_logs]
    assert "user.deactivated" in event_types

