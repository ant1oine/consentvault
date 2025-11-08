"""Consent models."""
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
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from apps.api.app.db.base import BaseModel


class ConsentStatus(str, enum.Enum):
    """Consent status enum."""

    GRANTED = "granted"
    WITHDRAWN = "withdrawn"


class ConsentMethod(str, enum.Enum):
    """Consent method enum."""

    CHECKBOX = "checkbox"
    TOS = "tos"
    CONTRACT = "contract"
    OTHER = "other"


class ConsentAggregate(BaseModel):
    """Consent aggregate model."""

    __tablename__ = "consent_aggregates"

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    external_user_id = Column(String(255), nullable=False, index=True)
    purpose_id = Column(Integer, ForeignKey("purposes.id"), nullable=False, index=True)
    status = Column(SQLEnum(ConsentStatus), nullable=False, index=True)
    last_event_at = Column(DateTime(timezone=True), nullable=False)
    source_system_id = Column(Integer, ForeignKey("systems.id"), nullable=True)
    evidence_ref = Column(String(500), nullable=True)
    encrypted_fields = Column(JSON, nullable=True)

    purpose = relationship("Purpose")
    source_system = relationship("System")

    __table_args__ = (
        UniqueConstraint("organization_id", "external_user_id", "purpose_id", name="uq_consent_org_user_purpose"),
    )


class ConsentEvent(BaseModel):
    """Consent event model."""

    __tablename__ = "consent_events"

    id = Column(String(26), primary_key=True)  # ULID
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    aggregate_id = Column(Integer, ForeignKey("consent_aggregates.id"), nullable=False, index=True)
    purpose_id = Column(Integer, ForeignKey("purposes.id"), nullable=False)
    status = Column(SQLEnum(ConsentStatus), nullable=False)
    method = Column(SQLEnum(ConsentMethod), nullable=False)
    source = Column(String(255), nullable=True)
    ip_hash = Column(String(64), nullable=True)
    user_agent_hash = Column(String(64), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    evidence_ref = Column(String(500), nullable=True)
    prev_hash = Column(String(64), nullable=False)  # Previous audit hash
    event_hash = Column(String(64), nullable=False)  # This event's hash

    aggregate = relationship("ConsentAggregate", backref="events")


