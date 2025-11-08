"""Audit service."""
from datetime import datetime

from sqlalchemy import desc
from sqlalchemy.orm import Session

from apps.api.app.models.audit import AuditLog
from apps.api.app.utils.hashing import compute_audit_hash
from apps.api.app.utils.ids import generate_ulid


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
        actor_api_key_id: int | None,
        event_type: str,
        object_type: str,
        object_id: str,
        prev_hash: str,
        entry_hash: str,
        request_fingerprint: str | None = None,
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
        event_type: str | None = None,
        object_type: str | None = None,
        since: datetime | None = None,
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


