"""Simulation constraint-physics tests."""

from backend.simulation.action_resolver import ActionResolver
from backend.simulation.constraint_params import ConstraintParams
from backend.simulation.convergence import ConvergenceDetector
from backend.simulation.world_state import AgentState, WorldState


def _world(tick=3, cascade=2.0, entropy=0.3, swan=0.05, trust_decay=0.2):
    ws = WorldState(run_id="run-x", tick=tick)
    for i in range(3):
        aid = f"a{i}"
        ws.agents[aid] = AgentState(
            agent_id=aid, agent_type="EXECUTIVE_CEO",
            influence=0.5 + i * 0.2, capital=1.0,
        )
    ws.constraint_params = ConstraintParams(
        entropy_rate=entropy, cascade_coefficient=cascade,
        black_swan_probability=swan, trust_decay_rate=trust_decay,
    )
    return ws


def test_resolution_is_deterministic():
    actions = [
        {"agent_id": "a0", "agent_type": "CEO", "action_type": "INVEST", "target": "ENVIRONMENT", "magnitude": 0.8},
        {"agent_id": "a1", "agent_type": "CEO", "action_type": "COOPERATE", "target": "a0", "magnitude": 0.7},
    ]
    r = ActionResolver()
    ev1 = r.resolve(_world(), actions)
    ev2 = r.resolve(_world(), actions)
    assert [e["status"] for e in ev1] == [e["status"] for e in ev2]
    assert [e["effect_magnitude"] for e in ev1] == [e["effect_magnitude"] for e in ev2]


def test_contention_produces_a_contested_loser():
    actions = [
        {"agent_id": "a0", "agent_type": "CEO", "action_type": "ACQUIRE", "target": "RES", "magnitude": 0.9},
        {"agent_id": "a1", "agent_type": "CEO", "action_type": "ACQUIRE", "target": "RES", "magnitude": 0.95},
    ]
    events = ActionResolver().resolve(_world(), actions)
    statuses = [e["status"] for e in events if e["action_type"] == "ACQUIRE"]
    assert "CONTESTED" in statuses  # exactly one winner, one contested


def test_wait_is_idle_and_zero_effect():
    actions = [{"agent_id": "a0", "agent_type": "CEO", "action_type": "WAIT", "target": "SELF", "magnitude": 0.0}]
    events = ActionResolver().resolve(_world(swan=0.0), actions)
    action_events = [e for e in events if e["type"] == "ACTION_EXECUTED"]
    assert action_events[0]["status"] == "IDLE"
    assert action_events[0]["effect_magnitude"] == 0.0


def test_cooperation_builds_trust():
    ws = _world(swan=0.0, trust_decay=0.0)
    actions = [{"agent_id": "a2", "agent_type": "CEO", "action_type": "COOPERATE", "target": "a0", "magnitude": 0.9}]
    ActionResolver().resolve(ws, actions)
    assert ws.agents["a2"].trust_network.get("a0", 0.0) > 0.0


def test_black_swan_fires_at_expected_rate():
    r = ActionResolver()
    actions = [{"agent_id": "a0", "agent_type": "CEO", "action_type": "INVEST", "target": "ENV", "magnitude": 0.5}]
    swans = sum(
        1 for t in range(300)
        if any(e["type"] == "BLACK_SWAN" for e in r.resolve(_world(tick=t, swan=0.05), actions))
    )
    # Expected ~15 over 300 ticks at p=0.05; allow a wide reproducible band.
    assert 3 <= swans <= 35


def test_convergence_detects_quiescence():
    det = ConvergenceDetector(patience=3, activity_threshold=0.05)
    for _ in range(3):
        det.observe([{"type": "ACTION_EXECUTED", "status": "IDLE", "action_type": "WAIT"}], n_agents=3)
    assert det.converged()


def test_convergence_not_triggered_by_activity():
    det = ConvergenceDetector(patience=3, activity_threshold=0.05)
    for i in range(3):
        det.observe(
            [{"type": "ACTION_EXECUTED", "status": "SUCCESS", "action_type": t}
             for t in (["COOPERATE"] if i % 2 == 0 else ["SABOTAGE", "COMPETE"])],
            n_agents=2,
        )
    assert not det.converged()
