"""Audit log model."""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from apps.api.app.db.base import BaseModel


class AuditLog(BaseModel):
    """Audit log model for tamper-evident logging."""

    __tablename__ = "audit_logs"

    id = Column(String(26), primary_key=True)  # ULID
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    actor_api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    object_type = Column(String(100), nullable=False, index=True)
    object_id = Column(String(255), nullable=False, index=True)
    prev_hash = Column(String(64), nullable=False)  # Previous entry hash
    entry_hash = Column(String(64), nullable=False, unique=True, index=True)  # This entry's hash
    request_fingerprint = Column(String(64), nullable=True)  # Hash of request metadata

    actor_api_key = relationship("ApiKey", foreign_keys=[actor_api_key_id])


