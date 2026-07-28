"""Scenario synthesis API - turn a natural-language prompt into a simulation."""

from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..synthesize import synthesize_scenario

router = APIRouter()


class SynthesizeRequest(BaseModel):
    prompt: str = Field(..., description="Any question about the future")
    use_web: Optional[bool] = Field(None, description="Ground with a web search")


@router.post("/synthesize")
async def synthesize(payload: SynthesizeRequest) -> Dict[str, Any]:
    """Design a bespoke multi-agent scenario for the user's question."""
    return await synthesize_scenario(payload.prompt, use_web=payload.use_web)
