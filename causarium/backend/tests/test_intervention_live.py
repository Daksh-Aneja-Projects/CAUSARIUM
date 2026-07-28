"""Mid-run pause / inject / branch tests."""

import asyncio

import pytest

from backend.api.engine import SimulationEngine
from backend.simulation.world_state import AgentState, WorldState
from backend.simulation.constraint_params import ConstraintParams


def _world():
    w = WorldState(run_id="r")
    w.agents["a0"] = AgentState(agent_id="a0", agent_type="CEO", capital=2.0, risk_tolerance=0.5)
    return w


def test_inject_agent_attribute_mutates_live_world():
    w = _world()
    out = SimulationEngine._apply_injection(w, {"kind": "AGENT_ATTRIBUTE", "agent_index": 0, "attribute": "risk_tolerance", "value": 0.9})
    assert w.agents["a0"].risk_tolerance == 0.9
    assert "risk_tolerance" in out["detail"]


def test_inject_shock_reduces_capital_and_logs_event():
    w = _world()
    before = w.agents["a0"].capital
    out = SimulationEngine._apply_injection(w, {"kind": "SHOCK", "shock": "RAID"})
    assert w.agents["a0"].capital < before
    assert out["kind"] == "SHOCK"
    assert any(e.get("type") == "BLACK_SWAN" for e in w.global_events)


def test_inject_constraint_respects_bounds():
    w = _world()
    w.constraint_params = ConstraintParams()
    ok = SimulationEngine._apply_injection(w, {"kind": "CONSTRAINT", "param": "entropy_rate", "value": 0.9})
    assert w.constraint_params.entropy_rate == 0.9
    # Out-of-bounds value is rejected, not applied.
    SimulationEngine._apply_injection(w, {"kind": "CONSTRAINT", "param": "entropy_rate", "value": 5.0})
    assert w.constraint_params.entropy_rate == 0.9


async def test_pause_freezes_progress_then_resume_completes():
    engine = SimulationEngine()
    s = engine.create({"scenario_name": "P", "run_count": 2, "tick_depth": 15, "stream_delay": 0.03})
    task = asyncio.create_task(engine.run(s.simulation_id))
    await asyncio.sleep(0.25)
    s.pause()
    await asyncio.sleep(0.2)
    frozen = s.current_tick
    await asyncio.sleep(0.2)
    assert s.current_tick == frozen  # no progress while paused
    s.queue_injection({"kind": "SHOCK", "shock": "TEST"})
    s.resume()
    await asyncio.wait_for(task, timeout=15)
    assert s.status == "COMPLETE"
    assert any(bp["kind"] == "SHOCK" for bp in s.branch_points)
