import re
from app.models.responses import FigmaFrame, FigmaInspectResponse, GeneratedFile
from typing import Literal


STACK_LABELS = {
    "react_typescript": "React 18 + TypeScript + Tailwind CSS + Vite",
    "nextjs": "Next.js 14 App Router + TypeScript + Tailwind CSS",
}

FILE_DELIMITER_START = "=== FILE:"
FILE_DELIMITER_END = "=== END FILE ==="

ENTERPRISE_RULES = """
ENTERPRISE CODE STANDARDS (non-negotiable):
- Full TypeScript types everywhere — no `any`, no implicit types
- Pydantic v2 models for ALL request/response shapes
- Every component has: loading state, error state, empty state, success state
- WCAG 2.1 AA: aria-labels, keyboard navigation, focus rings, semantic HTML
- Tailwind CSS only — no inline styles, modern color palette, proper spacing
- Lucide React icons — no emojis, consistent sizing
- React Query (TanStack) for all async data fetching with caching + retry
- FastAPI async endpoints — proper HTTP status codes, structured error responses
- Environment variables via pydantic-settings — never hardcoded secrets
- Components are focused and single-purpose

UI DESIGN STANDARDS (make it look enterprise-grade):
- Use a cohesive dark or light theme with CSS variables for theming
- Apply visual hierarchy: headings, subheadings, body text, captions with distinct sizing
- Use cards with subtle borders, rounded corners (rounded-lg/xl), and hover states
- Add micro-animations: hover transitions (duration-150), subtle shadows on elevation
- Proper spacing: consistent gap/padding using Tailwind's spacing scale (gap-4, p-6)
- Data-rich UIs: badges, progress indicators, status dots, metric cards
- Responsive layouts: flex/grid with proper breakpoint handling (sm/md/lg)
- Empty states with illustrations or icons and helpful messaging
- Toast notifications for async operations feedback
- Use gradient accents sparingly for premium feel (bg-gradient-to-r)
"""


def _frame_summary(frame: FigmaFrame) -> str:
    colors = ", ".join(frame.color_styles[:4]) if frame.color_styles else "none"
    texts = ", ".join(f'"{t}"' for t in frame.text_nodes[:5]) if frame.text_nodes else "none"
    return (
        f'  - Frame: "{frame.name}" | Size: {frame.width}×{frame.height}px | '
        f'Components: {frame.component_count} | '
        f'Text: {texts} | Colors: {colors}'
    )


def _to_component_name(name: str) -> str:
    """Convert 'price forecasting dashboard' → 'PriceForecastingDashboard'"""
    words = re.sub(r"[^a-zA-Z0-9 ]", " ", name).split()
    return "".join(w.capitalize() for w in words if w) or "Component"


def build_prompt(
    inspect: FigmaInspectResponse,
    mode: Literal["scaffold", "component", "prompt_edit"],
    stack: str,
) -> str:
    stack_label = STACK_LABELS.get(stack, stack)
    frames = inspect.frames

    frames_section = "\n".join(_frame_summary(f) for f in frames)
    component_names = [_to_component_name(f.name) for f in frames]

    if mode == "scaffold":
        # Full multi-file project from ALL frames
        file_list_frontend = "\n".join(
            f"  - frontend/src/pages/{_to_component_name(f.name)}.tsx  (page for frame: {f.name})"
            for f in frames
        )
        file_list_backend = "\n".join(
            f"  - backend/app/routers/{_to_component_name(f.name).lower()}.py  (router for: {f.name})"
            for f in frames
        )

        return f"""You are an elite full-stack engineer. Generate a COMPLETE, PRODUCTION-READY multi-file project.

Figma File: "{inspect.file_name}"
Total frames to implement: {len(frames)}

FRAMES (each becomes its own page/component):
{frames_section}

Target Stack: {stack_label}
{ENTERPRISE_RULES}

Generate ALL of the following files. Each file must be complete and working.

FRONTEND FILES REQUIRED:
  - frontend/src/App.tsx  (root router, imports all pages below)
  - frontend/src/main.tsx  (entry point)
  - frontend/src/index.css  (Tailwind directives + base styles)
  - frontend/src/types/index.ts  (ALL TypeScript interfaces)
  - frontend/src/hooks/useApi.ts  (React Query hooks for all endpoints)
{file_list_frontend}
  - frontend/src/components/layout/Sidebar.tsx
  - frontend/src/components/layout/TopBar.tsx
  - frontend/src/components/ui/Button.tsx
  - frontend/src/components/ui/Input.tsx
  - frontend/src/components/ui/Badge.tsx
  - frontend/src/components/ui/Spinner.tsx
  - frontend/package.json
  - frontend/vite.config.ts
  - frontend/tailwind.config.ts
  - frontend/tsconfig.json

BACKEND FILES REQUIRED:
  - backend/app/main.py  (FastAPI app, includes all routers)
  - backend/app/models/schemas.py  (ALL Pydantic models)
  - backend/app/core/config.py  (pydantic-settings)
{file_list_backend}
  - backend/requirements.txt
  - backend/.env.example
  - README.md

OUTPUT FORMAT — use these EXACT delimiters for every file:
=== FILE: <relative/path/filename.ext> ===
<complete file content here>
=== END FILE ===

Generate every file listed. No placeholders. No "TODO". No truncation.
"""

    elif mode == "component":
        # One component per frame — focused pairs
        file_list = "\n".join(
            f"  - frontend/src/components/{name}.tsx\n  - backend/app/routers/{name.lower()}.py"
            for name in component_names
        )

        return f"""You are an elite full-stack engineer. Generate production-ready component pairs — one React component + one FastAPI endpoint per Figma frame.

Figma File: "{inspect.file_name}"
Frames ({len(frames)} total — one component pair per frame):
{frames_section}

Target Stack: {stack_label}
{ENTERPRISE_RULES}

Generate these files:
{file_list}
  - frontend/src/types/index.ts  (shared TypeScript interfaces)
  - backend/app/models/schemas.py  (shared Pydantic models)

Each component must:
- Match the layout and content from its Figma frame
- Have loading, error, empty, success states
- Use React Query to call its matching FastAPI endpoint
- Be fully accessible

Each FastAPI router must:
- Have typed Pydantic request/response models
- Return realistic mock data matching the frame's content
- Have proper error handling

OUTPUT FORMAT:
=== FILE: <path> ===
<content>
=== END FILE ===
"""

    else:  # prompt_edit
        return f"""You are an elite full-stack engineer. Generate production-ready code from this Figma design.

Figma File: "{inspect.file_name}"
Frames ({len(frames)}):
{frames_section}

Target Stack: {stack_label}
{ENTERPRISE_RULES}

[USER: Edit this prompt to customise what gets generated, then click Generate]

Generate one React component + one FastAPI endpoint per frame.
Include shared types and models.

OUTPUT FORMAT:
=== FILE: <path> ===
<content>
=== END FILE ===
"""


def parse_multi_file_output(raw: str) -> list[GeneratedFile]:
    """Parse GPT output with === FILE: ... === END FILE === delimiters into file list."""
    pattern = re.compile(
        r"===\s*FILE:\s*(.+?)\s*===\n(.*?)===\s*END FILE\s*===",
        re.DOTALL,
    )
    results: list[GeneratedFile] = []

    for match in pattern.finditer(raw):
        filename = match.group(1).strip()
        content = match.group(2).strip()
        # Remove backtick fences GPT sometimes wraps around code
        content = re.sub(r"^```[a-z]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
        content = content.strip()

        language = _detect_language(filename)
        results.append(GeneratedFile(filename=filename, content=content, language=language))

    # Fallback: if no delimiters found, treat as single component
    if not results and raw.strip():
        results.append(GeneratedFile(
            filename="frontend/src/Component.tsx",
            content=raw.strip(),
            language="typescript",
        ))

    return results


def _detect_language(filename: str) -> str:
    ext_map = {
        ".tsx": "typescript", ".ts": "typescript",
        ".py": "python",
        ".json": "json",
        ".md": "markdown",
        ".css": "css",
        ".html": "html",
        ".toml": "toml",
    }
    for ext, lang in ext_map.items():
        if filename.endswith(ext):
            return lang
    return "text"
