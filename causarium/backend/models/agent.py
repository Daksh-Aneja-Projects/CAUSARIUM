from uuid import UUID
from typing import Dict, List
from pydantic import BaseModel, Field

class AgentAttributes(BaseModel):
    confidence: float
    risk_tolerance: float
    trust_network: Dict[str, float] = Field(default_factory=dict)
    knowledge_state: List[float] = Field(default_factory=list)
    bias_profile: Dict[str, float] = Field(default_factory=dict)
    ethics_threshold: float = 0.5
    capital: float = 0.0
    influence: float = 0.0
    information_access: str = "MEDIUM"
    network_reach: int = 10
    adaptation_rate: float = 0.5
    memory_decay: float = 0.1
    goal_persistence: float = 0.5

class Agent(BaseModel):
    agent_id: UUID
    run_id: UUID
    agent_type: str
    persona: str
    attributes: AgentAttributes
    memory_stream_id: UUID
