from __future__ import annotations

import uuid
from celery.result import AsyncResult

from backend.config import get_settings
from backend.workers.celery_app import celery_app

settings = get_settings()


class SimulationOrchestrator:
    def __init__(self) -> None:
        self.simulation_id = str(uuid.uuid4())

    def start(self, payload: dict[str, object]) -> str:
        run_count = int(payload.get("run_count", settings.DEFAULT_RUN_COUNT))
        for run_index in range(run_count):
            run_payload = {
                "simulation_id": self.simulation_id,
                "run_index": run_index + 1,
                "payload": payload,
            }
            celery_app.send_task("simulation.run_single", args=[run_payload])
        return self.simulation_id
