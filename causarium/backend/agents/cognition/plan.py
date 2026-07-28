import json
from typing import Dict, Any
from ..base_agent import CausariumAgent
from ..memory.stream import MemoryStream
from ..memory.retrieval import RetrievalEngine
from ...llm.router import generate_response
from ...llm.prompts.agent_decision import AGENT_DECISION_SYSTEM_PROMPT, AGENT_DECISION_USER_PROMPT

class PlanEngine:
    async def plan(self, agent: CausariumAgent, stream: MemoryStream, world_state: Dict[str, Any], tick: int) -> Dict[str, Any]:
        """
        Generate the next action for the agent based on goals, memory, and world state.
        """
        retrieval = RetrievalEngine(stream)
        # Retrieve recent or relevant context
        relevant_memories = retrieval.retrieve_relevant(query="current context", limit=5)
        
        memories_text = "\n".join([f"[{e.event_type}]: {json.dumps(e.content)}" for e in relevant_memories])
        
        system_prompt = AGENT_DECISION_SYSTEM_PROMPT.format(
            persona_name=agent.persona_name,
            agent_type=agent.agent_type,
            organization=agent.organization,
            confidence=agent.confidence,
            risk_tolerance=agent.risk_tolerance,
            ethics_threshold=agent.ethics_threshold,
            trust_network=json.dumps(agent.trust_network),
            goals=json.dumps(agent.current_goals),
            world_state=json.dumps(world_state),
            memories=memories_text
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": AGENT_DECISION_USER_PROMPT}
        ]

        response_text = await generate_response(messages, temperature=0.8)
        
        try:
            planned_action = json.loads(response_text)
        except json.JSONDecodeError:
            # Wrap unstructured text if LLM fails strict JSON
            planned_action = {"action_type": "UNSTRUCTURED", "payload": response_text}
            
        return planned_action
