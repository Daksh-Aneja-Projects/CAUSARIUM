"""
RunResult — the unified contract between the simulation and discovery layers.

A completed simulation run is fully described by its resolved event log plus the
terminal state of its agents. Everything downstream (causal extraction, the six
discovery engines, reality-DNA tagging, reporting) consumes RunResult, so the
whole pipeline speaks one representation instead of translating between the
strict UUID Event model and the simulation's dict events.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RunResult(BaseModel):
    run_id: str
    simulation_id: str = "sim-local"
    seed: int = 0
    tick_count: int = 0
    converged: bool = False

    # Resolved-event dicts as emitted by ActionResolver.resolve().
    events: List[Dict[str, Any]] = Field(default_factory=list)
    # agent_id -> terminal snapshot {agent_type, capital, influence, trust_network, ...}
    terminal_agents: Dict[str, Dict[str, Any]] = Field(default_factory=dict)

    reality_dna: Dict[str, float] = Field(default_factory=dict)
    terminal_outcome: Optional[str] = None
