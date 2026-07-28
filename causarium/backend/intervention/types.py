from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel
from uuid import UUID

class InterventionType(str, Enum):
    AGENT_ATTRIBUTE_INJECTION = "AGENT_ATTRIBUTE_INJECTION"
    WORLD_STATE_INJECTION = "WORLD_STATE_INJECTION"
    AGENT_REMOVAL = "AGENT_REMOVAL"
    AGENT_ADDITION = "AGENT_ADDITION"
    CAUSAL_BLOCK = "CAUSAL_BLOCK"
    TRUST_RESET = "TRUST_RESET"

class InterventionPayload(BaseModel):
    agent_id: Optional[UUID] = None
    attribute: Optional[str] = None
    new_value: Optional[Any] = None
    world_event: Optional[Dict[str, Any]] = None
    agent_type: Optional[str] = None
    action_class: Optional[str] = None
    block_duration: Optional[int] = None
    target_agent_id: Optional[UUID] = None
    trust_value: Optional[float] = None

class InterventionRequest(BaseModel):
    target_run_id: UUID
    pause_at_tick: int
    intervention_type: InterventionType
    payload: InterventionPayload
    run_counterfactual: bool = True
