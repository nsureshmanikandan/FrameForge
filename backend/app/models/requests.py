from pydantic import BaseModel, HttpUrl, field_validator
from typing import Literal
import re


class FigmaInspectRequest(BaseModel):
    figma_url: str
    force: bool = False

    @field_validator("figma_url")
    @classmethod
    def validate_figma_url(cls, v: str) -> str:
        if "figma.com" not in v:
            raise ValueError("Must be a valid Figma URL")
        return v


class GenerateRequest(BaseModel):
    figma_url: str
    mode: Literal["scaffold", "component", "prompt_edit"]
    custom_prompt: str | None = None
    stack: Literal["react_typescript", "nextjs"] = "react_typescript"

    @field_validator("figma_url")
    @classmethod
    def validate_figma_url(cls, v: str) -> str:
        if "figma.com" not in v:
            raise ValueError("Must be a valid Figma URL")
        return v

    @field_validator("custom_prompt")
    @classmethod
    def validate_custom_prompt(cls, v: str | None, info) -> str | None:
        if info.data.get("mode") == "prompt_edit" and not v:
            raise ValueError("custom_prompt is required for prompt_edit mode")
        return v


class PromptBuildRequest(BaseModel):
    figma_url: str
    mode: Literal["scaffold", "component", "prompt_edit"]
    stack: Literal["react_typescript", "nextjs"] = "react_typescript"
