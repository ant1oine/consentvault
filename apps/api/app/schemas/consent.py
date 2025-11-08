"""Consent schemas."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any
from apps.api.app.models.consent import ConsentStatus, ConsentMethod


class ConsentCreate(BaseModel):
    """Create consent schema."""

    external_user_id: str = Field(..., min_length=1, max_length=255)
    purpose_code: str = Field(..., min_length=1, max_length=100)
    status: ConsentStatus
    method: ConsentMethod
    source: str | None = Field(None, max_length=255)
    system_code: str | None = Field(None, max_length=100)
    evidence_ref: str | None = Field(None, max_length=500)
    encrypted_fields: dict[str, Any] | None = None


class ConsentResponse(BaseModel):
    """Consent aggregate response schema."""

    id: int
    organization_id: int
    external_user_id: str
    purpose_id: int
    purpose_code: str | None = None
    status: ConsentStatus
    last_event_at: datetime
    source_system_id: int | None
    evidence_ref: str | None
    encrypted_fields: dict[str, Any] | None

    class Config:
        from_attributes = True


class ConsentEventResponse(BaseModel):
    """Consent event response schema."""

    id: str
    organization_id: int
    aggregate_id: int
    purpose_id: int
    status: ConsentStatus
    method: ConsentMethod
    source: str | None
    timestamp: datetime
    evidence_ref: str | None

    class Config:
        from_attributes = True


class ConsentWithdraw(BaseModel):
    """Withdraw consent schema."""

    purpose_code: str = Field(..., min_length=1, max_length=100)


