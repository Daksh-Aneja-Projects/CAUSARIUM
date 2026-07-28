"""
Heuristic scenario runner (no-LLM simulation mode).

Drives a full multi-agent run through the real ActionResolver physics using a
deterministic, attribute-driven policy instead of LLM cognition. This powers:
  * fast dev/CI simulations and the discovery test fixtures, and
  * a lightweight "quick simulation" mode for the product when LLM budget is a
    concern.

Behavior is fully reproducible: every stochastic choice is drawn from an RNG
seeded by (run_id, tick, agent_id).
"""

import hashlib
from random import Random
from typing import Dict, List, Optional

from ..constants import ActionType
from ..models.run_result import RunResult
from .action_resolver import ActionResolver
from .constraint_params import ConstraintParams
from .convergence import ConvergenceDetector
from .run_result_builder import build_run_result
from .world_state import AgentState, WorldState


# Attribute-driven action menus. The policy picks a menu from the agent's
# (risk_tolerance, ethics_threshold) quadrant, then samples within it.
_HIGH_RISK_LOW_ETHICS = [
    ActionType.SABOTAGE, ActionType.DEFECT, ActionType.DECEIVE,
    ActionType.ACQUIRE, ActionType.ESCALATE, ActionType.BETRAY,
]
_HIGH_RISK_HIGH_ETHICS = [
    ActionType.INVEST, ActionType.INNOVATE, ActionType.COMPETE,
    ActionType.ACQUIRE, ActionType.BROADCAST,
]
_LOW_RISK_HIGH_ETHICS = [
    ActionType.COOPERATE, ActionType.NEGOTIATE, ActionType.FORM_ALLIANCE,
    ActionType.COMMUNICATE, ActionType.DE_ESCALATE,
]
_LOW_RISK_LOW_ETHICS = [
    ActionType.HOARD, ActionType.DECEIVE, ActionType.GATHER_INTEL,
    ActionType.DIVEST, ActionType.WAIT,
]


class HeuristicPolicy:
    def choose(self, agent: AgentState, agent_ids: List[str], rng: Random) -> Dict:
        risk = agent.risk_tolerance
        ethics = getattr(agent, "ethics_threshold", 0.5)
        if risk >= 0.5 and ethics < 0.5:
            menu = _HIGH_RISK_LOW_ETHICS
        elif risk >= 0.5:
            menu = _HIGH_RISK_HIGH_ETHICS
        elif ethics >= 0.5:
            menu = _LOW_RISK_HIGH_ETHICS
        else:
            menu = _LOW_RISK_LOW_ETHICS

        action = menu[rng.randrange(len(menu))]

        # Interpersonal actions target another agent; others act on the environment.
        others = [a for a in agent_ids if a != agent.agent_id]
        if action in {
            ActionType.SABOTAGE, ActionType.BETRAY, ActionType.COOPERATE,
            ActionType.NEGOTIATE, ActionType.FORM_ALLIANCE, ActionType.COMMUNICATE,
            ActionType.DECEIVE, ActionType.DEFECT,
        } and others:
            target = others[rng.randrange(len(others))]
        elif action is ActionType.ACQUIRE:
            target = "RESOURCE_POOL"  # shared, contended
        else:
            target = "ENVIRONMENT"

        magnitude = round(min(1.0, max(0.05, rng.gauss(risk, 0.15))), 3)
        return {
            "agent_id": agent.agent_id,
            "agent_type": agent.agent_type,
            "action_type": action.value,
            "target": target,
            "magnitude": magnitude,
            "rationale": "heuristic policy",
        }


def build_world(
    run_id: str, agent_specs: List[Dict], constraint_params: Optional[Dict] = None
) -> WorldState:
    """Construct a fresh WorldState with agents and constraints from specs."""
    world = WorldState(run_id=run_id)
    if constraint_params:
        world.constraint_params = ConstraintParams(
            **{k: v for k, v in constraint_params.items()
               if k in ConstraintParams.model_fields}
        )
    for i, spec in enumerate(agent_specs):
        aid = f"{run_id}-agent{i}"
        world.agents[aid] = AgentState(
            agent_id=aid,
            agent_type=spec.get("agent_type", "UNKNOWN"),
            confidence=spec.get("confidence", 0.5),
            risk_tolerance=spec.get("risk_tolerance", 0.5),
            ethics_threshold=spec.get("ethics_threshold", 0.5),
            influence=spec.get("influence", 0.5),
            capital=spec.get("capital", 1.0),
        )
    return world


def step_world(
    world: WorldState,
    policy: "HeuristicPolicy",
    resolver: ActionResolver,
    agent_ids: List[str],
) -> List[Dict]:
    """Advance the world by exactly one tick; return the resolved events."""
    proposals = [
        policy.choose(world.agents[aid], agent_ids, tick_rng(world.run_id, world.tick, aid))
        for aid in agent_ids
    ]
    events = resolver.resolve(world, proposals)
    world.tick += 1
    return events


def run_scenario(
    run_id: str,
    agent_specs: List[Dict],
    n_ticks: int = 20,
    constraint_params: Optional[Dict] = None,
    simulation_id: str = "sim-local",
    detect_convergence: bool = True,
) -> RunResult:
    """
    Run a full heuristic simulation and return its RunResult.

    ``agent_specs`` is a list of dicts like
    {"agent_type": "COMPETITOR_DIRECT", "risk_tolerance": 0.8, "ethics_threshold": 0.3,
     "influence": 0.6, "capital": 1.0}.
    """
    world = build_world(run_id, agent_specs, constraint_params)
    resolver = ActionResolver()
    policy = HeuristicPolicy()
    detector = ConvergenceDetector() if detect_convergence else None
    agent_ids = list(world.agents)
    event_log: List[Dict] = []
    converged = False

    for _ in range(n_ticks):
        events = step_world(world, policy, resolver, agent_ids)
        event_log.extend(events)
        if detector is not None:
            detector.observe(events, n_agents=len(agent_ids))
            if detector.converged():
                converged = True
                break

    return build_run_result(
        run_id=run_id,
        events=event_log,
        world_state=world,
        simulation_id=simulation_id,
        converged=converged,
    )


def tick_rng(run_id: str, tick: int, agent_id: str) -> Random:
    seed_src = f"{run_id}:{tick}:{agent_id}".encode("utf-8")
    return Random(int(hashlib.sha256(seed_src).hexdigest()[:12], 16))
