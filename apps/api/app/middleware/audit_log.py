"""Audit logging middleware — records all API traffic with cryptographic digests."""
import hashlib
import structlog
from io import BytesIO
from fastapi import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from apps.api.app.db.session import SessionLocal
from apps.api.app.models.audit_log import ApiAuditLog
from apps.api.app.deps.auth import extract_auth_context

log = structlog.get_logger()


def sha256_digest(data: bytes) -> str | None:
    """Return a SHA256 hex digest for given data."""
    if not data:
        return None
    return hashlib.sha256(data).hexdigest()


class AuditLogMiddleware:
    """ASGI middleware that intercepts requests and responses for hashing."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        if path in ("/healthz", "/metrics", "/docs", "/redoc", "/openapi.json", "/"):
            return await self.app(scope, receive, send)

        # --- Capture request body ---
        body_bytes = b""
        more_body = True

        async def wrapped_receive():
            nonlocal body_bytes, more_body
            if more_body:
                message = await receive()
                if message["type"] == "http.request":
                    body_bytes += message.get("body", b"")
                    more_body = message.get("more_body", False)
                return message
            return {"type": "http.request", "body": b"", "more_body": False}

        # --- Capture response body ---
        response_body = b""
        status_code = None

        async def wrapped_send(message):
            nonlocal response_body, status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            elif message["type"] == "http.response.body":
                response_body += message.get("body", b"")
            await send(message)

        # --- Execute the next app ---
        await self.app(scope, wrapped_receive, wrapped_send)

        # --- Log to DB ---
        try:
            request = Request(scope)
            auth_ctx = await extract_auth_context(request)
            if auth_ctx:
                db = SessionLocal()
                try:
                    log_entry = ApiAuditLog(
                        organization_id=auth_ctx["org_id"],
                        api_key_id=auth_ctx["api_key_id"],
                        method=scope["method"],
                        path=path,
                        status_code=status_code or 0,
                        ip_address=scope.get("client", [""])[0],
                        request_hash=sha256_digest(body_bytes),
                        response_hash=sha256_digest(response_body),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception as e:
                    db.rollback()
                    log.error("audit_log_write_failed", error=str(e), path=path)
                finally:
                    db.close()
        except Exception as e:
            log.error("audit_log_middleware_error", error=str(e), path=path)
