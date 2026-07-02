"""FastAPI application entry point for AI Audio Detector."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import APP_VERSION, settings
from .routers import analysis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Audio Detector",
    description="Detect AI-generated music using signal processing and spectral analysis",
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)


@app.on_event("startup")
async def startup():
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    logger.info(
        "AI Audio Detector v%s started. Upload dir: %s",
        APP_VERSION, settings.upload_dir,
    )
    if settings.rate_limit_enabled:
        logger.info(
            "Rate limit: %d req / %ds window",
            settings.rate_limit_max_requests,
            settings.rate_limit_window_seconds,
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
