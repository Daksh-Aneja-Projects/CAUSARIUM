from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class UsageEvent:
    simulation_id: str
    token_count: int


class UsageMeter:
    def __init__(self) -> None:
        self._events: list[UsageEvent] = []

    def record_run(self, simulation_id: str, token_count: int) -> UsageEvent:
        event = UsageEvent(simulation_id=simulation_id, token_count=max(token_count, 0))
        self._events.append(event)
        return event

    def summary(self) -> dict[str, Any]:
        total_runs = len(self._events)
        total_tokens = sum(event.token_count for event in self._events)
        return {
            "total_runs": total_runs,
            "total_tokens": total_tokens,
            "latest_simulation_id": self._events[-1].simulation_id if self._events else None,
        }
