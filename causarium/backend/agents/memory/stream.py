import uuid
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class MemoryEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tick: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: str # "OBSERVATION", "ACTION", "MESSAGE", "WORLD_STATE"
    content: Dict[str, Any]
    importance_score: float = Field(default=0.0)

class MemoryStream(BaseModel):
    agent_id: str
    events: List[MemoryEvent] = Field(default_factory=list)

    def append_event(self, tick: int, event_type: str, content: Dict[str, Any]) -> MemoryEvent:
        event = MemoryEvent(
            tick=tick,
            event_type=event_type,
            content=content
        )
        self.events.append(event)
        return event

    def get_recent_events(self, limit: int = 10) -> List[MemoryEvent]:
        return self.events[-limit:]
