"""Audit logging utility for tracking all major platform and org events.

DEPRECATED: This function is kept for backward compatibility with legacy scripts.
For new code, use app.services.audit_service.log_event() instead, which properly
handles org_id resolution.

System-level operations (like creating users or promoting to superadmin) that
don't have an org context will skip audit logging, as they wouldn't be visible
to org admins anyway.
"""
from uuid import UUID

from app.db import SessionLocal
from app.services.audit_service import log_event


def record_audit(event_type: str, actor: str, details: dict | None = None):
    """
    Record any major platform or org event in audit_logs.
    
    DEPRECATED: Use app.services.audit_service.log_event() instead.
    
    This function attempts to extract org_id from details if available.
    If org_id is not found, the audit log is skipped (for system-level operations).
    """
    details = details or {}
    
    # Try to extract org_id from details
    org_id = None
    if "org_id" in details:
        org_id_str = details.get("org_id")
        try:
            org_id = UUID(org_id_str) if isinstance(org_id_str, str) else org_id_str
        except (ValueError, TypeError):
            pass
    
    # If no org_id, skip audit logging for system-level operations
    if not org_id:
        print(f"⚠️  Skipping audit log for system-level operation: {event_type} by {actor} (no org_id)")
        return
    
    db = SessionLocal()
    try:
        # Create a simple actor object
        class SimpleActor:
            def __init__(self, email):
                self.email = email
        
        actor_obj = SimpleActor(actor)
        
        log_event(
            db=db,
            actor=actor_obj,
            action=event_type,
            entity_type=details.get("entity_type", "platform"),
            entity_id=details.get("entity_id"),
            org_id=org_id,
            metadata=details,
        )
        print(f"🧾 Audit: {event_type} by {actor}")
    except Exception as e:
        print(f"⚠️  Failed to record audit: {e}")
        db.rollback()
    finally:
        db.close()

