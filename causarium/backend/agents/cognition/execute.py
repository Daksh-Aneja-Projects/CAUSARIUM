from typing import Dict, Any, List
from ..base_agent import CausariumAgent
from ..memory.stream import MemoryStream

class ExecuteEngine:
    def execute(self, agent: CausariumAgent, planned_action: Dict[str, Any], stream: MemoryStream, tick: int) -> Dict[str, Any]:
        """
        Convert a planned action into an execution event.
        Returns the action payload to be broadcast to the orchestrator or world.
        """
        # Append to memory that we took this action
        stream.append_event(
            tick=tick,
            event_type="ACTION",
            content=planned_action
        )
        
        # Structure the outgoing message for the Interaction Interface
        outgoing_message = {
            "source_agent_id": agent.agent_id,
            "agent_type": agent.agent_type,
            "tick": tick,
            "action": planned_action
        }
        
        return outgoing_message
