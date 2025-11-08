"""Webhook delivery admin router."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from apps.api.app.core.rate_limit import rate_limiter
from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.organization import Organization
from apps.api.app.schemas.webhook import WebhookDeliveryResponse
from apps.api.app.services.webhook import WebhookService

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])


@router.post("/test-delivery")
async def test_delivery(
    request: Request,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Trigger a test webhook delivery to all active endpoints."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    webhook_service = WebhookService(db)
    webhook_service.enqueue_webhook(
        organization_id=org.id,
        event_type="webhook.test",
        payload={"event_type": "webhook.test", "message": "Test delivery"},
    )
    return {"status": "queued"}


@router.post("/replay/{delivery_id}", response_model=WebhookDeliveryResponse)
async def replay_webhook(
    delivery_id: str,
    request: Request,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Replay a failed webhook delivery."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    webhook_service = WebhookService(db)
    delivery = webhook_service.replay_delivery(org.id, delivery_id)
    return delivery


