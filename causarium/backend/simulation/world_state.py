from pydantic import BaseModel, Field
from typing import Dict, Any, List
from .constraint_params import ConstraintParams

class AgentState(BaseModel):
    agent_id: str
    agent_type: str
    attributes: Dict[str, Any] = Field(default_factory=dict)
    memory_stream: List[Any] = Field(default_factory=list)
    confidence: float = 0.5
    risk_tolerance: float = 0.5
    trust_network: Dict[str, float] = Field(default_factory=dict)
    capital: float = 0.0
    influence: float = 0.0

class WorldState(BaseModel):
    run_id: str
    tick: int = 0
    agents: Dict[str, AgentState] = Field(default_factory=dict)
    constraint_params: ConstraintParams = Field(default_factory=ConstraintParams)
    global_events: List[Dict[str, Any]] = Field(default_factory=list)
    
    def get_snapshot(self) -> Dict[str, Any]:
        """Returns a snapshot of the current world state."""
        return self.model_dump()
