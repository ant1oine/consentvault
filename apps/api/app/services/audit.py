"""Audit service."""
from typing import Optional
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from apps.api.app.models.audit import AuditLog
from apps.api.app.utils.ids import generate_ulid
from apps.api.app.utils.hashing import compute_audit_hash


class AuditService:
    """Service for audit logging."""

    def __init__(self, db: Session):
        self.db = db

    def get_latest_hash(self, organization_id: int) -> str:
        """Get the latest audit hash for an organization (for hash chain)."""
        latest = (
            self.db.query(AuditLog)
            .filter(AuditLog.organization_id == organization_id)
            .order_by(desc(AuditLog.created_at))
            .first()
        )
        if latest:
            return latest.entry_hash
        # First entry: use zeros
        return "0" * 64

    def compute_hash(self, prev_hash: str, event_data: dict) -> str:
        """Compute audit hash for an event."""
        return compute_audit_hash(prev_hash, event_data)

    def log_event(
        self,
        organization_id: int,
        actor_api_key_id: Optional[int],
        event_type: str,
        object_type: str,
        object_id: str,
        prev_hash: str,
        entry_hash: str,
        request_fingerprint: Optional[str] = None,
    ) -> AuditLog:
        """Log an audit event."""
        audit_log = AuditLog(
            id=generate_ulid(),
            organization_id=organization_id,
            actor_api_key_id=actor_api_key_id,
            event_type=event_type,
            object_type=object_type,
            object_id=object_id,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            request_fingerprint=request_fingerprint,
        )
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        return audit_log

    def list_events(
        self,
        organization_id: int,
        event_type: Optional[str] = None,
        object_type: Optional[str] = None,
        since: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditLog]:
        """List audit events."""
        query = self.db.query(AuditLog).filter(AuditLog.organization_id == organization_id)
        if event_type:
            query = query.filter(AuditLog.event_type == event_type)
        if object_type:
            query = query.filter(AuditLog.object_type == object_type)
        if since:
            query = query.filter(AuditLog.created_at >= since)
        return query.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset).all()


