"""Error handlers for FastAPI application."""
import structlog
from fastapi import Request
from fastapi.responses import JSONResponse

from apps.api.app.core.errors import ForbiddenError

log = structlog.get_logger()


async def forbidden_handler(request: Request, exc: ForbiddenError):
    """Handle ForbiddenError exceptions."""
    log.warn("forbidden", path=str(request.url))
    return JSONResponse(status_code=403, content={"detail": str(exc)})


async def generic_handler(request: Request, exc: Exception):
    """Handle generic unhandled exceptions."""
    log.error("unhandled_exception", path=str(request.url), exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

