"""
Assemble a RunResult from a completed simulation.

Bridges the simulation substrate (orchestrator + world state + event log) to the
discovery pipeline by snapshotting terminal agent state, computing the run's
reality-DNA, and classifying its terminal outcome.
"""

from typing import Any, Dict, List

from ..graph.dna_tagger import DNATagger
from ..graph.outcome import classify_outcome
from ..models.run_result import RunResult
from .run_manager import SimulationOrchestrator
from .world_state import WorldState


_dna_tagger = DNATagger()


def build_run_result(
    run_id: str,
    events: List[Dict[str, Any]],
    world_state: WorldState,
    simulation_id: str = "sim-local",
    seed: int = 0,
    converged: bool = False,
) -> RunResult:
    terminal_agents = {
        aid: {
            "agent_type": a.agent_type,
            "capital": a.capital,
            "influence": a.influence,
            "trust_network": dict(a.trust_network),
        }
        for aid, a in world_state.agents.items()
    }
    dna = _dna_tagger.compute_dna(events, terminal_agents)
    outcome = classify_outcome(dna, terminal_agents)

    return RunResult(
        run_id=run_id,
        simulation_id=simulation_id,
        seed=seed,
        tick_count=world_state.tick,
        converged=converged,
        events=events,
        terminal_agents=terminal_agents,
        reality_dna=dna,
        terminal_outcome=outcome,
    )


def result_from_orchestrator(
    orchestrator: SimulationOrchestrator, simulation_id: str = "sim-local", seed: int = 0
) -> RunResult:
    """Convenience: build a RunResult directly from a finished orchestrator."""
    return build_run_result(
        run_id=orchestrator.run_id,
        events=orchestrator.event_log,
        world_state=orchestrator.world_state,
        simulation_id=simulation_id,
        seed=seed,
        converged=orchestrator.converged,
    )
