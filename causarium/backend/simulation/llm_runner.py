"""
LLM-driven simulation run.

Unlike the heuristic scenario runner, here each agent actually *reasons* every
tick via the Ollama cognition stack (perceive → plan → optionally reflect). The
agent's real decision and in-character rationale are surfaced through a callback
so the UI can stream authentic reasoning as it happens.

Two agent representations are kept in lock-step, sharing one agent_id:
  * CausariumAgent — carries persona + cognitive attributes for the LLM prompt
  * AgentState     — carries capital/influence/trust for the physics resolver
"""

import uuid
from typing import Any, Awaitable, Callable, Dict, List, Optional

from ..agents.base_agent import CausariumAgent
from ..agents.cognition.perceive import PerceiveEngine
from ..agents.cognition.plan import PlanEngine
from ..agents.memory.reflection import ReflectionEngine
from ..agents.memory.stream import MemoryStream
from ..config import settings
from ..models.run_result import RunResult
from .action_resolver import ActionResolver
from .constraint_params import ConstraintParams
from .run_result_builder import build_run_result
from .world_state import AgentState, WorldState

# Persona names per archetype make the agents feel like distinct actors.
_PERSONA_NAMES = [
    "Ada Sterling", "Marcus Vale", "Directorate O", "Nomura Capital",
    "J. Rourke", "The Feed", "Kepler AI", "Sable Industries",
]

ReflectFn = Callable[[Dict[str, Any]], Awaitable[None]]


class LLMRunner:
    def __init__(self, model: Optional[str] = None, reflect_every: int = 4):
        self.model = model or settings.LLM_FAST_MODEL
        self.reflect_every = reflect_every
        self.perceive = PerceiveEngine()
        self.plan = PlanEngine()
        self.reflection = ReflectionEngine()
        self.resolver = ActionResolver()

    async def run(
        self,
        run_id: str,
        agent_specs: List[Dict[str, Any]],
        n_ticks: int,
        constraint_params: Optional[Dict[str, Any]] = None,
        simulation_id: str = "sim-local",
        organization: str = "Theatre",
        on_event: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None,
    ) -> RunResult:
        world = WorldState(run_id=run_id)
        if constraint_params:
            world.constraint_params = ConstraintParams(
                **{k: v for k, v in constraint_params.items()
                   if k in ConstraintParams.model_fields}
            )

        agents: List[CausariumAgent] = []
        streams: Dict[str, MemoryStream] = {}
        for i, spec in enumerate(agent_specs):
            aid = f"{run_id}-agent{i}"
            agent = CausariumAgent(
                agent_id=aid,
                agent_type=spec.get("agent_type", "UNKNOWN"),
                persona_name=_PERSONA_NAMES[i % len(_PERSONA_NAMES)],
                organization=organization,
                confidence=spec.get("confidence", 0.5),
                risk_tolerance=spec.get("risk_tolerance", 0.5),
                ethics_threshold=spec.get("ethics_threshold", 0.5),
                influence=spec.get("influence", 0.5),
                capital=spec.get("capital", 1.0),
                current_goals=spec.get("goals", []) or _default_goals(spec.get("agent_type", "")),
            )
            agents.append(agent)
            streams[aid] = MemoryStream(agent_id=aid)
            world.agents[aid] = AgentState(
                agent_id=aid,
                agent_type=agent.agent_type,
                confidence=agent.confidence,
                risk_tolerance=agent.risk_tolerance,
                ethics_threshold=agent.ethics_threshold,
                influence=agent.influence,
                capital=agent.capital,
            )

        event_log: List[Dict[str, Any]] = []

        for _ in range(n_ticks):
            snapshot = world.get_snapshot()

            # Perceive (append world state to each agent's memory).
            for agent in agents:
                self.perceive.perceive(agent, snapshot, streams[agent.agent_id], world.tick)

            # Plan — each agent reasons; run sequentially so the stream shows a
            # clear, ordered "who decided what" narrative (Ollama is CPU-bound
            # anyway, so concurrency buys little here).
            proposals: List[Dict[str, Any]] = []
            for agent in agents:
                action = await self.plan.plan(
                    agent, streams[agent.agent_id], snapshot, world.tick, model=self.model
                )
                proposals.append(action)
                if on_event:
                    await on_event({
                        "type": "agent_decision",
                        "tick": world.tick,
                        "agent_id": agent.agent_id,
                        "persona": agent.persona_name,
                        "agent_type": agent.agent_type,
                        "action_type": action.get("action_type"),
                        "target": action.get("target"),
                        "rationale": action.get("rationale", ""),
                    })

            # Resolve physics + apply effects.
            events = self.resolver.resolve(world, proposals)
            event_log.extend(events)
            world.tick += 1

            # Record each agent's own action in its memory.
            for action in proposals:
                aid = action.get("agent_id")
                if aid in streams:
                    streams[aid].append_event(world.tick, "ACTION", action)

            if on_event:
                await on_event({
                    "type": "tick",
                    "tick": world.tick,
                    "events": len(events),
                    "black_swan": any(e.get("type") == "BLACK_SWAN" for e in events),
                })

            # Periodic reflection updates goals from experience.
            if world.tick % self.reflect_every == 0:
                for agent in agents:
                    await self.reflection.reflect(agent, streams[agent.agent_id], world.tick)

        return build_run_result(
            run_id=run_id, events=event_log, world_state=world,
            simulation_id=simulation_id, converged=False,
        )


def _default_goals(agent_type: str) -> List[str]:
    base = {
        "EXECUTIVE_CEO": ["Grow enterprise value", "Avoid regulatory action"],
        "COMPETITOR_DIRECT": ["Seize market share", "Undermine the incumbent"],
        "REGULATOR_DOMESTIC": ["Enforce compliance", "Prevent systemic risk"],
        "INVESTOR_ACTIVIST": ["Maximize near-term returns", "Force governance change"],
        "EMPLOYEE_DISGRUNTLED": ["Expose wrongdoing", "Protect self-interest"],
        "MEDIA_SOCIAL": ["Maximize engagement", "Break the biggest story"],
    }
    return base.get(agent_type, ["Advance own position", "Survive volatility"])
