"""Audit service for logging actions."""
from uuid import UUID

from sqlalchemy.orm import Session

from app.db import AuditLog, OrgUser


def log_event(
    db: Session,
    actor,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    metadata: dict | None = None,
    org_id: UUID | None = None,
):
    """
    Centralized audit logger. Always attaches org_id if available.
    
    This function ensures that every audit event is properly scoped to an organization,
    even when triggered by superadmins. It resolves org_id from:
    1. Explicit org_id parameter (highest priority)
    2. Actor's current org context (if actor has org_id attribute)
    3. Actor's first org membership (if actor has org_memberships relationship)
    
    Args:
        db: Database session (must be provided, not created internally)
        actor: The user or object performing the action (User instance, or object with email/org_id)
        action: Action type (e.g., "created", "updated", "deleted", "added_user")
        entity_type: Type of entity (e.g., "consent", "org", "user", "org_user")
        entity_id: ID of the entity (optional)
        metadata: Additional metadata as dict (optional)
        org_id: Explicit organization ID (optional, will be resolved from actor if not provided)
    
    Raises:
        ValueError: If org_id cannot be resolved and is required
    """
    # Determine org context
    resolved_org_id = org_id
    
    # If actor is an Org object, use its id directly
    if not resolved_org_id and hasattr(actor, "__class__"):
        from app.db import Org
        if isinstance(actor, Org):
            resolved_org_id = actor.id
    
    if not resolved_org_id:
        # Prefer actor's current org if available
        resolved_org_id = getattr(actor, "org_id", None)
        
        # If not available, try to get from actor's org_memberships
        if not resolved_org_id and hasattr(actor, "org_memberships"):
            memberships = actor.org_memberships
            if memberships:
                resolved_org_id = memberships[0].org_id  # fallback to first org
    
    # If still no org_id, try querying OrgUser relationship
    if not resolved_org_id and hasattr(actor, "id"):
        org_user = db.query(OrgUser).filter(OrgUser.user_id == actor.id).first()
        if org_user:
            resolved_org_id = org_user.org_id
    
    if not resolved_org_id:
        raise ValueError(
            f"Audit event missing org_id for action={action}, entity_type={entity_type}. "
            "org_id must be provided explicitly or resolvable from actor."
        )
    
    # Extract user email from actor
    user_email = None
    if hasattr(actor, "email"):
        user_email = actor.email
    elif isinstance(actor, str):
        user_email = actor  # Allow passing email as string
    
    event = AuditLog(
        org_id=resolved_org_id,
        user_email=user_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata or {},
    )
    
    db.add(event)
    db.commit()


def log_action(
    org_id: UUID | None = None,
    user_email: str | None = None,
    action: str = "",
    entity_type: str = "",
    entity_id: UUID | None = None,
    metadata: dict | None = None,
):
    """
    Legacy log_action function for backward compatibility.
    
    DEPRECATED: Use log_event() instead, which properly resolves org_id from actor.
    This function is kept for backward compatibility but will raise ValueError
    if org_id is not provided (since org_id is now required).
    
    Args:
        org_id: Organization ID (REQUIRED - no longer optional)
        user_email: Email of the user performing the action
        action: Action type (e.g., "created", "updated", "deleted")
        entity_type: Type of entity (e.g., "consent", "org", "user")
        entity_id: ID of the entity (optional)
        metadata: Additional metadata as dict (optional)
    """
    from app.db import SessionLocal
    
    if not org_id:
        raise ValueError(
            f"org_id is required for audit logging. Action: {action}, Entity: {entity_type}. "
            "Please use log_event() with an actor object instead."
        )
    
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

