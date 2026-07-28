import uuid
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class CausariumAgent(BaseModel):
    # Identity Attributes
    agent_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: str
    persona_name: str
    organization: str

    # Cognitive Attributes
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    risk_tolerance: float = Field(default=0.5, ge=0.0, le=1.0)
    trust_network: Dict[str, float] = Field(default_factory=dict)
    knowledge_state: List[float] = Field(default_factory=list) # Vector embedding
    bias_profile: Dict[str, float] = Field(default_factory=dict)
    ethics_threshold: float = Field(default=0.5, ge=0.0, le=1.0)

    # Resource Attributes
    capital: float = Field(default=0.0)
    influence: float = Field(default=0.5)
    information_access: str = Field(default="MEDIUM") # LOW, MEDIUM, HIGH, CLASSIFIED
    network_reach: int = Field(default=10)

    # Behavioral Attributes
    adaptation_rate: float = Field(default=0.5, ge=0.0, le=1.0)
    memory_decay: float = Field(default=0.1, ge=0.0, le=1.0)
    goal_persistence: float = Field(default=0.8, ge=0.0, le=1.0)

    # Dynamic State
    current_goals: List[str] = Field(default_factory=list)
