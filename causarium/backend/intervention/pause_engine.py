from __future__ import annotations

from typing import Any, Sequence


def pause_simulation(tick: int, reason: str, duration: int = 1, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "action": "pause",
        "tick": tick,
        "duration": duration,
        "reason": reason,
        "payload": metadata or {},
    }


def inject_variable(name: str, value: Any, tick: int, scope: str = "global") -> dict[str, Any]:
    return {
        "action": "inject_variable",
        "tick": tick,
        "payload": {"name": name, "value": value, "scope": scope},
    }


def reroute_outcome(outcome: str, path: str, tick: int, reason: str | None = None) -> dict[str, Any]:
    return {
        "action": "reroute_outcome",
        "tick": tick,
        "payload": {"outcome": outcome, "path": path, "reason": reason or "stability mitigation"},
    }


def build_intervention_plan(discoveries: Sequence[dict[str, Any]], tick: int | None = None) -> list[dict[str, Any]]:
    if not discoveries:
        return [pause_simulation(tick or 0, "baseline observation", duration=1)]

    interventions: list[dict[str, Any]] = []
    for discovery in discoveries:
        discovery_type = discovery.get("type")
        payload = discovery.get("payload", {}) or {}
        current_tick = int(tick or 0)

        if discovery_type == "choke_point":
            choke_points = payload.get("choke_points", []) or []
            if choke_points:
                current_tick = int(choke_points[0].get("tick", current_tick))
                interventions.append(pause_simulation(current_tick, "choke point detected", duration=1))
        elif discovery_type == "attractor":
            interventions.append(inject_variable("stability_bias", 0.3, current_tick))
        elif discovery_type == "repeller":
            interventions.append(reroute_outcome("low_score_path", "mitigation_path", current_tick))

    if not interventions:
        interventions.append(pause_simulation(current_tick, "fallback intervention", duration=1))

    return interventions
