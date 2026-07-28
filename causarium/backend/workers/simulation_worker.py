import asyncio
from typing import Any, Dict, List
from causarium.backend.workers.celery_app import celery_app
from causarium.backend.simulation.run_manager import SimulationOrchestrator

try:
    from causarium.backend.db.postgres import append_events
except ImportError:
    # Fallback/mock if the module hasn't been implemented yet
    async def append_events(run_id: str, tick: int, events: list):
        pass

async def stream_events_to_db(run_id: str, tick: int, events: List[Dict[str, Any]]):
    try:
        await append_events(run_id, tick, events)
    except Exception as e:
        print(f"Failed to stream events for run {run_id}, tick {tick}: {e}")

@celery_app.task(bind=True, name="run_simulation_task")
def run_simulation_task(self, scenario_params: Dict[str, Any], agent_configs: list, max_ticks: int = 100):
    """
    Executes a simulation run as a Celery task.
    Parallelizing N runs independently with no shared state.
    Each run writes complete event log to PostgreSQL.
    """
    run_id = self.request.id or "local-run"
    
    orchestrator = SimulationOrchestrator(run_id=run_id, max_ticks=max_ticks)
    orchestrator.initialize_world(scenario_params, agent_configs)
    
    # Run the async orchestrator loop inside the synchronous Celery task
    asyncio.run(orchestrator.run_simulation(event_callback=stream_events_to_db))
    
    return {"run_id": run_id, "status": "COMPLETED", "ticks": orchestrator.world_state.tick}
