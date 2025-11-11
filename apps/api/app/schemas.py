"""Pydantic schemas for request/response validation."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional
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
    region: str


class OrgOut(BaseModel):
    """Organization output schema."""

    id: UUID
    name: str
    region: str
    api_key: str
    created_at: datetime

    class Config:
        from_attributes = True


class OrgDetailOut(BaseModel):
    """Organization detail with users."""

    id: UUID
    name: str
    region: str
    api_key: str
    created_at: datetime
    users: list["OrgMemberOut"]

    class Config:
        from_attributes = True


class OrgUserCreate(BaseModel):
    """Add user to org schema."""

    user_id: UUID
    role: str  # 'admin', 'editor', 'viewer'


# OrgMember schemas
class OrgMemberCreate(BaseModel):
    """Organization member creation schema."""

    org_id: UUID
    email: str
    name: str
    role: str


class OrgMemberOut(BaseModel):
    """Organization member output schema."""

    id: UUID
    org_id: UUID
    email: str
    name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# Consent schemas
class ConsentCreate(BaseModel):
    """Consent creation schema."""

    subject_email: str
    purpose: str
    status: str = "granted"  # "granted" or "revoked"
    text: str | None = None
    ip: str | None = None
    user_agent: str | None = None
    metadata: dict[str, Any] | None = None


class ConsentOut(BaseModel):
    """Consent output schema."""

    id: UUID
    subject_id: str | None = None
    subject_email: str | None = None
    purpose: str
    text: str | None = None
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


# Dashboard schemas
class DashboardSummary(BaseModel):
    """Dashboard summary response."""

    org: str
    consents_active: int
    revocations: int
    dsar_completed: int


# Audit log schemas
class AuditLogOut(BaseModel):
    """Audit log output schema."""

    id: UUID
    org_id: UUID | None
    user_email: str | None
    action: str
    entity_type: str
    entity_id: UUID | None
    metadata_json: dict[str, Any] | None
    created_at: datetime

    class Config:
        from_attributes = True


# Data Rights Request schemas
class DataRightRequestBase(BaseModel):
    """Data Right Request base schema."""

    subject_email: EmailStr
    request_type: Literal["access", "rectify", "erase"]
    notes: Optional[str] = None


class DataRightRequestOut(DataRightRequestBase):
    """Data Right Request output schema."""

    id: UUID
    org_id: UUID
    status: str
    processed_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DataRightRequestStatusUpdate(BaseModel):
    """Data Right Request status update schema."""

    status: Literal["processing", "completed", "rejected"]


