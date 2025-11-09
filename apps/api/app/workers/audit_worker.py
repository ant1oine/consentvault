"""Background worker tasks for audit logging."""
import json
from datetime import datetime, timezone

from apps.api.app.db.session import SessionLocal
from apps.api.app.models.audit_log import ApiAuditLog


def log_ui_event_task(payload: dict, api_key_id: int, organization_id: int):
    """Background task to record UI analytics events in the audit log."""
    db = SessionLocal()
    try:
        entry = ApiAuditLog(
            organization_id=organization_id,
            api_key_id=api_key_id,
            method="UI",
            path="ui-event",
            status_code=200,
            request_body=json.dumps(payload, separators=(",", ":")),
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.commit()
    finally:
        db.close()

