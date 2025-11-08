"""Webhook schemas."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from apps.api.app.models.webhook import DeliveryStatus


class WebhookEndpointCreate(BaseModel):
    """Create webhook endpoint schema."""

    url: str = Field(..., min_length=1, max_length=500)
    secret: str = Field(..., min_length=1, max_length=255)


class WebhookEndpointResponse(BaseModel):
    """Webhook endpoint response schema."""

    id: int
    organization_id: int
    url: str
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookDeliveryResponse(BaseModel):
    """Webhook delivery response schema."""

    id: str
    organization_id: int
    endpoint_id: int
    event_type: str
    payload: dict[str, Any]
    status: DeliveryStatus
    attempt_count: int
    last_attempt_at: datetime | None
    response_code: int | None
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True


