import io
import json
import re
import zipfile
import structlog
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from app.core.config import get_settings
from app.core.exceptions import GenerationError

logger = structlog.get_logger()
router = APIRouter(prefix="/export", tags=["export"])


def _history_path() -> Path:
    return Path(get_settings().local_history_dir)


def _load_generation(generation_id: str) -> dict:
    if not re.match(r"^[a-f0-9\-]{36}$", generation_id):
        raise GenerationError("Invalid generation ID")
    f = _history_path() / f"{generation_id}.json"
    if not f.exists():
        raise GenerationError("Generation not found")
    return json.loads(f.read_text())


def _validate_output_path(path_str: str) -> Path:
    """Validate and resolve the output path, preventing directory traversal."""
    try:
        out_dir = Path(path_str).resolve()
    except Exception:
        raise GenerationError("Invalid path provided")

    # Block system directories
    forbidden_prefixes = [
        "C:\\Windows", "C:\\System32", "C:\\Program Files",
        "/etc", "/usr", "/bin", "/sbin", "/boot", "/proc", "/sys",
    ]
    out_str = str(out_dir)
    for fb in forbidden_prefixes:
        if out_str.lower().startswith(fb.lower()):
            raise GenerationError(f"Cannot save to protected directory: {fb}")

    # Verify no symlink traversal
    if out_dir.exists() and out_dir.is_symlink():
        raise GenerationError("Cannot save to symlinked directories")

    return out_dir


def _build_zip(data: dict) -> io.BytesIO:
    meta = data.get("meta", {})
    files: list[dict] = data.get("files", [])

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        if files:
            for f in files:
                path = f.get("filename", "output.txt")
                content = f.get("content", "")
                zf.writestr(path, content)

            # Add scaffold extras if not already present
            filenames = {f.get("filename") for f in files}
            if not any("requirements.txt" in fn for fn in filenames):
                zf.writestr(
                    "backend/requirements.txt",
                    "fastapi==0.115.6\nuvicorn[standard]==0.32.1\npydantic==2.10.4\n"
                    "pydantic-settings==2.7.0\nhttpx==0.28.1\npython-dotenv==1.0.1\n"
                )
            if not any("package.json" in fn for fn in filenames):
                zf.writestr(
                    "frontend/package.json",
                    json.dumps({
                        "name": "frameforge-output",
                        "version": "1.0.0",
                        "type": "module",
                        "scripts": {"dev": "vite", "build": "tsc && vite build"},
                        "dependencies": {
                            "react": "^18.3.1", "react-dom": "^18.3.1",
                            "react-router-dom": "^7.1.0",
                            "@tanstack/react-query": "^5.62.8",
                            "axios": "^1.7.9", "lucide-react": "^0.468.0",
                            "clsx": "^2.1.1", "sonner": "^1.7.1"
                        },
                        "devDependencies": {
                            "typescript": "^5.7.2", "vite": "^6.0.0",
                            "@vitejs/plugin-react": "^4.3.4",
                            "tailwindcss": "^3.4.0", "autoprefixer": "^10.4.0"
                        }
                    }, indent=2)
                )
        else:
            react_code = data.get("react_code", "")
            python_code = data.get("python_code", "")
            zf.writestr("frontend/src/App.tsx", react_code)
            zf.writestr("backend/app/main.py", python_code)

        # Always add README
        figma_url = meta.get("figma_url", "")
        mode = meta.get("mode", "")
        stack = meta.get("stack", "")
        file_count = len(files)
        zf.writestr("README.md", f"""# FrameForge Generated Project

**Figma source:** {figma_url}
**Mode:** {mode} | **Stack:** {stack}
**Files generated:** {file_count}

## Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

## Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Linux/Mac
# .venv\\Scripts\\activate  # Windows
pip install -r requirements.txt
cp .env.example .env   # fill in your values
uvicorn app.main:app --reload --port 8002
```
""")
        zf.writestr("backend/.env.example",
            "AZURE_OPENAI_ENDPOINT=\nAZURE_OPENAI_API_KEY=\nAZURE_OPENAI_DEPLOYMENT=gpt-4o\n"
            "AZURE_OPENAI_API_VERSION=2024-12-01-preview\nFIGMA_ACCESS_TOKEN=\n")
        zf.writestr(".gitignore",
            "node_modules/\nfrontend/dist/\nbackend/.env\n__pycache__/\n.venv/\n*.pyc\n")

    buf.seek(0)
    return buf


@router.get("/{generation_id}/zip")
async def download_zip(generation_id: str):
    """Download entire generated project as a structured ZIP file."""
    data = _load_generation(generation_id)
    buf = _build_zip(data)
    files = data.get("files", [])
    filename = f"frameforge-{generation_id[:8]}.zip"

    logger.info("zip_downloaded", generation_id=generation_id, file_count=len(files))

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-File-Count": str(len(files)),
        },
    )


class SaveLocalRequest(BaseModel):
    local_path: str

    @field_validator("local_path")
    @classmethod
    def validate_path(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Path cannot be empty")
        if len(v) > 500:
            raise ValueError("Path too long")
        return v.strip()


@router.post("/{generation_id}/save-local")
async def save_to_local(generation_id: str, body: SaveLocalRequest):
    """Save all generated files to a local directory path."""
    data = _load_generation(generation_id)
    files: list[dict] = data.get("files", [])

    out_dir = _validate_output_path(body.local_path)
    saved_files: list[str] = []

    try:
        if files:
            for f in files:
                filepath = (out_dir / f["filename"]).resolve()
                # Ensure file stays within output directory
                if not str(filepath).startswith(str(out_dir)):
                    raise GenerationError(f"Path traversal detected: {f['filename']}")
                filepath.parent.mkdir(parents=True, exist_ok=True)
                filepath.write_text(f["content"], encoding="utf-8")
                saved_files.append(str(filepath))
        else:
            (out_dir / "frontend" / "src").mkdir(parents=True, exist_ok=True)
            (out_dir / "backend" / "app").mkdir(parents=True, exist_ok=True)
            app_path = out_dir / "frontend" / "src" / "App.tsx"
            main_path = out_dir / "backend" / "app" / "main.py"
            app_path.write_text(data.get("react_code", ""), encoding="utf-8")
            main_path.write_text(data.get("python_code", ""), encoding="utf-8")
            saved_files = [str(app_path), str(main_path)]
    except PermissionError:
        raise GenerationError(f"Permission denied writing to {body.local_path}")
    except GenerationError:
        raise
    except Exception as e:
        raise GenerationError(f"Failed to save files: {e}")

    logger.info("files_saved_locally", path=str(out_dir), file_count=len(saved_files))

    return {
        "saved": True,
        "path": str(out_dir),
        "files": saved_files,
        "file_count": len(saved_files),
    }
