import re
import time
from functools import lru_cache
import httpx
from app.core.config import get_settings
from app.core.exceptions import FigmaError
from app.models.responses import FigmaFrame, FigmaInspectResponse

# In-memory cache: file_key → (timestamp, FigmaInspectResponse)
_cache: dict[str, tuple[float, FigmaInspectResponse]] = {}
CACHE_TTL = 60  # 1 minute


def _parse_figma_url(url: str) -> tuple[str, str | None]:
    match = re.search(r"figma\.com/(?:file|design)/([^/?#]+)", url)
    if not match:
        raise FigmaError(f"Cannot parse Figma file key from URL: {url}")
    file_key = match.group(1)
    node_match = re.search(r"node-id=([^&]+)", url)
    node_id = node_match.group(1).replace("-", ":") if node_match else None
    return file_key, node_id


def _extract_text_nodes(node: dict, results: list[str]) -> None:
    if node.get("type") == "TEXT":
        chars = node.get("characters", "")
        if chars:
            results.append(chars[:120])
    for child in node.get("children", []):
        _extract_text_nodes(child, results)


def _extract_colors(node: dict, results: set[str]) -> None:
    for fill in node.get("fills", []):
        color = fill.get("color")
        if color:
            r = int(color.get("r", 0) * 255)
            g = int(color.get("g", 0) * 255)
            b = int(color.get("b", 0) * 255)
            results.add(f"#{r:02x}{g:02x}{b:02x}")
    for child in node.get("children", []):
        _extract_colors(child, results)


async def _fetch_with_retry(
    client: httpx.AsyncClient,
    url: str,
    headers: dict,
    params: dict | None = None,
) -> httpx.Response:
    """Single GET — fails immediately on 429 so the frontend countdown handles the wait."""
    resp = await client.get(url, headers=headers, params=params or {})
    if resp.status_code == 429:
        retry_after_raw = resp.headers.get("Retry-After", "30")
        try:
            retry_seconds = int(retry_after_raw)
        except ValueError:
            retry_seconds = 60

        # If retry-after is extremely long (>10 min), the token is likely
        # exhausted or invalid — give a more helpful message
        if retry_seconds > 600:
            raise FigmaError(
                "Figma API access is blocked (retry-after: "
                f"{retry_seconds // 3600}h {(retry_seconds % 3600) // 60}m). "
                "This usually means your FIGMA_ACCESS_TOKEN is expired or "
                "rate-limited for the day. Generate a new token at: "
                "figma.com → Settings → Personal Access Tokens"
            )
        raise FigmaError(
            f"rate limit: Figma API rate limit hit. "
            f"Wait {retry_seconds}s before retrying."
        )
    return resp


async def inspect_figma_url(url: str, force: bool = False) -> FigmaInspectResponse:
    settings = get_settings()

    if not settings.figma_access_token:
        raise FigmaError(
            "FIGMA_ACCESS_TOKEN is not set. Add it to backend/.env — "
            "get yours at figma.com → Account Settings → Personal Access Tokens"
        )

    file_key, _ = _parse_figma_url(url)

    # Return cached result if fresh (skip if force=True)
    if not force:
        cached = _cache.get(file_key)
        if cached:
            ts, result = cached
            if time.time() - ts < CACHE_TTL:
                return result

    headers = {"X-Figma-Token": settings.figma_access_token}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            file_resp = await _fetch_with_retry(
                client,
                f"{settings.figma_api_base}/files/{file_key}",
                headers,
                params={"depth": 2},
            )

            if file_resp.status_code == 403:
                raise FigmaError("Figma token is invalid or this file is private — check FIGMA_ACCESS_TOKEN")
            if file_resp.status_code == 404:
                raise FigmaError("Figma file not found — check your URL")
            if not file_resp.is_success:
                raise FigmaError(f"Figma API error {file_resp.status_code}: {file_resp.text[:200]}")

            data = file_resp.json()
            file_name = data.get("name", "Untitled")
            canvas = data.get("document", {}).get("children", [])

            frames: list[FigmaFrame] = []
            for page in canvas:
                for child in page.get("children", []):
                    if child.get("type") in ("FRAME", "COMPONENT", "SECTION", "GROUP"):
                        text_nodes: list[str] = []
                        color_set: set[str] = set()
                        _extract_text_nodes(child, text_nodes)
                        _extract_colors(child, color_set)
                        bb = child.get("absoluteBoundingBox", {})
                        frames.append(FigmaFrame(
                            node_id=child["id"],
                            name=child.get("name", "Frame"),
                            width=bb.get("width", 0),
                            height=bb.get("height", 0),
                            component_count=len([
                                c for c in child.get("children", [])
                                if c.get("type") == "COMPONENT"
                            ]),
                            text_nodes=text_nodes[:10],
                            color_styles=list(color_set)[:8],
                        ))

            if not frames:
                raise FigmaError(
                    "No frames found in this Figma file. "
                    "Make sure the file has at least one Frame (not just groups or components)."
                )

            # Thumbnails — best-effort, single request for up to 6 frames
            try:
                ids = ",".join(f.node_id for f in frames[:6])
                thumb_resp = await _fetch_with_retry(
                    client,
                    f"{settings.figma_api_base}/images/{file_key}",
                    headers,
                    params={"ids": ids, "format": "png", "scale": 1},
                )
                if thumb_resp.is_success:
                    images = thumb_resp.json().get("images", {})
                    for frame in frames:
                        frame.thumbnail_url = images.get(frame.node_id)
            except Exception:
                pass  # thumbnails are optional

            result = FigmaInspectResponse(
                file_name=file_name,
                frames=frames[:12],
                raw_node_count=len(frames),
            )

            # Store in cache
            _cache[file_key] = (time.time(), result)
            return result

    except FigmaError:
        raise
    except httpx.TimeoutException:
        raise FigmaError("Figma API timed out — check your network and try again")
    except httpx.RequestError as e:
        raise FigmaError(f"Network error connecting to Figma: {e}")
    except Exception as e:
        raise FigmaError(f"Unexpected error inspecting Figma file: {e}")


def clear_cache(file_key: str | None = None) -> None:
    """Clear inspection cache — call after token changes."""
    if file_key:
        _cache.pop(file_key, None)
    else:
        _cache.clear()
