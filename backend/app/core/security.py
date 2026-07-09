"""Security middleware and authentication for FrameForge."""
import time
from collections import defaultdict
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import structlog

from app.core.config import get_settings

logger = structlog.get_logger()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter. For multi-instance deployments, use Redis."""

    def __init__(self, app):
        super().__init__(app)
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_id(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _is_rate_limited(self, client_id: str, path: str) -> bool:
        settings = get_settings()
        now = time.time()
        window = 60.0  # 1 minute window

        # Determine rate limit based on path
        if "/generate/" in path:
            limit = settings.generation_rate_limit_per_minute
        else:
            limit = settings.rate_limit_per_minute

        key = f"{client_id}:{path.split('/')[2] if len(path.split('/')) > 2 else 'general'}"
        requests = self._requests[key]

        # Clean old entries
        self._requests[key] = [t for t in requests if now - t < window]

        if len(self._requests[key]) >= limit:
            return True

        self._requests[key].append(now)
        return False

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and docs
        path = request.url.path
        if path in ("/api/health", "/api/docs", "/api/openapi.json", "/api/redoc"):
            return await call_next(request)

        client_id = self._get_client_id(request)

        if self._is_rate_limited(client_id, path):
            logger.warning("rate_limited", client=client_id, path=path)
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded. Please wait before retrying.",
                    "error_code": "RATE_LIMIT",
                    "type": "RateLimitError",
                },
            )

        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all incoming requests with timing."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 1)

        # Skip noisy health checks
        if request.url.path != "/api/health":
            logger.info(
                "http_request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=duration_ms,
            )

        return response


def verify_api_key(request: Request) -> bool:
    """Verify API key if configured. Returns True if access is allowed."""
    settings = get_settings()
    if not settings.api_key:
        return True  # No API key configured = open access

    # Check header
    auth_header = request.headers.get("X-API-Key") or request.headers.get("Authorization")
    if auth_header:
        if auth_header.startswith("Bearer "):
            auth_header = auth_header[7:]
        return auth_header == settings.api_key

    return False
