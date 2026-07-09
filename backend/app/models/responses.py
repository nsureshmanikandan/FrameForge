from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class FigmaFrame(BaseModel):
    node_id: str
    name: str
    width: float
    height: float
    thumbnail_url: str | None = None
    component_count: int = 0
    text_nodes: list[str] = []
    color_styles: list[str] = []


class FigmaInspectResponse(BaseModel):
    file_name: str
    frames: list[FigmaFrame]
    raw_node_count: int


class GeneratedFile(BaseModel):
    filename: str
    content: str
    language: str


class GenerationMeta(BaseModel):
    id: str
    figma_url: str
    mode: str
    stack: str
    prompt_used: str
    created_at: datetime
    duration_ms: int | None = None
    frame_count: int = 0


class GenerationResult(BaseModel):
    meta: GenerationMeta
    files: list[GeneratedFile] = []
    react_code: str = ""
    python_code: str = ""


class HistoryItem(BaseModel):
    id: str
    figma_url: str
    mode: str
    stack: str
    created_at: datetime
    frame_count: int = 0
    file_count: int = 0


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str = "2.0.0"
    environment: str = "development"
    services: dict[str, bool] = {}
    metadata: dict[str, str | int] = {}
