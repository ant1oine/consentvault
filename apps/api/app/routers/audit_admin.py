"""Admin router for audit log access and verification."""
import base64
import csv
import hashlib
import io
import json
import os
from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from nacl.signing import SigningKey
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


def _sign_data(data: bytes) -> str:
    """Sign data using Ed25519 private key. Returns base64-encoded signature."""
    key_path = os.getenv("AUDIT_PRIVATE_KEY_PATH", "keys/audit_private.key")
    if not os.path.exists(key_path):
        raise HTTPException(
            status_code=500,
            detail="Audit signing key not found. Please generate keypair first.",
        )
    with open(key_path, "r") as f:
        priv = f.read().strip()
    key = SigningKey(base64.b64decode(priv))
    digest = hashlib.sha256(data).digest()
    signed = key.sign(digest).signature
    return base64.b64encode(signed).decode()


def _generate_export_data(logs: list[ApiAuditLog], format: str) -> bytes:
    """Generate export data in specified format. Returns bytes."""
    if format == "json":
        data = [
            {
                "id": log.id,
                "org": log.organization_id,
                "api_key_id": log.api_key_id,
                "path": log.path,
                "method": log.method,
                "status_code": log.status_code,
                "ip_address": log.ip_address,
                "request_body": log.request_body,
                "request_hash": log.request_hash,
                "response_hash": log.response_hash,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "verified_at": log.verified_at.isoformat() if log.verified_at else None,
                "verifier_api_key_id": log.verifier_api_key_id,
            }
            for log in logs
        ]
        return json.dumps(data, indent=2).encode("utf-8")

    # Default CSV
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "id",
        "organization_id",
        "api_key_id",
        "path",
        "method",
        "status_code",
        "ip_address",
        "request_body",
        "request_hash",
        "response_hash",
        "created_at",
        "verified_at",
        "verifier_api_key_id",
    ])
    for log in logs:
        writer.writerow([
            log.id,
            log.organization_id,
            log.api_key_id,
            log.path,
            log.method,
            log.status_code,
            log.ip_address or "",
            log.request_body or "",
            log.request_hash or "",
            log.response_hash or "",
            log.created_at.isoformat() if log.created_at else "",
            log.verified_at.isoformat() if log.verified_at else "",
            log.verifier_api_key_id or "",
        ])
    csv_content = buf.getvalue()
    buf.close()
    return csv_content.encode("utf-8")


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


# --------------------------------------------------------------------
# Export audit logs
# --------------------------------------------------------------------
@router.get("/export")
async def export_audit_logs(
    format: str = Query("csv", regex="^(csv|json)$"),
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Export audit logs for superadmins (CSV or JSON format)."""
    api_key, org = auth

    if api_key.role != ApiKeyRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Forbidden: Only superadmins can export audit logs")

    # Query all audit logs (superadmins see everything)
    logs = (
        db.query(ApiAuditLog)
        .order_by(ApiAuditLog.created_at.desc())
        .limit(10000)
        .all()
    )

    # Generate export data
    export_bytes = _generate_export_data(logs, format)
    extension = "json" if format == "json" else "csv"
    media_type = "application/json" if format == "json" else "text/csv"
    filename = f"audit_logs_{datetime.now(UTC).strftime('%Y-%m-%dT%H%M%S')}.{extension}"

    return StreamingResponse(
        iter([export_bytes]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# --------------------------------------------------------------------
# Export audit logs with cryptographic signature
# --------------------------------------------------------------------
@router.get("/export/signed")
async def export_audit_logs_signed(
    format: str = Query("csv", regex="^(csv|json)$"),
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Export audit logs with cryptographic signature for superadmins."""
    api_key, org = auth

    if api_key.role != ApiKeyRole.SUPERADMIN:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only superadmins can export signed audit logs",
        )

    # Query all audit logs (superadmins see everything)
    logs = (
        db.query(ApiAuditLog)
        .order_by(ApiAuditLog.created_at.desc())
        .limit(10000)
        .all()
    )

    # Generate export data
    export_bytes = _generate_export_data(logs, format)
    
    # Sign the data
    try:
        signature = _sign_data(export_bytes)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sign export: {str(e)}",
        )

    # Generate filename matching the export
    extension = "json" if format == "json" else "csv"
    timestamp = datetime.now(UTC).strftime("%Y-%m-%dT%H%M%S")
    data_filename = f"audit_logs_{timestamp}.{extension}"
    sig_filename = f"audit_logs_{timestamp}.{extension}.sig"

    # Encode export data as base64 for transmission
    export_data_b64 = base64.b64encode(export_bytes).decode()

    return {
        "data": export_data_b64,
        "data_filename": data_filename,
        "signature": signature,
        "signature_filename": sig_filename,
        "format": format,
        "timestamp": timestamp,
    }
