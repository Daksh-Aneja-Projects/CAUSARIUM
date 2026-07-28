"""Discovery result models — one per discovery engine (PRD §12)."""

from typing import Any, List, Dict, Optional
from pydantic import BaseModel, Field


class Attractor(BaseModel):
    """A basin of convergence: many runs end near the same reality-DNA cluster."""
    attractor_id: str
    simulation_id: str
    label: str
    convergence_rate: float
    earliest_deterministic_tick: int
    invariant_chains: List[str] = Field(default_factory=list)
    dna_centroid: Dict[str, float] = Field(default_factory=dict)
    member_run_ids: List[str] = Field(default_factory=list)


class Repeller(BaseModel):
    """A target outcome the system structurally resists reaching."""
    repeller_id: str
    simulation_id: str
    target_outcome: str
    achievement_rate: float
    structural_blockers: List[str] = Field(default_factory=list)
    nearest_achieving_condition: Optional[str] = None


class ChokePoint(BaseModel):
    """A tick where intervention has maximal leverage over final outcomes."""
    choke_point_id: str
    simulation_id: str
    tick: int
    intervention_efficacy: float
    effective_interventions: List[str] = Field(default_factory=list)
    decay_after_tick: Optional[int] = None


class ButterflyEvent(BaseModel):
    """A small action with disproportionately large downstream causal weight."""
    butterfly_id: str
    simulation_id: str
    event_label: str
    tick: int
    action_magnitude: float
    downstream_causal_weight: float
    amplification_ratio: float
    downstream_events: List[str] = Field(default_factory=list)


class Singularity(BaseModel):
    """A decision point where outcomes bifurcate into distinct clusters."""
    singularity_id: str
    simulation_id: str
    tick: int
    decision: str
    outcome_cluster_a: Dict[str, Any] = Field(default_factory=dict)
    outcome_cluster_b: Dict[str, Any] = Field(default_factory=dict)
    middle_outcome_frequency: float = 0.0
    bimodality: float = 0.0
    decision_sensitivity: Optional[str] = None


class CausalParadox(BaseModel):
    """A self-reinforcing cycle in the aggregate causal structure."""
    paradox_id: str
    simulation_id: str
    cycle: List[str]
    cycle_strength: float
    description: Optional[str] = None
