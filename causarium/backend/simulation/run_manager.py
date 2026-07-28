import asyncio
import uuid
from typing import Any, List, Dict
from .world_state import WorldState, AgentState
from .tick_engine import TickEngine
from .action_resolver import ActionResolver

# Mock base agent logic for type hinting and structural completeness
class BaseAgentLogic:
    def __init__(self, agent_id: str, config: dict):
        self.agent_id = agent_id
        self.config = config
        self.reflection_interval = 5

    async def perceive(self, world_state: WorldState) -> Any:
        return {"current_tick": world_state.tick}
    
    async def reflect(self, perception: Any):
        pass

    async def plan_and_execute(self, perception: Any) -> Dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "action_type": "IDLE",
            "magnitude": 0.0
        }

class SimulationOrchestrator:
    def __init__(self, run_id: str = None, max_ticks: int = 100):
        self.run_id = run_id or str(uuid.uuid4())
        self.max_ticks = max_ticks
        self.action_resolver = ActionResolver()
        self.tick_engine = TickEngine(self.action_resolver)
        self.world_state = WorldState(run_id=self.run_id)
        self.agents_logic: List[BaseAgentLogic] = []

    def initialize_world(self, scenario_params: Dict[str, Any], agent_configs: List[Dict[str, Any]]):
        """
        PRD 9.1 Step 2: WORLD INITIALIZATION
        """
        # Set scenario constraints if provided
        for k, v in scenario_params.items():
            if hasattr(self.world_state.constraint_params, k):
                setattr(self.world_state.constraint_params, k, v)

        # Initialize agents
        for ac in agent_configs:
            agent_id = str(uuid.uuid4())
            agent_type = ac.get("type", "UNKNOWN")
            agent_state = AgentState(
                agent_id=agent_id, 
                agent_type=agent_type,
                confidence=ac.get("confidence", 0.5),
                risk_tolerance=ac.get("risk_tolerance", 0.5)
            )
            self.world_state.agents[agent_id] = agent_state
            self.agents_logic.append(BaseAgentLogic(agent_id=agent_id, config=ac))

    async def run_simulation(self, event_callback=None):
        """
        PRD 9.1 Step 3, 4, 5, 6
        """
        for _ in range(1, self.max_ticks + 1):
            events = await self.tick_engine.run_tick(self.world_state, self.agents_logic)
            
            if event_callback:
                await event_callback(self.run_id, self.world_state.tick, events)
            
            if self.check_termination():
                break

    def check_termination(self) -> bool:
        """
        PRD 9.1 Step 4: TERMINATION
        Triggered by: tick limit reached / convergence detected / user interrupt
        """
        if self.world_state.tick >= self.max_ticks:
            return True
        return False
