"""Webhook models."""
import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    JSON,
    Boolean,
)
from sqlalchemy.orm import relationship
from apps.api.app.db.base import BaseModel


class DeliveryStatus(str, enum.Enum):
    """Webhook delivery status enum."""

    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class WebhookEndpoint(BaseModel):
    """Webhook endpoint model."""

    __tablename__ = "webhook_endpoints"

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    secret = Column(String(512), nullable=False)  # Encrypted at rest
    active = Column(Boolean, default=True, nullable=False, index=True)

    organization = relationship("Organization", backref="webhook_endpoints")


class WebhookDelivery(BaseModel):
    """Webhook delivery model."""

    __tablename__ = "webhook_deliveries"

    id = Column(String(26), primary_key=True)  # ULID
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    endpoint_id = Column(Integer, ForeignKey("webhook_endpoints.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    status = Column(SQLEnum(DeliveryStatus), nullable=False, default=DeliveryStatus.PENDING, index=True)
    attempt_count = Column(Integer, default=0, nullable=False)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    response_code = Column(Integer, nullable=True)
    error_message = Column(String(1000), nullable=True)

    endpoint = relationship("WebhookEndpoint", backref="deliveries")


