"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr


# Auth schemas
class LoginRequest(BaseModel):
    """Login request schema."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response schema."""

    access_token: str
    token_type: str = "bearer"


# Org schemas
class OrgCreate(BaseModel):
    """Organization creation schema."""

    name: str


class OrgOut(BaseModel):
    """Organization output schema."""

    id: UUID
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class OrgUserCreate(BaseModel):
    """Add user to org schema."""

    user_id: UUID
    role: str  # 'admin', 'manager', 'viewer'


# Consent schemas
class ConsentCreate(BaseModel):
    """Consent creation schema."""

    purpose: str
    text: str
    subject_id: str
    ip: str | None = None
    user_agent: str | None = None
    metadata: dict[str, Any] | None = None


class ConsentOut(BaseModel):
    """Consent output schema."""

    id: UUID
    subject_id: str
    purpose: str
    text: str
    version_hash: str
    accepted_at: datetime
    revoked_at: datetime | None

    class Config:
        from_attributes = True


class ConsentListParams(BaseModel):
    """Consent list query parameters."""

    org_id: UUID
    subject_id: str | None = None
    purpose: str | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None
    q: str | None = None  # general search

