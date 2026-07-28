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
from ..simulation.scenario import HeuristicPolicy, build_world, run_scenario, step_world
from ..models.run_result import RunResult
from ..workers.discovery_worker import DiscoveryWorker
from ..graph.dna_tagger import DNA_DIMENSIONS
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
        # Live mid-run controls.
        self.paused = asyncio.Event()
        self.paused.set()  # set == running; cleared == paused
        self._injections: List[Dict[str, Any]] = []
        self.branch_points: List[Dict[str, Any]] = []

    # --- live intervention controls ------------------------------------ #
    def pause(self) -> None:
        self.paused.clear()

    def resume(self) -> None:
        self.paused.set()

    @property
    def is_paused(self) -> bool:
        return not self.paused.is_set()

    def queue_injection(self, injection: Dict[str, Any]) -> None:
        self._injections.append(injection)

    def drain_injections(self) -> List[Dict[str, Any]]:
        out, self._injections = self._injections, []
        return out

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
            "lens": self.config.get("lens"),
            "scenario_id": self.config.get("scenario_id"),
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
        from .catalog import LENSES

        cp = dict(DEFAULT_CONSTRAINTS)
        cp.update(config.get("constraint_params") or {})
        # Resolve the analysis lens (id string, full object, or default).
        lens = config.get("lens")
        if isinstance(lens, str):
            lens = LENSES.get(lens)
        if not isinstance(lens, dict):
            lens = LENSES.get(config.get("lens_id", ""), LENSES["strategy"])
        return {
            "title": config.get("title") or config.get("scenario_name") or "Untitled scenario",
            "context": config.get("context") or config.get("description") or "",
            "run_count": int(config.get("run_count", 12)),
            "tick_depth": int(config.get("tick_depth", 25)),
            "mode": config.get("mode", "heuristic"),
            "population": config.get("population") or DEFAULT_POPULATION,
            "constraint_params": cp,
            "lens": lens,
            "scenario_id": config.get("scenario_id"),
            "tenant_id": config.get("tenant_id", "public"),
            # Per-tick delay paces the live network so interactions are watchable.
            "stream_delay": float(config.get("stream_delay", 0.04)),
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
        if session.config.get("mode") == "llm":
            await self._execute_llm(session)
        else:
            await self._execute_heuristic(session)
        await self._finish_discovery(session)

    async def _execute_heuristic(self, session: SimulationSession) -> None:
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
            slot_of = {aid: i for i, aid in enumerate(agent_ids)}
            detector = ConvergenceDetector()
            event_log: List[Dict[str, Any]] = []
            converged = False

            # Roster: stable actor "slots" so the live network keeps the same
            # nodes across every run/timeline.
            await session.emit({
                "type": "agents", "run": run_idx,
                "agents": [{"slot": i, "type": world.agents[aid].agent_type} for i, aid in enumerate(agent_ids)],
            })

            for _ in range(tick_depth):
                await self._gate(session, world, run_idx)
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
                # Live interaction links: who acted on whom this tick.
                links = _interaction_links(events, slot_of)
                if links:
                    await session.emit({"type": "interactions", "run": run_idx, "tick": world.tick, "links": links})
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

    async def _execute_llm(self, session: SimulationSession) -> None:
        """Run agents through the real Ollama cognition stack, streaming each
        agent's actual decision + rationale. Capped small so it stays watchable
        on CPU inference."""
        from ..simulation.llm_runner import LLMRunner

        cfg = session.config
        # LLM inference is slow on CPU — bound the work so a live run completes.
        population = cfg["population"][:4]
        tick_depth = min(cfg["tick_depth"], 6)
        run_count = min(cfg["run_count"], 2)
        cfg["run_count"], cfg["tick_depth"] = run_count, tick_depth
        total_ticks = max(1, run_count * tick_depth)
        ticks_done = 0

        session.status = "RUNNING"
        await session.emit({"type": "status", "status": "RUNNING", **session.public_state()})
        await session.emit({"type": "notice", "message":
                            f"LLM mode: {len(population)} agents reason via {LLMRunner().model} "
                            f"per tick ({run_count} runs x {tick_depth} ticks). This is slower."})

        runner = LLMRunner()
        for run_idx in range(run_count):
            session.current_run = run_idx + 1
            await session.emit({"type": "run_start", "run": run_idx, "agents": len(population)})

            async def on_event(ev: Dict[str, Any], _idx=run_idx) -> None:
                nonlocal ticks_done
                ev["run"] = _idx
                if ev.get("type") == "tick":
                    ticks_done += 1
                    session.progress = ticks_done / total_ticks
                    session.current_tick = ev.get("tick", session.current_tick)
                    ev["progress"] = round(session.progress, 4)
                await session.emit(ev)

            async def before_tick(world, _tick, _idx=run_idx) -> None:
                await self._gate(session, world, _idx)

            result = await runner.run(
                run_id=f"{session.simulation_id}-run{run_idx}",
                agent_specs=population,
                n_ticks=tick_depth,
                constraint_params=cfg["constraint_params"],
                simulation_id=session.simulation_id,
                organization=cfg.get("title", "Theatre"),
                on_event=on_event,
                before_tick=before_tick,
            )
            session.runs.append(result)
            await session.emit({
                "type": "run_complete", "run": run_idx,
                "outcome": result.terminal_outcome, "converged": False,
                "dna": result.reality_dna,
            })

    # ------------------------------------------------------------------ #
    # Live mid-run intervention
    # ------------------------------------------------------------------ #
    async def _gate(self, session: SimulationSession, world, run_idx: int) -> None:
        """Called at each tick boundary: block while paused, then apply any
        queued injections to the LIVE world before the tick runs."""
        if session.is_paused:
            await session.emit({"type": "paused", "tick": world.tick, "run": run_idx})
            await session.paused.wait()
            await session.emit({"type": "resumed", "tick": world.tick, "run": run_idx})

        for inj in session.drain_injections():
            applied = self._apply_injection(world, inj)
            session.branch_points.append({"run": run_idx, "tick": world.tick, **applied})
            await session.emit({"type": "injected", "run": run_idx, "tick": world.tick, **applied})

    @staticmethod
    def _apply_injection(world, inj: Dict[str, Any]) -> Dict[str, Any]:
        """Mutate the live world state — a genuine counterfactual branch point."""
        kind = inj.get("kind", "SHOCK")

        if kind == "AGENT_ATTRIBUTE":
            idx = int(inj.get("agent_index", 0))
            attr = inj.get("attribute", "risk_tolerance")
            value = float(inj.get("value", 0.5))
            ids = list(world.agents)
            if 0 <= idx < len(ids) and hasattr(world.agents[ids[idx]], attr):
                setattr(world.agents[ids[idx]], attr, value)
                return {"kind": kind, "detail": f"{world.agents[ids[idx]].agent_type}.{attr} := {value}"}
            return {"kind": kind, "detail": "no-op (bad target)"}

        if kind == "CONSTRAINT":
            param = inj.get("param", "entropy_rate")
            value = float(inj.get("value", 0.5))
            if hasattr(world.constraint_params, param):
                try:
                    setattr(world.constraint_params, param, value)
                    return {"kind": kind, "detail": f"{param} := {value}"}
                except Exception:  # noqa: BLE001 - respect pydantic bounds
                    return {"kind": kind, "detail": f"{param} rejected (out of bounds)"}
            return {"kind": kind, "detail": "unknown constraint"}

        # Default: SHOCK — inject an exogenous crisis into the live world.
        shock = inj.get("shock", "INJECTED_SHOCK")
        for agent in world.agents.values():
            agent.capital = round(agent.capital - 0.5, 4)
        world.global_events.append({"type": "BLACK_SWAN", "action_type": shock, "tick": world.tick})
        return {"kind": "SHOCK", "detail": shock}

    async def _finish_discovery(self, session: SimulationSession) -> None:
        session.status = "DISCOVERY"
        await session.emit({"type": "status", "status": "DISCOVERY", **session.public_state()})
        # Discovery is CPU-bound and synchronous; run it off the event loop so the
        # server (and the live WebSocket) stays responsive while it computes.
        session.discovery = await asyncio.to_thread(
            self.discovery_worker.process_simulation,
            session.runs, session.simulation_id,
        )
        session.discovery["reality_dna_distribution"] = self._mean_dna(session.runs)
        session.discovery["outcome_distribution"] = session._outcome_distribution()
        session.discovery["lens"] = session.config.get("lens")
        # Human-readable narration of every finding.
        from .narrative import build_narrative
        session.discovery["narrative"] = build_narrative(session.discovery, session.config.get("lens"))

        # Best-effort persistence (Neo4j graph + DNA vectors) — never blocks.
        await self._persist(session)

        session.status = "COMPLETE"
        session.progress = 1.0
        await session.emit({
            "type": "complete",
            "status": "COMPLETE",
            "summary": self._summary(session),
        })

    async def _persist(self, session: SimulationSession) -> None:
        """Best-effort persistence. The Neo4j/Qdrant clients are BLOCKING, so run
        them in a worker thread to avoid stalling the event loop; bounded by a
        timeout so a slow/unreachable database never hangs the server."""
        try:
            from .persistence import persist_simulation
            await asyncio.wait_for(asyncio.to_thread(persist_simulation, session), timeout=8.0)
        except Exception:  # noqa: BLE001 - persistence is strictly best-effort
            pass

    # ------------------------------------------------------------------ #
    def graph_data(self, session: SimulationSession) -> Dict[str, Any]:
        """
        Node-link representation of the aggregate causal structure for the
        Reality Graph Explorer, derived from the do-calculus structural edges
        (agent_type:action signatures that reproduce across runs).
        """
        edges_in = (session.discovery or {}).get("structural_edges", [])
        degree: Counter = Counter()
        for e in edges_in:
            degree[e["source"]] += 1
            degree[e["target"]] += 1

        nodes = []
        for node_id in sorted(degree):
            agent_type, _, action = node_id.partition(":")
            nodes.append({
                "id": node_id,
                "agent_type": agent_type,
                "action": action,
                "degree": degree[node_id],
            })
        edges = [
            {"source": e["source"], "target": e["target"],
             "weight": e.get("weight", 0.0), "frequency": e.get("frequency", 0.0)}
            for e in edges_in
        ]
        return {
            "simulation_id": session.simulation_id,
            "nodes": nodes,
            "edges": edges,
            "attractors": [
                {"label": a["label"], "convergence_rate": a["convergence_rate"]}
                for a in (session.discovery or {}).get("attractors", [])
            ],
        }

    async def run_counterfactual(
        self, session: SimulationSession, agent_index: int, attribute: str, value: float
    ) -> Dict[str, Any]:
        """
        Counterfactual comparison: re-run the scenario with one agent's attribute
        overridden, then diff terminal-outcome distribution and mean reality-DNA
        against the baseline. A real do-what-if, not a mock.
        """
        cfg = session.config
        population = [dict(a) for a in cfg["population"]]
        if not (0 <= agent_index < len(population)):
            agent_index = 0
        population[agent_index][attribute] = value

        n = min(cfg["run_count"], 12)  # keep counterfactuals snappy
        cf_runs = await asyncio.gather(*[
            asyncio.to_thread(
                run_scenario, f"{session.simulation_id}-cf{i}", population,
                cfg["tick_depth"], cfg["constraint_params"], session.simulation_id, False,
            )
            for i in range(n)
        ])

        base_outcomes = self._outcome_dist(session.runs[:n] or session.runs)
        cf_outcomes = self._outcome_dist(cf_runs)
        base_dna = self._mean_dna(session.runs)
        cf_dna = self._mean_dna(cf_runs)
        dna_delta = {
            d: round(cf_dna.get(d, 0.0) - base_dna.get(d, 0.0), 4) for d in DNA_DIMENSIONS
        }
        divergence = self._tv_distance(base_outcomes, cf_outcomes)

        return {
            "intervention": {"agent_index": agent_index, "attribute": attribute, "value": value},
            "baseline_outcomes": base_outcomes,
            "counterfactual_outcomes": cf_outcomes,
            "dna_delta": dna_delta,
            "divergence_score": round(divergence, 4),
            "runs_compared": n,
        }

    @staticmethod
    def _outcome_dist(runs: List[RunResult]) -> Dict[str, float]:
        counts = Counter(r.terminal_outcome for r in runs if r.terminal_outcome)
        total = sum(counts.values()) or 1
        return {k: round(v / total, 4) for k, v in counts.items()}

    @staticmethod
    def _tv_distance(a: Dict[str, float], b: Dict[str, float]) -> float:
        keys = set(a) | set(b)
        return 0.5 * sum(abs(a.get(k, 0.0) - b.get(k, 0.0)) for k in keys)

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


def _interaction_links(events: List[Dict[str, Any]], slot_of: Dict[str, int]) -> List[Dict[str, Any]]:
    """Compact per-tick 'who acted on whom' links for the live network view."""
    links: List[Dict[str, Any]] = []
    for e in events:
        et = e.get("type")
        if et == "BLACK_SWAN":
            links.append({"s": "shock", "t": "all", "action": e.get("action_type"), "agg": True, "swan": True})
            continue
        if et not in ("ACTION_EXECUTED", "CASCADE"):
            continue
        if e.get("status") not in ("SUCCESS", "CONTESTED"):
            continue
        s = slot_of.get(e.get("agent_id"))
        if s is None:
            continue
        t = slot_of.get(str(e.get("target")))
        links.append({
            "s": s, "t": t if t is not None else "env",
            "action": e.get("action_type"), "agg": bool(e.get("aggressive")),
        })
        if len(links) >= 40:
            break
    return links


# Module-level singleton shared by the routers.
engine = SimulationEngine()
