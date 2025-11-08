"""API Key model."""
import enum

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship

from apps.api.app.db.base import BaseModel


class ApiKeyRole(str, enum.Enum):
    """API Key role enum (for future RBAC)."""

    ADMIN = "admin"
    AUDITOR = "auditor"
    VIEWER = "viewer"


class ApiKey(BaseModel):
    """API Key model."""

    __tablename__ = "api_keys"

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    hashed_key = Column(String(255), nullable=False, unique=True, index=True)
    hmac_secret = Column(String(512), nullable=True)  # Encrypted at rest
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    active = Column(Boolean, default=True, nullable=False, index=True)
    role = Column(
        SQLEnum(ApiKeyRole), nullable=False, default=ApiKeyRole.ADMIN
    )  # RBAC placeholder

    organization = relationship("Organization", backref="api_keys")


