import json
from typing import Dict, Any

from ..base_agent import CausariumAgent
from .stream import MemoryStream
from ...constants import DEFAULT_AGENT_REFLECTION_TOKEN_BUDGET
from ...llm.router import generate_json
from ...llm.prompts.agent_reflection import (
    AGENT_REFLECTION_SYSTEM_PROMPT,
    AGENT_REFLECTION_USER_PROMPT,
    AGENT_REFLECTION_SCHEMA,
)


class ReflectionEngine:
    async def reflect(
        self, agent: CausariumAgent, stream: MemoryStream, tick: int
    ) -> Dict[str, Any]:
        """
        Periodically summarize and score recent memories, extract patterns, and
        (respecting goal_persistence) update the agent's goals in place.
        """
        recent_events = stream.get_recent_events(limit=20)
        if not recent_events:
            return {}

        events_text = "\n".join(
            f"Tick {e.tick} [{e.event_type}]: {json.dumps(e.content, default=str)[:240]}"
            for e in recent_events
        )
        goals_text = (
            "\n".join(f"{i + 1}. {g}" for i, g in enumerate(agent.current_goals))
            or "(none)"
        )

        system_prompt = AGENT_REFLECTION_SYSTEM_PROMPT.format(
            persona_name=agent.persona_name,
            agent_type=agent.agent_type,
            goals=goals_text,
            event_log=events_text,
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": AGENT_REFLECTION_USER_PROMPT},
        ]

        reflection = await generate_json(
            messages,
            schema=AGENT_REFLECTION_SCHEMA,
            temperature=0.6,
            max_tokens=DEFAULT_AGENT_REFLECTION_TOKEN_BUDGET,
        )

        # Apply goal updates only when the agent's persistence permits change.
        updated_goals = reflection.get("updated_goals")
        goals_changed = reflection.get("goals_changed", bool(updated_goals))
        if (
            updated_goals
            and isinstance(updated_goals, list)
            and goals_changed
            and agent.goal_persistence < 1.0
        ):
            agent.current_goals = [str(g) for g in updated_goals]

        # Back-propagate importance to the reflected-upon memories.
        importance = reflection.get("importance")
        if isinstance(importance, (int, float)):
            score = max(0.0, min(1.0, float(importance) / 10.0))
            for event in recent_events:
                event.importance_score = max(event.importance_score, score)

        return reflection
