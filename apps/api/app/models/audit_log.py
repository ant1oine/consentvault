"""Audit Log model — regulator-grade request/response integrity tracking."""
from typing import Any

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from apps.api.app.db.base import BaseModel


class ApiAuditLog(BaseModel):
    """Stores every API call (org, key, method, path, IP, status, digests)."""

    __tablename__ = "api_audit_logs"

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=False, index=True)
    method = Column(String(10), nullable=False)
    path = Column(String(255), nullable=False)
    status_code = Column(Integer, nullable=False)
    ip_address = Column(String(45), nullable=True)
    request_hash = Column(String(64), nullable=True)
    response_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verifier_api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=True)

    def as_dict(self) -> dict[str, Any]:
        """Convert model to dictionary with proper datetime serialization."""
        result = {
            "id": self.id,
            "organization_id": self.organization_id,
            "api_key_id": self.api_key_id,
            "method": self.method,
            "path": self.path,
            "status_code": self.status_code,
            "ip_address": self.ip_address,
            "request_hash": self.request_hash,
            "response_hash": self.response_hash,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "verifier_api_key_id": self.verifier_api_key_id,
        }
        return result

