from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.config import get_settings
from backend.workers.simulation_worker import run_simulation_task

router = APIRouter()
settings = get_settings()


class SimulationCreateRequest(BaseModel):
    scenario_name: str = Field(..., description="Name of the simulation scenario")
    description: str | None = Field(None, description="Optional scenario description")
    run_count: int = Field(settings.DEFAULT_RUN_COUNT, ge=1, le=settings.MAX_CONCURRENT_RUNS)
    tick_depth: int = Field(settings.DEFAULT_TICK_DEPTH, ge=1)


class SimulationCreateResponse(BaseModel):
    simulation_id: str
    status: str


@router.post("/", response_model=SimulationCreateResponse)
async def create_simulation(payload: SimulationCreateRequest) -> SimulationCreateResponse:
    result = run_simulation_task.delay(payload.dict())
    if result is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to enqueue simulation")
    return SimulationCreateResponse(simulation_id=str(result.id), status="queued")
