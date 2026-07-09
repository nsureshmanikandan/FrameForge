import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.exceptions import FrameForgeError, frameforge_exception_handler
from app.core.logging import setup_logging
from app.core.security import RateLimitMiddleware, RequestLoggingMiddleware
from app.routers import figma, generate, history, export

# Initialize logging before anything else
setup_logging()
logger = structlog.get_logger()

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    logger.info(
        "app_startup",
        version=settings.app_version,
        environment=settings.environment,
        openai_configured=bool(settings.azure_openai_api_key),
        figma_configured=bool(settings.figma_access_token),
    )
    yield
    logger.info("app_shutdown")


app = FastAPI(
    title="FrameForge API",
    description="Enterprise Figma → Production Code Generator powered by Azure GPT-4o",
    version=settings.app_version,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Middleware stack (order matters — last added = first executed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id", "X-File-Count"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Exception handlers
app.add_exception_handler(FrameForgeError, frameforge_exception_handler)

# Routers
app.include_router(figma.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/api/health")
async def health():
    """Comprehensive health check endpoint."""
    from app.models.responses import HealthResponse
    import platform
    from pathlib import Path

    history_dir = Path(settings.local_history_dir)
    history_count = len(list(history_dir.glob("*.json"))) if history_dir.exists() else 0

    return HealthResponse(
        status="ok" if (settings.azure_openai_api_key and settings.figma_access_token) else "degraded",
        version=settings.app_version,
        environment=settings.environment,
        services={
            "azure_openai": bool(settings.azure_openai_api_key),
            "figma": bool(settings.figma_access_token),
            "storage": True,
        },
        metadata={
            "python_version": platform.python_version(),
            "history_count": history_count,
            "max_tokens": settings.azure_openai_max_tokens,
            "deployment": settings.azure_openai_deployment,
        },
    )
