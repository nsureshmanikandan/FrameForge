import structlog
from fastapi import Request
from fastapi.responses import JSONResponse

logger = structlog.get_logger()


class FrameForgeError(Exception):
    def __init__(self, message: str, status_code: int = 500, error_code: str = "INTERNAL_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


class FigmaError(FrameForgeError):
    def __init__(self, message: str):
        super().__init__(message, status_code=422, error_code="FIGMA_ERROR")


class GenerationError(FrameForgeError):
    def __init__(self, message: str):
        super().__init__(message, status_code=500, error_code="GENERATION_ERROR")


class AuthenticationError(FrameForgeError):
    def __init__(self, message: str = "Invalid or missing API key"):
        super().__init__(message, status_code=401, error_code="AUTH_ERROR")


class RateLimitError(FrameForgeError):
    def __init__(self, message: str = "Rate limit exceeded. Please wait before retrying."):
        super().__init__(message, status_code=429, error_code="RATE_LIMIT")


async def frameforge_exception_handler(request: Request, exc: FrameForgeError):
    logger.warning(
        "request_error",
        error_code=exc.error_code,
        message=exc.message,
        path=str(request.url.path),
        method=request.method,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "error_code": exc.error_code,
            "type": type(exc).__name__,
        },
    )
