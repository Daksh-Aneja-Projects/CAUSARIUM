import asyncio
from typing import List, Dict, Any
from .world_state import WorldState
from .action_resolver import ActionResolver

class TickEngine:
    """
    Implements the full tick lifecycle from PRD Section 9.1:
    1. World state broadcast
    2. Agents perceive, retrieve memories, reflect, plan, execute
    3. Action resolution engine resolves conflicts
    4. World state updated
    5. Events appended to log
    """
    def __init__(self, action_resolver: ActionResolver):
        self.action_resolver = action_resolver

    async def run_tick(self, world_state: WorldState, agents_logic: List[Any]) -> List[Dict[str, Any]]:
        proposed_actions = []
        
        # 1. World state broadcast (provided implicitly via world_state param)
        
        # 2. Parallel agent execution
        async def process_agent(agent):
            # a. Perceives world state
            perception = await agent.perceive(world_state)
            
            # b. Retrieves relevant memories (internal to agent)
            # c. Reflects (if N % R == 0)
            if world_state.tick % getattr(agent, "reflection_interval", 5) == 0:
                await agent.reflect(perception)
                
            # d. Plans next actions & e. Executes actions
            action = await agent.plan_and_execute(perception)
            return action

        tasks = [process_agent(agent) for agent in agents_logic]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for res in results:
            if res and not isinstance(res, Exception):
                proposed_actions.append(res)
                
        # 3. Action resolution engine resolves conflicts
        resolved_events = self.action_resolver.resolve(world_state, proposed_actions)
        
        # 4. World state updated
        world_state.tick += 1
        world_state.global_events.extend(resolved_events)
        
        # 5. Return events for appending to log
        return resolved_events
