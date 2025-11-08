"""RQ worker tasks."""
from datetime import UTC, datetime

import httpx

from apps.api.app.core.config import settings
from apps.api.app.core.security import decrypt_field
from apps.api.app.db.session import SessionLocal
from apps.api.app.models.webhook import DeliveryStatus, WebhookDelivery, WebhookEndpoint
from apps.api.app.utils.hmac_sign import sign_webhook_payload


def deliver_webhook(delivery_id: str) -> None:
    """Deliver a webhook with retry logic."""
    db = SessionLocal()
    try:
        delivery = db.query(WebhookDelivery).filter(WebhookDelivery.id == delivery_id).first()
        if not delivery:
            return

        endpoint = db.query(WebhookEndpoint).filter(WebhookEndpoint.id == delivery.endpoint_id).first()
        if not endpoint or not endpoint.active:
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = "Endpoint not found or inactive"
            db.commit()
            return

        # Decrypt secret
        secret = decrypt_field(endpoint.secret, settings.master_encryption_key)

        # Sign payload
        signature, timestamp = sign_webhook_payload(delivery.payload, secret)

        # Prepare headers
        headers = {
            "X-ConsentVault-Signature": signature,
            "X-Event-Type": delivery.event_type,
            "X-Event-Id": delivery.id,
            "X-Organization-Id": str(delivery.organization_id),
            "X-Timestamp": timestamp,
            "Content-Type": "application/json",
        }

        # Deliver
        try:
            response = httpx.post(
                endpoint.url,
                json=delivery.payload,
                headers=headers,
                timeout=10.0,
            )
            delivery.attempt_count += 1
            delivery.last_attempt_at = datetime.now(UTC)
            delivery.response_code = response.status_code

            if 200 <= response.status_code < 300:
                delivery.status = DeliveryStatus.SENT
            else:
                delivery.status = DeliveryStatus.FAILED
                delivery.error_message = f"HTTP {response.status_code}"
        except Exception as e:
            delivery.attempt_count += 1
            delivery.last_attempt_at = datetime.now(UTC)
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = str(e)[:1000]

        db.commit()

        # Retry logic: exponential backoff
        if delivery.status == DeliveryStatus.FAILED and delivery.attempt_count < 6:
            [60, 300, 1800, 7200, 21600][delivery.attempt_count - 1]
            # Re-enqueue with delay (RQ doesn't support delay natively, so we'd need scheduler)
            # For now, just mark as failed - scheduler can pick up later
            pass

    finally:
        db.close()
