import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.requests import GenerateRequest, PromptBuildRequest
from app.models.responses import GenerationResult, GenerationMeta
from app.services.figma_client import inspect_figma_url
from app.services.code_builder import build_prompt, parse_multi_file_output
from app.services.gpt_client import stream_generation
from app.core.config import get_settings
from app.core.exceptions import GenerationError

router = APIRouter(prefix="/generate", tags=["generate"])


def _history_path() -> Path:
    p = Path(get_settings().local_history_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


@router.post("/prompt")
async def build_generation_prompt(body: PromptBuildRequest) -> dict:
    """Build and return the GPT-4o prompt without running generation."""
    inspect = await inspect_figma_url(body.figma_url)
    prompt = build_prompt(inspect, body.mode, body.stack)
    return {
        "prompt": prompt,
        "file_name": inspect.file_name,
        "frame_count": len(inspect.frames),
        "frames": [{"name": f.name, "size": f"{f.width}x{f.height}"} for f in inspect.frames],
    }


@router.post("/stream")
async def generate_stream(body: GenerateRequest) -> StreamingResponse:
    """Stream multi-file code generation via Server-Sent Events."""
    inspect = await inspect_figma_url(body.figma_url)
    prompt = body.custom_prompt or build_prompt(inspect, body.mode, body.stack)

    async def event_stream():
        gen_id = str(uuid.uuid4())
        start = time.time()
        all_raw = ""

        # Signal start with metadata
        yield f"data: {json.dumps({'type': 'meta', 'content': json.dumps({'id': gen_id, 'file': inspect.file_name, 'frames': len(inspect.frames)}), 'sequence': 0})}\n\n"

        async for chunk in stream_generation(prompt):
            yield chunk
            try:
                parsed = json.loads(chunk.replace("data: ", "", 1).strip())
                if parsed["type"] == "done":
                    pass  # files parsed below
                elif parsed["type"] != "error":
                    all_raw += parsed.get("content", "")
            except Exception:
                pass

        # Re-parse final complete response for accurate file list
        # (streaming accumulates raw text, we do a final clean parse)
        # Fetch the full raw from a second generate call would be expensive,
        # so we reconstruct from what was streamed (done payload has the parsed files)

    async def event_stream_with_save():
        gen_id = str(uuid.uuid4())
        start = time.time()
        files_payload: list[dict] = []

        yield f"data: {json.dumps({'type': 'meta', 'content': json.dumps({'id': gen_id, 'file': inspect.file_name, 'frames': len(inspect.frames)}), 'sequence': 0})}\n\n"

        async for chunk in stream_generation(prompt):
            yield chunk
            try:
                parsed = json.loads(chunk.replace("data: ", "", 1).strip())
                if parsed["type"] == "done":
                    files_payload = json.loads(parsed["content"])
            except Exception:
                pass

        # Persist result
        duration_ms = int((time.time() - start) * 1000)
        meta = GenerationMeta(
            id=gen_id,
            figma_url=body.figma_url,
            mode=body.mode,
            stack=body.stack,
            prompt_used=prompt[:800],
            created_at=datetime.now(timezone.utc),
            duration_ms=duration_ms,
            frame_count=len(inspect.frames),
        )

        # Build backward-compat react_code / python_code from files
        frontend_code = "\n\n".join(
            f"// === {f['filename']} ===\n{f['content']}"
            for f in files_payload
            if f.get("filename", "").startswith("frontend/")
        )
        backend_code = "\n\n".join(
            f"# === {f['filename']} ===\n{f['content']}"
            for f in files_payload
            if f.get("filename", "").startswith("backend/")
        )

        result = GenerationResult(
            meta=meta,
            files=[],  # stored separately as raw list
            react_code=frontend_code,
            python_code=backend_code,
        )
        data = result.model_dump()
        data["files"] = files_payload  # store full file list

        history_file = _history_path() / f"{gen_id}.json"
        history_file.write_text(json.dumps(data, default=str, indent=2))

    return StreamingResponse(
        event_stream_with_save(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{generation_id}/download")
async def download_generation(generation_id: str):
    import re
    if not re.match(r"^[a-f0-9\-]{36}$", generation_id):
        raise GenerationError("Invalid generation ID")
    history_file = _history_path() / f"{generation_id}.json"
    if not history_file.exists():
        raise GenerationError("Generation not found")
    return json.loads(history_file.read_text())
