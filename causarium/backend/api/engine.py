"""
In-process simulation engine.

Runs simulations end-to-end inside the API process (no Celery/DB required for a
live demo): spins agents through the real ActionResolver physics tick-by-tick,
streams progress to WebSocket subscribers, then runs the full discovery pipeline
and caches the results. State lives in memory, keyed by simulation id.

Two execution modes:
  * "heuristic" (default) — fast, deterministic, no LLM; great for live streaming
  * "llm"                 — agents decide via the local Ollama cognition stack
"""

import asyncio
import time
import uuid
from collections import Counter
from typing import Any, Dict, List, Optional

from ..simulation.action_resolver import ActionResolver
from ..simulation.convergence import ConvergenceDetector
from ..simulation.run_result_builder import build_run_result
from ..simulation.scenario import HeuristicPolicy, build_world, step_world
from ..models.run_result import RunResult
from ..workers.discovery_worker import DiscoveryWorker
from .scenario_presets import DEFAULT_POPULATION, DEFAULT_CONSTRAINTS


class SimulationSession:
    def __init__(self, simulation_id: str, config: Dict[str, Any]):
        self.simulation_id = simulation_id
        self.config = config
        self.status = "QUEUED"          # QUEUED -> RUNNING -> DISCOVERY -> COMPLETE / FAILED
        self.created_at = time.time()
        self.progress = 0.0
        self.current_tick = 0
        self.current_run = 0
        self.runs: List[RunResult] = []
        self.discovery: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        self._subscribers: List[asyncio.Queue] = []

    # --- pub/sub for WebSocket streaming ------------------------------- #
    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def emit(self, event: Dict[str, Any]) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass

    def public_state(self) -> Dict[str, Any]:
        return {
            "simulation_id": self.simulation_id,
            "status": self.status,
            "progress": round(self.progress, 4),
            "current_run": self.current_run,
            "current_tick": self.current_tick,
            "run_count": self.config.get("run_count"),
            "tick_depth": self.config.get("tick_depth"),
            "title": self.config.get("title"),
            "mode": self.config.get("mode", "heuristic"),
            "created_at": self.created_at,
            "outcome_distribution": self._outcome_distribution(),
            "error": self.error,
        }

    def _outcome_distribution(self) -> Dict[str, int]:
        return dict(Counter(r.terminal_outcome for r in self.runs if r.terminal_outcome))


class SimulationEngine:
    def __init__(self) -> None:
        self._sessions: Dict[str, SimulationSession] = {}
        self.discovery_worker = DiscoveryWorker()

    def create(self, config: Dict[str, Any]) -> SimulationSession:
        sim_id = "sim-" + uuid.uuid4().hex[:10]
        merged = self._merge_config(config)
        session = SimulationSession(sim_id, merged)
        self._sessions[sim_id] = session
        return session

    def get(self, simulation_id: str) -> Optional[SimulationSession]:
        return self._sessions.get(simulation_id)

    def list(self) -> List[Dict[str, Any]]:
        return [s.public_state() for s in self._sessions.values()]

    # ------------------------------------------------------------------ #
    def _merge_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        cp = dict(DEFAULT_CONSTRAINTS)
        cp.update(config.get("constraint_params") or {})
        return {
            "title": config.get("title") or config.get("scenario_name") or "Untitled scenario",
            "context": config.get("context") or config.get("description") or "",
            "run_count": int(config.get("run_count", 12)),
            "tick_depth": int(config.get("tick_depth", 25)),
            "mode": config.get("mode", "heuristic"),
            "population": config.get("population") or DEFAULT_POPULATION,
            "constraint_params": cp,
            # Small per-tick delay makes the run visibly stream in the UI.
            "stream_delay": float(config.get("stream_delay", 0.015)),
        }

    # ------------------------------------------------------------------ #
    async def run(self, simulation_id: str) -> None:
        """Background task: execute all runs, stream progress, then discover."""
        session = self._sessions[simulation_id]
        try:
            await self._execute(session)
        except Exception as e:  # noqa: BLE001 - surface failure to the client
            session.status = "FAILED"
            session.error = f"{type(e).__name__}: {e}"
            await session.emit({"type": "error", "message": session.error})

    async def _execute(self, session: SimulationSession) -> None:
        cfg = session.config
        run_count = cfg["run_count"]
        tick_depth = cfg["tick_depth"]
        population = cfg["population"]
        cp = cfg["constraint_params"]
        delay = cfg["stream_delay"]
        total_ticks = max(1, run_count * tick_depth)

        session.status = "RUNNING"
        await session.emit({"type": "status", "status": "RUNNING", **session.public_state()})

        resolver = ActionResolver()
        policy = HeuristicPolicy()
        ticks_done = 0

        for run_idx in range(run_count):
            run_id = f"{session.simulation_id}-run{run_idx}"
            session.current_run = run_idx + 1
            world = build_world(run_id, population, cp)
            agent_ids = list(world.agents)
            detector = ConvergenceDetector()
            event_log: List[Dict[str, Any]] = []
            converged = False

            await session.emit({"type": "run_start", "run": run_idx, "agents": len(agent_ids)})

            for _ in range(tick_depth):
                events = step_world(world, policy, resolver, agent_ids)
                event_log.extend(events)
                session.current_tick = world.tick
                ticks_done += 1
                session.progress = ticks_done / total_ticks

                await session.emit({
                    "type": "tick",
                    "run": run_idx,
                    "tick": world.tick,
                    "events": len(events),
                    "black_swan": any(e.get("type") == "BLACK_SWAN" for e in events),
                    "progress": round(session.progress, 4),
                })
                if delay:
                    await asyncio.sleep(delay)

                detector.observe(events, n_agents=len(agent_ids))
                if detector.converged():
                    converged = True
                    break

            result = build_run_result(
                run_id=run_id, events=event_log, world_state=world,
                simulation_id=session.simulation_id, converged=converged,
            )
            session.runs.append(result)
            await session.emit({
                "type": "run_complete",
                "run": run_idx,
                "outcome": result.terminal_outcome,
                "converged": converged,
                "dna": result.reality_dna,
            })

        # Discovery phase.
        session.status = "DISCOVERY"
        await session.emit({"type": "status", "status": "DISCOVERY", **session.public_state()})
        session.discovery = self.discovery_worker.process_simulation(
            session.runs, simulation_id=session.simulation_id
        )
        session.discovery["reality_dna_distribution"] = self._mean_dna(session.runs)
        session.discovery["outcome_distribution"] = session._outcome_distribution()

        session.status = "COMPLETE"
        session.progress = 1.0
        await session.emit({
            "type": "complete",
            "status": "COMPLETE",
            "summary": self._summary(session),
        })

    # ------------------------------------------------------------------ #
    @staticmethod
    def _mean_dna(runs: List[RunResult]) -> Dict[str, float]:
        if not runs:
            return {}
        keys = runs[0].reality_dna.keys()
        return {
            k: round(sum(r.reality_dna.get(k, 0.0) for r in runs) / len(runs), 4)
            for k in keys
        }

    @staticmethod
    def _summary(session: SimulationSession) -> Dict[str, Any]:
        d = session.discovery or {}
        return {
            "hidden_causal_chains": len(d.get("hidden_causal_chains", [])),
            "attractors": len(d.get("attractors", [])),
            "repellers": len(d.get("repellers", [])),
            "choke_points": len(d.get("choke_points", [])),
            "butterfly_events": len(d.get("butterfly_events", [])),
            "singularities": len(d.get("singularities", [])),
            "causal_paradoxes": len(d.get("causal_paradoxes", [])),
        }


# Module-level singleton shared by the routers.
engine = SimulationEngine()
