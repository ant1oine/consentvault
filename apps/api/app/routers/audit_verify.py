"""Audit verification router — verify SHA256 hash matches stored audit log entries."""
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey, ApiKeyRole
from apps.api.app.models.audit_log import ApiAuditLog

router = APIRouter(prefix="/v1/admin/audit", tags=["audit"])


def sha256_digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class AuditVerifyRequest(BaseModel):
    """Payload submitted for hash verification."""
    payload: str = Field(..., description="Raw request or response body as JSON/text")


class AuditVerifyResponse(BaseModel):
    """Verification result."""
    hash: str
    matches: bool
    matched_entry_id: int | None = None
    method: str | None = None
    path: str | None = None
    created_at: str | None = None


@router.post("/verify", response_model=AuditVerifyResponse, status_code=status.HTTP_200_OK)
async def verify_audit_entry(
    data: AuditVerifyRequest,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, int] = Depends(verify_api_key_auth),
):
    """Verify a given payload matches an existing audit log hash."""
    api_key, org = auth

    # Compute hash of provided payload
    computed_hash = sha256_digest(data.payload.encode("utf-8"))

    # SUPERADMIN can see all; others only their organization
    query = db.query(ApiAuditLog)
    if api_key.role != ApiKeyRole.SUPERADMIN:
        query = query.filter(ApiAuditLog.organization_id == org.id)

    match = (
        query.filter(
            (ApiAuditLog.request_hash == computed_hash)
            | (ApiAuditLog.response_hash == computed_hash)
        )
        .order_by(ApiAuditLog.id.desc())
        .first()
    )

    if match:
        return AuditVerifyResponse(
            hash=computed_hash,
            matches=True,
            matched_entry_id=match.id,
            method=match.method,
            path=match.path,
            created_at=match.created_at.isoformat(),
        )

    return AuditVerifyResponse(hash=computed_hash, matches=False)
