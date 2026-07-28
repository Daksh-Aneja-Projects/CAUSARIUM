from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.intervention.pause_engine import build_intervention_plan

router = APIRouter(prefix="/interventions", tags=["interventions"])


class InterventionRequest(BaseModel):
    tick: int = Field(..., ge=0)
    discoveries: list[dict[str, Any]] = Field(default_factory=list)


class InterventionResponse(BaseModel):
    actions: list[dict[str, Any]]


@router.get("/health")
def intervention_health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/", response_model=InterventionResponse)
def apply_intervention(payload: InterventionRequest) -> InterventionResponse:
    return InterventionResponse(actions=build_intervention_plan(payload.discoveries, payload.tick))
