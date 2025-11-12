"""Main FastAPI application."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import SessionLocal, User, init_db
from app.routers import auth, audit, billing, consents, consents_legacy, dashboard, data_rights, export, health, orgs, test, users, widget
from app.security import hash_password


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown."""
    # Startup: Initialize database
    init_db()
    
    # Create default superadmin if none exists (only if AUTO_CREATE_SUPERADMIN env is set)
    # For clean dev-reset, leave this disabled and create users manually
    if os.getenv("AUTO_CREATE_SUPERADMIN", "false").lower() == "true":
        db = SessionLocal()
        try:
            if not db.query(User).filter(User.is_superadmin == True).first():
                user = User(
                    email="admin@consentvault.ae",
                    password_hash=hash_password("SuperSecure123"),
                    is_superadmin=True
                )
                db.add(user)
                db.commit()
                print("✅ Created default superadmin admin@consentvault.ae / SuperSecure123")
        except Exception as e:
            print(f"⚠️  Could not create default superadmin: {e}")
        finally:
            db.close()
    
    yield
    # Shutdown: (if needed in the future)

app = FastAPI(
    title="ConsentVault API",
    description="Consent management API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
if settings.app_env == "dev":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # In production, use ALLOWED_ORIGINS from env
    origins = settings.allowed_origins_list
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins if origins else [],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

# Include routers
app.include_router(health.router)
app.include_router(auth.router, prefix="/v1")
app.include_router(orgs.router)
app.include_router(users.router)
app.include_router(consents.router)  # /v1/consents (API key auth)
app.include_router(consents_legacy.router)  # /consents (JWT auth for dashboard)
app.include_router(export.router)
app.include_router(dashboard.router)
app.include_router(audit.router)
app.include_router(data_rights.router)
app.include_router(test.router)
app.include_router(widget.router)
app.include_router(billing.router)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "name": "ConsentVault API",
        "version": "0.1.0",
        "docs": "/docs",
    }
