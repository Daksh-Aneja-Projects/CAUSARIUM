import json
from typing import List
from ..base_agent import CausariumAgent
from .stream import MemoryStream, MemoryEvent
from ...llm.router import generate_response
from ...llm.prompts.agent_reflection import AGENT_REFLECTION_SYSTEM_PROMPT

class ReflectionEngine:
    async def reflect(self, agent: CausariumAgent, stream: MemoryStream, tick: int) -> dict:
        """
        Periodically summarize and score importance of recent memories.
        """
        recent_events = stream.get_recent_events(limit=20)
        if not recent_events:
            return {}

        events_text = "\n".join([f"Tick {e.tick} [{e.event_type}]: {json.dumps(e.content)}" for e in recent_events])

        prompt = AGENT_REFLECTION_SYSTEM_PROMPT.format(
            persona_name=agent.persona_name,
            agent_type=agent.agent_type,
            event_log=events_text
        )

        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": "Please generate your structured reflection (JSON)."}
        ]

        response_text = await generate_response(messages)
        
        # Here we would parse JSON and update goal / importance scores in the stream
        try:
            reflection_data = json.loads(response_text)
            # Update goals if provided
            if "updated_goals" in reflection_data:
                agent.current_goals = reflection_data["updated_goals"]
            return reflection_data
        except json.JSONDecodeError:
            # Fallback if LLM doesn't output strict JSON
            return {"raw": response_text}
