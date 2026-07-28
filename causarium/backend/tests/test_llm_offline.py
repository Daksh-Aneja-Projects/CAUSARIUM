"""LLM router offline-policy and agent-cognition tests (no provider needed)."""

import pytest

from backend.config import settings
from backend.constants import ActionType
from backend.llm.router import generate_json, _extract_json
from backend.llm.prompts.agent_decision import AGENT_DECISION_SCHEMA
from backend.agents.registry import AgentRegistry, AgentType
from backend.agents.memory.stream import MemoryStream
from backend.agents.cognition.plan import PlanEngine
from backend.agents.memory.reflection import ReflectionEngine


def test_offline_mode_active_in_tests():
    assert settings.offline is True


def test_extract_json_strips_fences():
    assert _extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert _extract_json('sure! {"a": 2} done') == {"a": 2}
    assert _extract_json("not json at all") is None


async def test_generate_json_offline_matches_schema():
    msgs = [{"role": "system", "content": "decide"}, {"role": "user", "content": "act at tick 2"}]
    out = await generate_json(msgs, schema=AGENT_DECISION_SCHEMA)
    assert out["action_type"] in {a.value for a in ActionType}
    assert 0.0 <= out["magnitude"] <= 1.0


async def test_generate_json_offline_is_deterministic():
    msgs = [{"role": "user", "content": "same prompt"}]
    a = await generate_json(msgs, schema=AGENT_DECISION_SCHEMA)
    b = await generate_json(msgs, schema=AGENT_DECISION_SCHEMA)
    assert a == b


async def test_plan_engine_offline_attributes_action():
    agent = AgentRegistry.create_agent(
        AgentType.COMPETITOR_DIRECT, "Rax", "RivalCorp",
        {"current_goals": ["Win"], "risk_tolerance": 0.8},
    )
    stream = MemoryStream(agent_id=agent.agent_id)
    stream.append_event(1, "WORLD_STATE", {"threat": "x"})
    action = await PlanEngine().plan(agent, stream, {"tick": 2, "constraint_params": {}}, tick=2)
    assert action["agent_id"] == agent.agent_id
    assert action["action_type"] in {a.value for a in ActionType}
    assert isinstance(action["magnitude"], float)


async def test_reflection_engine_offline_returns_structure():
    agent = AgentRegistry.create_agent(AgentType.EXECUTIVE_CEO, "Ada", "Helix",
                                       {"current_goals": ["Grow"]})
    stream = MemoryStream(agent_id=agent.agent_id)
    for t in range(3):
        stream.append_event(t, "ACTION", {"action_type": "INVEST"})
    reflection = await ReflectionEngine().reflect(agent, stream, tick=3)
    assert "summary" in reflection
    assert 1 <= reflection["importance"] <= 10
    # importance is back-propagated onto the reflected memories
    assert max(e.importance_score for e in stream.events) > 0
