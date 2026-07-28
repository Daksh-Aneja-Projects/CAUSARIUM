from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/simulations", tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, simulation_id: str):
        await websocket.accept()
        if simulation_id not in self.active_connections:
            self.active_connections[simulation_id] = []
        self.active_connections[simulation_id].append(websocket)
        logger.info(f"Client connected to simulation stream: {simulation_id}")

    def disconnect(self, websocket: WebSocket, simulation_id: str):
        if simulation_id in self.active_connections:
            self.active_connections[simulation_id].remove(websocket)
            if not self.active_connections[simulation_id]:
                del self.active_connections[simulation_id]

    async def broadcast_to_simulation(self, simulation_id: str, message: Dict[str, Any]):
        if simulation_id in self.active_connections:
            for connection in self.active_connections[simulation_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/{simulation_id}/stream")
async def simulation_stream(websocket: WebSocket, simulation_id: str):
    await manager.connect(websocket, simulation_id)
    try:
        while True:
            # Maintain connection
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, simulation_id)

async def emit_event(simulation_id: str, event_type: str, payload: Dict[str, Any] = None):
    """
    Emits simulation events (Section 15.3). Called by Simulation Orchestrator.
    """
    VALID_EVENTS = {
        "RUN_STARTED", 
        "RUN_COMPLETED", 
        "DISCOVERY_STARTED", 
        "ATTRACTOR_FOUND", 
        "CHOKE_POINT_FOUND", 
        "BUTTERFLY_FOUND", 
        "SIMULATION_COMPLETE"
    }
    
    if event_type not in VALID_EVENTS:
        raise ValueError(f"Invalid event type: {event_type}")
        
    message = {
        "event": event_type,
        "payload": payload or {}
    }
    await manager.broadcast_to_simulation(simulation_id, message)
