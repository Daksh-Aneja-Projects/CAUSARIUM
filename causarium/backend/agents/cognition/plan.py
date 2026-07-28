import json
from typing import Dict, Any

from ..base_agent import CausariumAgent
from ..memory.stream import MemoryStream
from ..memory.retrieval import RetrievalEngine
from ...constants import DEFAULT_AGENT_TEMPERATURE, DEFAULT_AGENT_DECISION_TOKEN_BUDGET
from ...llm.router import generate_json
from ...llm.prompts.agent_decision import (
    AGENT_DECISION_SYSTEM_PROMPT,
    AGENT_DECISION_USER_PROMPT,
    AGENT_DECISION_SCHEMA,
    ACTION_MENU,
)


class PlanEngine:
    async def plan(
        self,
        agent: CausariumAgent,
        stream: MemoryStream,
        world_state: Dict[str, Any],
        tick: int,
        model: str = None,
    ) -> Dict[str, Any]:
        """
        Generate the next action for the agent based on goals, memory, and world state.
        Returns a structured action dict (see AGENT_DECISION_SCHEMA) annotated with
        the acting agent's id so the ActionResolver can attribute it.
        """
        retrieval = RetrievalEngine(stream)
        relevant_memories = retrieval.retrieve_relevant(query="current context", limit=5)
        memories_text = (
            "\n".join(
                f"- Tick {e.tick} [{e.event_type}]: {json.dumps(e.content)[:240]}"
                for e in relevant_memories
            )
            or "(no memories yet)"
        )

        goals_text = (
            "\n".join(f"{i + 1}. {g}" for i, g in enumerate(agent.current_goals))
            or "(no explicit goals — act to preserve and grow your position)"
        )
        physics_text = _format_physics(world_state.get("constraint_params", {}))

        system_prompt = AGENT_DECISION_SYSTEM_PROMPT.format(
            persona_name=agent.persona_name,
            agent_type=agent.agent_type,
            organization=agent.organization,
            confidence=agent.confidence,
            risk_tolerance=agent.risk_tolerance,
            ethics_threshold=agent.ethics_threshold,
            influence=agent.influence,
            capital=agent.capital,
            information_access=agent.information_access,
            adaptation_rate=agent.adaptation_rate,
            trust_network=json.dumps(agent.trust_network),
            goals=goals_text,
            physics=physics_text,
            world_state=json.dumps(world_state, default=str)[:4000],
            memories=memories_text,
            tick=tick,
            action_menu=ACTION_MENU,
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": AGENT_DECISION_USER_PROMPT.format(
                tick=tick, persona_name=agent.persona_name)},
        ]

        kwargs = dict(
            schema=AGENT_DECISION_SCHEMA,
            temperature=DEFAULT_AGENT_TEMPERATURE,
            max_tokens=DEFAULT_AGENT_DECISION_TOKEN_BUDGET,
        )
        if model:
            kwargs["model"] = model
        planned_action = await generate_json(messages, **kwargs)

        # Attribute and normalize the action for the resolver.
        planned_action.setdefault("action_type", "WAIT")
        planned_action["agent_id"] = agent.agent_id
        planned_action["agent_type"] = agent.agent_type
        try:
            planned_action["magnitude"] = float(planned_action.get("magnitude", 0.0))
        except (TypeError, ValueError):
            planned_action["magnitude"] = 0.0
        return planned_action


def _format_physics(params: Dict[str, Any]) -> str:
    if not params:
        return "(default reality physics)"
    return "\n".join(f"- {k}: {v}" for k, v in params.items())
