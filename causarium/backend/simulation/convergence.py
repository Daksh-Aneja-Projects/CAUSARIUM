"""
Convergence detection.

A simulation is "converged" when the world stops producing meaningful change:
either activity collapses (few successful, non-idle actions) or the mix of
behaviors stabilizes across a window of ticks. Either signals that running
further ticks is unlikely to surface new causal structure, so the run can stop
early (PRD 9.1 termination: tick limit / convergence / user interrupt).
"""

from collections import Counter, deque
from typing import Any, Dict, List


class ConvergenceDetector:
    def __init__(
        self,
        patience: int = 5,
        activity_threshold: float = 0.05,
        stability_threshold: float = 0.02,
    ) -> None:
        # ``patience`` consecutive quiet/stable ticks -> converged.
        self.patience = patience
        self.activity_threshold = activity_threshold
        self.stability_threshold = stability_threshold
        self._activity: deque = deque(maxlen=patience)
        self._signatures: deque = deque(maxlen=patience)

    def observe(self, events: List[Dict[str, Any]], n_agents: int) -> None:
        active = sum(
            1
            for e in events
            if e.get("status") == "SUCCESS" and e.get("type") == "ACTION_EXECUTED"
        )
        # Activity normalized per agent so the threshold is scale-free.
        self._activity.append(active / max(1, n_agents))
        self._signatures.append(self._signature(events))

    def converged(self) -> bool:
        if len(self._activity) < self.patience:
            return False
        # (a) Sustained low activity.
        if all(a <= self.activity_threshold for a in self._activity):
            return True
        # (b) Behavioral mix unchanged across the window.
        first = self._signatures[0]
        if all(self._distance(first, sig) <= self.stability_threshold
               for sig in self._signatures):
            return True
        return False

    # ------------------------------------------------------------------ #
    @staticmethod
    def _signature(events: List[Dict[str, Any]]) -> Dict[str, float]:
        """Normalized histogram of action types this tick."""
        counts = Counter(e.get("action_type") for e in events if e.get("action_type"))
        total = sum(counts.values())
        if total == 0:
            return {}
        return {k: v / total for k, v in counts.items()}

    @staticmethod
    def _distance(a: Dict[str, float], b: Dict[str, float]) -> float:
        """L1 distance between two normalized histograms."""
        keys = set(a) | set(b)
        return sum(abs(a.get(k, 0.0) - b.get(k, 0.0)) for k in keys)
