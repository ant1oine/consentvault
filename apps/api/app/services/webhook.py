"""Webhook service."""
import json
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_

from apps.api.app.models.webhook import WebhookEndpoint, WebhookDelivery, DeliveryStatus
from apps.api.app.utils.ids import generate_ulid
from apps.api.app.core.security import encrypt_field, decrypt_field
from apps.api.app.core.config import settings
from rq import Queue
from redis import Redis

redis_conn = Redis.from_url(settings.redis_url)
webhook_queue = Queue("consentvault", connection=redis_conn)


class WebhookService:
    """Service for webhook management and delivery."""

    def __init__(self, db: Session):
        self.db = db

    def create_endpoint(
        self, organization_id: int, url: str, secret: str
    ) -> WebhookEndpoint:
        """Create a webhook endpoint."""
        # Encrypt secret at rest
        encrypted_secret = encrypt_field(secret, settings.master_encryption_key)

        endpoint = WebhookEndpoint(
            organization_id=organization_id,
            url=url,
            secret=encrypted_secret,
            active=True,
        )
        self.db.add(endpoint)
        self.db.commit()
        self.db.refresh(endpoint)
        return endpoint

    def list_endpoints(self, organization_id: int) -> list[WebhookEndpoint]:
        """List webhook endpoints for organization."""
        return (
            self.db.query(WebhookEndpoint)
            .filter(WebhookEndpoint.organization_id == organization_id)
            .all()
        )

    def enqueue_webhook(
        self, organization_id: int, event_type: str, payload: dict
    ) -> None:
        """Enqueue webhook delivery for all active endpoints."""
        endpoints = (
            self.db.query(WebhookEndpoint)
            .filter(
                and_(
                    WebhookEndpoint.organization_id == organization_id,
                    WebhookEndpoint.active == True,
                )
            )
            .all()
        )

        for endpoint in endpoints:
            delivery_id = generate_ulid()
            delivery = WebhookDelivery(
                id=delivery_id,
                organization_id=organization_id,
                endpoint_id=endpoint.id,
                event_type=event_type,
                payload=payload,
                status=DeliveryStatus.PENDING,
                attempt_count=0,
            )
            self.db.add(delivery)
            self.db.commit()

            # Enqueue delivery task
            from apps.api.app.workers.tasks import deliver_webhook

            webhook_queue.enqueue(deliver_webhook, delivery_id)

    def replay_delivery(self, organization_id: int, delivery_id: str) -> WebhookDelivery:
        """Replay a failed webhook delivery."""
        delivery = (
            self.db.query(WebhookDelivery)
            .filter(
                and_(
                    WebhookDelivery.id == delivery_id,
                    WebhookDelivery.organization_id == organization_id,
                )
            )
            .first()
        )
        if not delivery:
            raise ValueError("Delivery not found")

        # Reset status and enqueue
        delivery.status = DeliveryStatus.PENDING
        self.db.commit()

        from apps.api.app.workers.tasks import deliver_webhook

        webhook_queue.enqueue(deliver_webhook, delivery_id)
        return delivery


