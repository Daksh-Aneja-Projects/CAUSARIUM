from typing import List, Optional
from pydantic import BaseModel, Field


class TickRange(BaseModel):
    start_tick: int
    end_tick: int


class ChainEvent(BaseModel):
    tick: int
    agent_id: Optional[str] = None
    agent_type: str
    action: str
    magnitude: float


class CausalChain(BaseModel):
    chain_id: str
    simulation_id: str
    run_ids: List[str] = Field(default_factory=list)
    frequency: float
    events: List[ChainEvent]
    terminal_outcome: str
    causal_weight: float
    intervention_window: TickRange
    # Semantic annotation attached by the causal-label LLM prompt (optional).
    label: Optional[str] = None
    mechanism_class: Optional[str] = None
