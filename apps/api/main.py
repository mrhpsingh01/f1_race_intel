"""FastAPI application entry point for F1 Race Intelligence."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import chat, predictions, races, sessions, telemetry

logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "REST API for F1 race data ingestion, telemetry analysis, "
        "win-probability predictions, and AI-powered chat."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(races.router, prefix="/api", tags=["races"])
app.include_router(sessions.router, prefix="/api", tags=["sessions"])
app.include_router(telemetry.router, prefix="/api", tags=["telemetry"])
app.include_router(predictions.router, prefix="/api", tags=["predictions"])
app.include_router(chat.router, prefix="/api", tags=["chat"])


# ---------------------------------------------------------------------------
# Lifecycle events
# ---------------------------------------------------------------------------


@app.on_event("startup")
async def _on_startup() -> None:
    """Log application startup information."""
    logger.info(
        "Starting %s v%s | DB=%s",
        settings.app_name,
        settings.app_version,
        settings.database_url.split("@")[-1],  # omit credentials from log
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/api/health", tags=["health"])
async def health() -> dict:
    """Return a simple liveness response."""
    return {"status": "ok", "version": settings.app_version}
