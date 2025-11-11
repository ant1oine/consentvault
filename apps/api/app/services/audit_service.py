"""Audit service for logging actions."""
from uuid import UUID

from app.db import AuditLog, SessionLocal


def log_action(
    org_id: UUID | None = None,
    user_email: str | None = None,
    action: str = "",
    entity_type: str = "",
    entity_id: UUID | None = None,
    metadata: dict | None = None,
):
    """
    Log an action to the audit trail.
    
    Args:
        org_id: Organization ID (optional)
        user_email: Email of the user performing the action
        action: Action type (e.g., "created", "updated", "deleted")
        entity_type: Type of entity (e.g., "consent", "org", "user")
        entity_id: ID of the entity (optional)
        metadata: Additional metadata as dict (optional)
    """
    db = SessionLocal()
    try:
        log = AuditLog(
            org_id=org_id,
            user_email=user_email,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=metadata or {},
        )
        db.add(log)
        db.commit()
    except Exception as e:
        # Log error but don't fail the request
        print(f"⚠️  Failed to log audit action: {e}")
        db.rollback()
    finally:
        db.close()

