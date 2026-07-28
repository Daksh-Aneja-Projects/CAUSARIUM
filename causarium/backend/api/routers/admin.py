from __future__ import annotations

from fastapi import APIRouter

from backend.monitoring.usage_meter import UsageMeter

router = APIRouter(prefix="/admin", tags=["admin"])

meter = UsageMeter()


@router.get("/usage")
def get_usage_summary() -> dict[str, object]:
    return {"status": "ok", **meter.summary()}


@router.post("/usage/record")
def record_usage(simulation_id: str, token_count: int = 0) -> dict[str, object]:
    event = meter.record_run(simulation_id, token_count)
    return {"status": "recorded", "event": {"simulation_id": event.simulation_id, "token_count": event.token_count}}
