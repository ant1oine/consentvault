"""Audit logging utility for tracking all major platform and org events."""
from datetime import UTC, datetime

from app.db import SessionLocal, AuditLog


def record_audit(event_type: str, actor: str, details: dict | None = None):
    """Record any major platform or org event in audit_logs."""
    db = SessionLocal()
    try:
        log = AuditLog(
            action=event_type,  # Map event_type to action field
            entity_type="platform",  # Default entity type
            user_email=actor,  # Map actor to user_email field
            metadata_json=details or {},  # Map details to metadata_json
            created_at=datetime.now(UTC)
        )
        db.add(log)
        db.commit()
        print(f"🧾 Audit: {event_type} by {actor}")
    except Exception as e:
        print(f"⚠️  Failed to record audit: {e}")
        db.rollback()
    finally:
        db.close()

