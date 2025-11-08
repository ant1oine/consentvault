"""Main FastAPI application."""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from apps.api.app.core.config import settings
from apps.api.app.routers import health, auth_admin, consents, rights, webhooks, audit, organizations
from apps.api.app.db.base import Base
from apps.api.app.db.session import engine

# Create tables (in production, use migrations)
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ConsentVault API",
    description="Production-grade consent management API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


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


# CORS middleware
if settings.allowed_origins_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Body size limit
app.add_middleware(BodySizeLimitMiddleware)

# Include routers
app.include_router(health.router)
app.include_router(auth_admin.router)
app.include_router(consents.router)
app.include_router(rights.router)
app.include_router(webhooks.router)
app.include_router(audit.router)
app.include_router(organizations.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ConsentVault API",
        "version": "0.1.0",
        "docs": "/docs",
    }

