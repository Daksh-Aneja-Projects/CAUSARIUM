"""
Simulation API — real, in-process execution backed by the SimulationEngine.

POST   /v1/simulations            create + start a simulation (runs in background)
GET    /v1/simulations            list all simulations
GET    /v1/simulations/{id}       status + progress
GET    /v1/simulations/{id}/discovery   full discovery results (202 until ready)
POST   /v1/simulations/{id}/report      generate a Reality Report PDF
WS     /v1/simulations/{id}/stream       live tick / run / discovery event stream
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from ..engine import engine
from ...reports.generator import RealityReportGenerator

router = APIRouter()
_report_generator = RealityReportGenerator()


class SimulationCreateRequest(BaseModel):
    scenario_name: str = Field("Untitled scenario", description="Scenario title")
    description: Optional[str] = Field(None, description="Optional scenario context")
    run_count: int = Field(12, ge=1, le=500)
    tick_depth: int = Field(25, ge=1, le=200)
    mode: str = Field("heuristic", description="'heuristic' (fast, no LLM) or 'llm'")
    constraint_params: Optional[Dict[str, float]] = None
    population: Optional[List[Dict[str, Any]]] = None


class SimulationCreateResponse(BaseModel):
    simulation_id: str
    status: str
    websocket_url: str


@router.post("/", response_model=SimulationCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_simulation(payload: SimulationCreateRequest) -> SimulationCreateResponse:
    session = engine.create(payload.model_dump())
    # Launch execution in the background; it streams to WS subscribers.
    asyncio.create_task(engine.run(session.simulation_id))
    return SimulationCreateResponse(
        simulation_id=session.simulation_id,
        status=session.status,
        websocket_url=f"/v1/simulations/{session.simulation_id}/stream",
    )


@router.get("/")
async def list_simulations() -> Dict[str, Any]:
    return {"simulations": engine.list()}


@router.get("/{simulation_id}")
async def get_simulation(simulation_id: str) -> Dict[str, Any]:
    session = engine.get(simulation_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return session.public_state()


@router.get("/{simulation_id}/discovery")
async def get_discovery(simulation_id: str) -> Dict[str, Any]:
    session = engine.get(simulation_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if session.discovery is None:
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail=f"Discovery not ready (status={session.status}, progress={session.progress:.0%})",
        )
    return session.discovery


@router.get("/{simulation_id}/graph")
async def get_graph(simulation_id: str) -> Dict[str, Any]:
    session = engine.get(simulation_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if session.discovery is None:
        raise HTTPException(status_code=202, detail="Graph not ready")
    return engine.graph_data(session)


class InterventionRequest(BaseModel):
    agent_index: int = Field(0, ge=0)
    attribute: str = Field("risk_tolerance")
    value: float = Field(0.5)
    tick: Optional[int] = None  # accepted for UI compatibility


@router.post("/{simulation_id}/intervene")
async def intervene(simulation_id: str, payload: InterventionRequest) -> Dict[str, Any]:
    session = engine.get(simulation_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if not session.runs:
        raise HTTPException(status_code=409, detail="Run the simulation before intervening")
    return await engine.run_counterfactual(
        session, payload.agent_index, payload.attribute, payload.value
    )


@router.post("/{simulation_id}/report")
async def generate_report(simulation_id: str) -> Response:
    session = engine.get(simulation_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if session.discovery is None:
        raise HTTPException(status_code=409, detail="Run discovery before generating a report")

    data = {
        "title": session.config.get("title"),
        "context": session.config.get("context"),
        "executive_summary": (
            f"{len(session.runs)} runs analyzed. "
            f"{len(session.discovery.get('attractors', []))} attractors, "
            f"{len(session.discovery.get('choke_points', []))} choke points, "
            f"{len(session.discovery.get('hidden_causal_chains', []))} hidden causal chains."
        ),
        **session.discovery,
    }
    pdf = await asyncio.to_thread(
        _report_generator.generate_report_bytes, simulation_id, data
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="reality_report_{simulation_id}.pdf"'},
    )


@router.websocket("/{simulation_id}/stream")
async def stream(websocket: WebSocket, simulation_id: str) -> None:
    await websocket.accept()
    session = engine.get(simulation_id)
    if session is None:
        await websocket.send_json({"type": "error", "message": "Simulation not found"})
        await websocket.close()
        return

    queue = session.subscribe()
    try:
        # Replay current state so late subscribers aren't blank.
        await websocket.send_json({"type": "status", **session.public_state()})
        while True:
            event = await queue.get()
            await websocket.send_json(event)
            if event.get("type") in ("complete", "error"):
                # Give the client a moment, then keep the socket open for polling.
                pass
    except WebSocketDisconnect:
        pass
    finally:
        session.unsubscribe(queue)
