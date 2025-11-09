"""Admin router for audit log access and verification."""
import hashlib
from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.api_key import ApiKey, ApiKeyRole
from apps.api.app.models.audit_log import ApiAuditLog
from apps.api.app.models.organization import Organization
from apps.api.app.deps.auth import verify_api_key_auth

router = APIRouter(prefix="/v1/admin/audit", tags=["audit"])

# --------------------------------------------------------------------
# Helper
# --------------------------------------------------------------------
def sha256_digest(data: bytes) -> str:
    """Return a SHA256 hex digest for given data."""
    return hashlib.sha256(data).hexdigest()


# --------------------------------------------------------------------
# List audit logs
# --------------------------------------------------------------------
@router.get("/", response_model=list[dict])
async def list_audit_logs(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Return recent audit logs (SUPERADMIN = all, others = org-only)."""
    api_key, org = auth
    query = db.query(ApiAuditLog)
    if api_key.role != ApiKeyRole.SUPERADMIN:
        query = query.filter(ApiAuditLog.organization_id == org.id)
    logs = query.order_by(ApiAuditLog.created_at.desc()).limit(100).all()
    return [log.as_dict() for log in logs]


# --------------------------------------------------------------------
# Verify payload hash against audit trail
# --------------------------------------------------------------------
@router.post("/verify")
async def verify_payload_hash(
    body: dict,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Compute hash of provided payload and check if it exists in audit logs."""
    api_key, org = auth

    payload = body.get("payload")
    if payload is None:
        raise HTTPException(status_code=400, detail="Missing payload")

    if isinstance(payload, (dict, list)):
        import json
        payload_bytes = json.dumps(payload, separators=(",", ":")).encode()
    elif isinstance(payload, str):
        payload_bytes = payload.encode()
    else:
        raise HTTPException(status_code=400, detail="Invalid payload type")

    computed_hash = sha256_digest(payload_bytes)

    query = db.query(ApiAuditLog)
    if api_key.role != ApiKeyRole.SUPERADMIN:
        query = query.filter(ApiAuditLog.organization_id == org.id)

    match = query.filter(ApiAuditLog.response_hash == computed_hash).first()

    if match:
        # Mark entry as verified (append-only, tamper-evident)
        # Only update if not already verified to maintain audit trail integrity
        if not match.verified_at:
            match.verified_at = datetime.now(UTC)
            match.verifier_api_key_id = api_key.id
            db.commit()
            db.refresh(match)

        return {
            "hash": computed_hash,
            "matches": True,
            "matched_entry_id": match.id,
            "method": match.method,
            "path": match.path,
            "created_at": match.created_at.isoformat() if match.created_at else None,
            "verified_at": match.verified_at.isoformat() if match.verified_at else None,
            "verifier_api_key_id": match.verifier_api_key_id,
        }

    return {
        "hash": computed_hash,
        "matches": False,
        "matched_entry_id": None,
        "method": None,
        "path": None,
        "created_at": None,
        "verified_at": None,
        "verifier_api_key_id": None,
    }


# --------------------------------------------------------------------
# Compute hash only (no verification)
# --------------------------------------------------------------------
@router.post("/hash")
async def compute_payload_hash(body: dict):
    """Compute SHA256 hash of provided JSON payload for local proof generation."""
    payload = body.get("payload")
    if payload is None:
        raise HTTPException(status_code=400, detail="Missing payload")

    import json
    if isinstance(payload, (dict, list)):
        payload_bytes = json.dumps(payload, separators=(",", ":")).encode()
    elif isinstance(payload, str):
        payload_bytes = payload.encode()
    else:
        raise HTTPException(status_code=400, detail="Invalid payload type")

    computed_hash = sha256_digest(payload_bytes)
    return {"hash": computed_hash}
