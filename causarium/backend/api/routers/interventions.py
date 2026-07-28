from fastapi import APIRouter
from uuid import UUID
from typing import Dict, Any
from ...intervention.types import InterventionRequest
from ...intervention.engine import InterventionEngine

router = APIRouter(prefix="/v1/simulations", tags=["interventions"])
engine = InterventionEngine()

@router.post("/{simulation_id}/interventions")
async def trigger_intervention(simulation_id: UUID, request: InterventionRequest) -> Dict[str, Any]:
    """
    Pauses a simulation run and injects an intervention.
    """
    # simulation_id matches the broader context, target_run_id is the specific worker
    result = await engine.apply_intervention(request)
    return result
