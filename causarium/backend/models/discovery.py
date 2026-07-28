from uuid import UUID
from typing import List, Dict
from pydantic import BaseModel

class Attractor(BaseModel):
    attractor_id: str
    simulation_id: UUID
    label: str
    convergence_rate: float
    earliest_deterministic_tick: int
    invariant_chains: List[str]
    dna_centroid: Dict[str, float]
