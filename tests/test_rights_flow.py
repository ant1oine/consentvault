"""Test data rights flow."""
import pytest
from fastapi import status

from apps.api.app.models.rights import DataRight, RequestStatus


def test_create_rights_request(client, api_key):
    """Test creating a data rights request."""
    key, plaintext = api_key

    response = client.post(
        "/v1/rights",
        json={
            "external_user_id": "user123",
            "right": "access",
            "reason": "User requested data access",
        },
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "open"
    assert data["right"] == "access"
    assert data["external_user_id"] == "user123"
    request_id = data["id"]


def test_complete_rights_request(client, api_key):
    """Test completing a data rights request."""
    key, plaintext = api_key

    # Create request
    create_response = client.post(
        "/v1/rights",
        json={
            "external_user_id": "user123",
            "right": "erasure",
        },
        headers={"X-Api-Key": plaintext},
    )
    request_id = create_response.json()["id"]

    # Complete request
    response = client.post(
        f"/v1/rights/{request_id}/complete",
        json={"evidence_ref": "evidence_123"},
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "completed"
    assert data["evidence_ref"] == "evidence_123"
    assert data["closed_at"] is not None


def test_list_rights_requests(client, api_key):
    """Test listing data rights requests."""
    key, plaintext = api_key

    # Create multiple requests
    for i in range(3):
        client.post(
            "/v1/rights",
            json={
                "external_user_id": f"user{i}",
                "right": "access",
            },
            headers={"X-Api-Key": plaintext},
        )

    # List all
    response = client.get(
        "/v1/rights",
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 3

    # Filter by status
    response = client.get(
        "/v1/rights",
        params={"status": "open"},
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(r["status"] == "open" for r in data)

    # Filter by right
    response = client.get(
        "/v1/rights",
        params={"right": "access"},
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(r["right"] == "access" for r in data)


