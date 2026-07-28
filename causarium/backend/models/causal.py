from uuid import UUID
from typing import List
from pydantic import BaseModel

class TickRange(BaseModel):
    start_tick: int
    end_tick: int

class ChainEvent(BaseModel):
    tick: int
    agent_type: str
    action: str
    magnitude: float

class CausalChain(BaseModel):
    chain_id: str
    simulation_id: UUID
    run_ids: List[UUID]
    frequency: float
    events: List[ChainEvent]
    terminal_outcome: str
    causal_weight: float
    intervention_window: TickRange
