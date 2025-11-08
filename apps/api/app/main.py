"""Main FastAPI application."""
import os

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from apps.api.app.core.config import settings
from apps.api.app.core.errors import ForbiddenError
from apps.api.app.core.errors_handlers import forbidden_handler, generic_handler
from apps.api.app.core.logging import configure_logging
from apps.api.app.core.ratelimit import init_rate_limit
from apps.api.app.routers import (
    audit,
    auth,
    auth_admin,
    consents,
    health,
    organizations,
    rights,
    users,
    webhooks,
)

# Configure structured logging
configure_logging()
log = structlog.get_logger()

# Create tables (in production, use migrations)
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ConsentVault API",
    description="Production-grade consent management API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Prometheus metrics
Instrumentator(should_group_status_codes=True).instrument(app).expose(app, endpoint="/metrics")


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


# Body size limit middleware
class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Enforce body size limit."""

    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            # Check Content-Length header first
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    if int(content_length) > settings.api_body_max_bytes:
                        return Response(
                            content='{"detail":"Request body too large"}',
                            status_code=413,
                            media_type="application/json",
                        )
                except ValueError:
                    pass  # Invalid content-length, let it through
        response = await call_next(request)
        return response


# Environment-based middleware
ENV = os.getenv("ENV", "development")
default_allowed_hosts = ["localhost", "127.0.0.1", "testserver"]
env_allowed_hosts = os.getenv("ALLOWED_HOSTS")
if env_allowed_hosts:
    ALLOWED_HOSTS = [h.strip() for h in env_allowed_hosts.split(",") if h.strip()]
else:
    ALLOWED_HOSTS = list(default_allowed_hosts)
# Ensure test clients are always permitted
if "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

# HTTPS redirect for staging/production
if ENV in ("staging", "production"):
    app.add_middleware(HTTPSRedirectMiddleware)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[h.strip() for h in ALLOWED_HOSTS if h.strip()],
)

# CORS middleware
cors_origins = settings.cors_origins_list or settings.allowed_origins_list
wildcard_cors = False
if not cors_origins and settings.env.lower() in {"local", "development"}:
    wildcard_cors = True

if wildcard_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
elif cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Body size limit
app.add_middleware(BodySizeLimitMiddleware)

# Error handlers
app.add_exception_handler(ForbiddenError, forbidden_handler)
app.add_exception_handler(Exception, generic_handler)

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(auth_admin.router)
app.include_router(consents.router)
app.include_router(rights.router)
app.include_router(webhooks.router)
app.include_router(audit.router)
app.include_router(organizations.router)
app.include_router(users.router)


@app.on_event("startup")
async def startup():
    """Initialize services on startup."""
    await init_rate_limit(app)
    log.info("application_started", env=ENV)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ConsentVault API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/debug/env")
async def debug_env():
    """
    Debug endpoint to show environment variables (local/dev only).
    
    Masks sensitive values like passwords and keys.
    """
    if ENV not in ("development", "local"):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available in development/local environments"
        )

    import os

    # List of sensitive keys to mask
    sensitive_keys = {
        "password", "secret", "key", "token", "credential", "hmac", "encryption"
    }

    env_vars: dict[str, str] = {}
    for key, value in os.environ.items():
        key_lower = key.lower()
        # Mask sensitive values
        if any(sensitive in key_lower for sensitive in sensitive_keys):
            if value:
                # Show first 4 and last 4 chars, mask the middle
                if len(value) > 8:
                    env_vars[key] = f"{value[:4]}...{value[-4:]}"
                else:
                    env_vars[key] = "***"
            else:
                env_vars[key] = ""
        else:
            env_vars[key] = value

    return {
        "environment": ENV,
        "variables": env_vars,
        "note": "Sensitive values are masked. This endpoint is only available in development/local."
    }
