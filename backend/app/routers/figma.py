from fastapi import APIRouter
from app.models.requests import FigmaInspectRequest
from app.models.responses import FigmaInspectResponse
from app.services.figma_client import inspect_figma_url, clear_cache

router = APIRouter(prefix="/figma", tags=["figma"])


@router.post("/inspect", response_model=FigmaInspectResponse)
async def inspect_figma(body: FigmaInspectRequest) -> FigmaInspectResponse:
    """Fetch Figma file metadata, frames, and thumbnails. Cached for 60s; pass force=true to bypass."""
    return await inspect_figma_url(body.figma_url, force=body.force)


@router.delete("/cache")
async def clear_figma_cache() -> dict:
    """Clear the Figma inspection cache and reload settings (call after changing FIGMA_ACCESS_TOKEN)."""
    from app.core.config import reload_settings
    clear_cache()
    reload_settings()
    return {"cleared": True, "message": "Cache cleared and settings reloaded"}
