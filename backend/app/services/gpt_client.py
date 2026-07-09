import json
import re
import structlog
from typing import AsyncIterator
from openai import AsyncAzureOpenAI
from app.core.config import get_settings
from app.core.exceptions import GenerationError
from app.models.responses import GeneratedFile
from app.services.code_builder import parse_multi_file_output

logger = structlog.get_logger()


def _get_client() -> AsyncAzureOpenAI:
    s = get_settings()
    if not s.azure_openai_api_key:
        raise GenerationError(
            "Azure OpenAI is not configured. Set AZURE_OPENAI_API_KEY in backend/.env"
        )
    return AsyncAzureOpenAI(
        azure_endpoint=s.azure_openai_endpoint,
        api_key=s.azure_openai_api_key,
        api_version=s.azure_openai_api_version,
    )


SYSTEM_PROMPT = (
    "You are an elite full-stack engineer specialising in enterprise React/TypeScript "
    "and Python/FastAPI. You generate complete, production-ready, accessible, fully-typed "
    "multi-file projects from Figma designs.\n\n"
    "CRITICAL RULES:\n"
    "1. Output EVERY file between the exact delimiter markers: "
    "'=== FILE: <path> ===' and '=== END FILE ==='\n"
    "2. Never truncate code. Never use placeholder comments like '// rest of code here'\n"
    "3. Every component must have: loading state, error state, empty state, success state\n"
    "4. Use TypeScript strict mode - no 'any' types\n"
    "5. Follow WCAG 2.1 AA: aria-labels, keyboard navigation, semantic HTML\n"
    "6. Use Tailwind CSS exclusively - no inline styles\n"
    "7. All API calls use React Query (TanStack)\n"
    "8. FastAPI endpoints use async, proper HTTP codes, Pydantic v2 models\n"
    "9. Include proper error handling in every file\n"
    "10. Generate attractive, modern enterprise UI with proper spacing and visual hierarchy"
)


async def stream_generation(prompt: str) -> AsyncIterator[str]:
    """Yields SSE-formatted JSON strings with heartbeats."""
    client = _get_client()
    settings = get_settings()
    full_response = ""
    seq = 0
    current_file = "meta"

    logger.info(
        "generation_started",
        deployment=settings.azure_openai_deployment,
        max_tokens=settings.azure_openai_max_tokens,
    )

    try:
        stream = await client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            stream=True,
            temperature=0.12,
            max_tokens=settings.azure_openai_max_tokens,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if not delta:
                continue

            full_response += delta
            seq += 1

            # Detect which file we're currently streaming into
            if "=== FILE:" in full_response:
                file_matches = re.findall(r"===\s*FILE:\s*(.+?)\s*===", full_response)
                if file_matches:
                    last_file = file_matches[-1].strip()
                    if last_file.startswith("frontend/"):
                        current_file = "frontend"
                    elif last_file.startswith("backend/"):
                        current_file = "backend"
                    else:
                        current_file = "other"

            yield f"data: {json.dumps({'type': current_file, 'content': delta, 'sequence': seq, 'file': current_file})}\n\n"

        # Parse all files from full response
        files = parse_multi_file_output(full_response)
        files_payload = [f.model_dump() for f in files]

        logger.info(
            "generation_completed",
            file_count=len(files),
            total_chars=len(full_response),
        )

        yield f"data: {json.dumps({'type': 'done', 'content': json.dumps(files_payload), 'sequence': seq + 1})}\n\n"

    except Exception as e:
        logger.error("generation_failed", error=str(e))
        yield f"data: {json.dumps({'type': 'error', 'content': str(e), 'sequence': 0})}\n\n"


async def generate_once(prompt: str) -> list[GeneratedFile]:
    """Non-streaming generation — returns list of GeneratedFile."""
    client = _get_client()
    settings = get_settings()

    try:
        response = await client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.12,
            max_tokens=settings.azure_openai_max_tokens,
        )
        raw = response.choices[0].message.content or ""
        return parse_multi_file_output(raw)
    except Exception as e:
        raise GenerationError(f"Azure OpenAI error: {e}") from e
