"""
Event extraction / preprocessing.

Filters a raw run event log down to the events eligible for causal-graph
construction: real, consequential occurrences. Pure no-ops (WAIT/IDLE) and
attempts that produced no effect are dropped so they do not add noise nodes to
the causal graph.
"""

from typing import Any, Dict, List

_NOISE_STATUSES = {"IDLE"}
_MIN_EFFECT = 1e-6


class Extractor:
    def extract_events(self, run_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        filtered: List[Dict[str, Any]] = []
        for e in run_events:
            if e.get("action_type") == "WAIT":
                continue
            if e.get("status") in _NOISE_STATUSES:
                continue
            # Keep black swans and cascades regardless; keep actions with any effect.
            if e.get("type") in ("BLACK_SWAN", "CASCADE"):
                filtered.append(e)
                continue
            if float(e.get("effect_magnitude", 0.0)) > _MIN_EFFECT:
                filtered.append(e)
        return filtered
