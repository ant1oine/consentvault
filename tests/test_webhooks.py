"""Test webhook functionality."""
import pytest
from fastapi import status


def test_create_webhook_endpoint(client, api_key):
    """Test creating a webhook endpoint."""
    key, plaintext = api_key

    response = client.post(
        "/v1/admin/webhooks",
        json={
            "url": "https://example.com/webhook",
            "secret": "webhook_secret_123",
        },
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["url"] == "https://example.com/webhook"
    assert data["active"] is True
    # Secret should not be in response
    assert "secret" not in data


def test_list_webhook_endpoints(client, api_key):
    """Test listing webhook endpoints."""
    key, plaintext = api_key

    # Create endpoint
    client.post(
        "/v1/admin/webhooks",
        json={
            "url": "https://example.com/webhook",
            "secret": "secret123",
        },
        headers={"X-Api-Key": plaintext},
    )

    # List endpoints
    response = client.get(
        "/v1/admin/webhooks",
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) > 0


def test_test_webhook_delivery(client, api_key):
    """Test triggering test webhook delivery."""
    key, plaintext = api_key

    # Create endpoint
    client.post(
        "/v1/admin/webhooks",
        json={
            "url": "https://example.com/webhook",
            "secret": "secret123",
        },
        headers={"X-Api-Key": plaintext},
    )

    # Trigger test
    response = client.post(
        "/v1/webhooks/test-delivery",
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "queued"


def test_replay_webhook(client, api_key, purpose, db):
    """Test replaying a failed webhook."""
    key, plaintext = api_key

    # Create webhook endpoint
    from apps.api.app.services.webhook import WebhookService
    webhook_service = WebhookService(db)
    endpoint = webhook_service.create_endpoint(
        organization_id=key.organization_id,
        url="https://example.com/webhook",
        secret="secret123",
    )

    # Create a failed delivery
    from apps.api.app.models.webhook import WebhookDelivery, DeliveryStatus
    from apps.api.app.utils.ids import generate_ulid
    delivery = WebhookDelivery(
        id=generate_ulid(),
        organization_id=key.organization_id,
        endpoint_id=endpoint.id,
        event_type="test.event",
        payload={"test": "data"},
        status=DeliveryStatus.FAILED,
        attempt_count=1,
    )
    db.add(delivery)
    db.commit()

    # Replay
    response = client.post(
        f"/v1/webhooks/replay/{delivery.id}",
        headers={"X-Api-Key": plaintext},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "pending"  # Reset to pending for retry


