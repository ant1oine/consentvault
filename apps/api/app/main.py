"""Main FastAPI application."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.routers import auth, billing, consents, export, health, orgs, widget


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown."""
    # Startup: Initialize database
    init_db()
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
app.include_router(auth.router)
app.include_router(orgs.router)
app.include_router(consents.router)
app.include_router(export.router)
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
