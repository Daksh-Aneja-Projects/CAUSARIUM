import logging
from uuid import UUID
from typing import Dict, Any
from .types import InterventionRequest, InterventionType

logger = logging.getLogger(__name__)

class InterventionEngine:
    def __init__(self):
        # Interface with Simulation Orchestrator
        pass

    async def apply_intervention(self, request: InterventionRequest) -> Dict[str, Any]:
        """
        Applies an intervention to a live simulation run.
        """
        logger.info(f"Applying intervention {request.intervention_type} at tick {request.pause_at_tick} to {request.target_run_id}")
        
        if request.run_counterfactual:
            counterfactual_run_id = await self._branch_run(request.target_run_id, request.pause_at_tick)
            await self._inject_payload(counterfactual_run_id, request)
            return {
                "original_run_id": str(request.target_run_id),
                "counterfactual_run_id": str(counterfactual_run_id),
                "status": "INTERVENTION_APPLIED_AND_BRANCHED"
            }
        else:
            await self._inject_payload(request.target_run_id, request)
            return {
                "run_id": str(request.target_run_id),
                "status": "INTERVENTION_APPLIED_IN_PLACE"
            }

    async def _branch_run(self, original_run_id: UUID, tick: int) -> UUID:
        from uuid import uuid4
        new_run_id = uuid4()
        logger.info(f"Branched run {original_run_id} at tick {tick} into {new_run_id}")
        # Logic to snapshot state at `tick` and seed new run worker
        return new_run_id

    async def _inject_payload(self, run_id: UUID, request: InterventionRequest) -> None:
        if request.intervention_type == InterventionType.AGENT_ATTRIBUTE_INJECTION:
            logger.info(f"Run {run_id}: Injecting {request.payload.attribute}={request.payload.new_value} for agent {request.payload.agent_id}")
        elif request.intervention_type == InterventionType.WORLD_STATE_INJECTION:
            logger.info(f"Run {run_id}: Injecting world event")
        elif request.intervention_type == InterventionType.AGENT_REMOVAL:
            logger.info(f"Run {run_id}: Removing agent {request.payload.agent_id}")
        elif request.intervention_type == InterventionType.AGENT_ADDITION:
            logger.info(f"Run {run_id}: Adding agent of type {request.payload.agent_type}")
        elif request.intervention_type == InterventionType.CAUSAL_BLOCK:
            logger.info(f"Run {run_id}: Blocking action {request.payload.action_class}")
        elif request.intervention_type == InterventionType.TRUST_RESET:
            logger.info(f"Run {run_id}: Resetting trust for {request.payload.agent_id} and {request.payload.target_agent_id}")
