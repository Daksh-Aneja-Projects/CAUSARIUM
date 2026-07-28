from uuid import UUID
from datetime import datetime
from typing import Dict, List, Any
from pydantic import BaseModel

class Event(BaseModel):
    event_id: UUID
    run_id: UUID
    tick: int
    agent_id: UUID
    action_type: str
    action_payload: Dict[str, Any]
    causal_parents: List[UUID]
    causal_weight: float
    timestamp: datetime
