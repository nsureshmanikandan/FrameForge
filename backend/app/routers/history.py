import json
import re
from pathlib import Path
from fastapi import APIRouter
from app.models.responses import HistoryItem, GenerationResult
from app.core.config import get_settings
from app.core.exceptions import GenerationError

router = APIRouter(prefix="/history", tags=["history"])


def _history_path() -> Path:
    return Path(get_settings().local_history_dir)


@router.get("", response_model=list[HistoryItem])
async def list_history() -> list[HistoryItem]:
    p = _history_path()
    if not p.exists():
        return []

    items: list[HistoryItem] = []
    for f in sorted(p.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text())
            meta = data.get("meta", {})
            files = data.get("files", [])
            items.append(HistoryItem(
                id=meta["id"],
                figma_url=meta["figma_url"],
                mode=meta["mode"],
                stack=meta["stack"],
                created_at=meta["created_at"],
                frame_count=meta.get("frame_count", 0),
                file_count=len(files),
            ))
        except Exception:
            continue

    return items


@router.get("/{generation_id}", response_model=GenerationResult)
async def get_generation(generation_id: str) -> GenerationResult:
    if not re.match(r"^[a-f0-9\-]{36}$", generation_id):
        raise GenerationError("Invalid generation ID")
    f = _history_path() / f"{generation_id}.json"
    if not f.exists():
        raise GenerationError("Generation not found")
    return GenerationResult(**json.loads(f.read_text()))


@router.delete("/{generation_id}")
async def delete_generation(generation_id: str) -> dict:
    if not re.match(r"^[a-f0-9\-]{36}$", generation_id):
        raise GenerationError("Invalid generation ID")
    f = _history_path() / f"{generation_id}.json"
    if f.exists():
        f.unlink()
    return {"deleted": True}
