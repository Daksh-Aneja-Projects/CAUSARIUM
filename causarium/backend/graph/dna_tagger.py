"""
Reality DNA (PRD §14.1).

Compresses a full simulation run into a 10-dimensional behavioral fingerprint in
[0, 1]. Two runs with similar DNA behaved similarly regardless of surface detail,
which is what lets the timeline cluster runs and the attractor engine find basins
of convergence. Every dimension is derived from the resolved event log and the
terminal agent states — no hardcoded 0.5 placeholders.
"""

import math
from collections import Counter, defaultdict
from typing import Any, Dict, List

from ..constants import AGGRESSIVE_ACTIONS, ActionType

DNA_DIMENSIONS = [
    "aggression", "innovation", "trust", "risk", "chaos",
    "adaptability", "fragility", "resilience", "intelligence", "entropy",
]

_AGGRESSIVE_VALUES = {a.value for a in AGGRESSIVE_ACTIONS}
_INNOVATIVE_VALUES = {ActionType.INNOVATE.value, ActionType.IMITATE.value}
_COOPERATIVE_VALUES = {
    ActionType.COOPERATE.value, ActionType.FORM_ALLIANCE.value,
    ActionType.NEGOTIATE.value, ActionType.DE_ESCALATE.value,
}


class DNATagger:
    def compute_dna(
        self,
        events: List[Dict[str, Any]],
        terminal_agents: Dict[str, Dict[str, Any]] | None = None,
    ) -> Dict[str, float]:
        terminal_agents = terminal_agents or {}
        action_events = [e for e in events if e.get("type") == "ACTION_EXECUTED"]
        attempts = [e for e in action_events if e.get("action_type") != ActionType.WAIT.value]
        n_attempts = max(1, len(attempts))
        successes = [e for e in attempts if e.get("status") == "SUCCESS"]

        # 1. aggression — share of aggressive intent among attempted actions.
        aggression = sum(1 for e in attempts if e.get("action_type") in _AGGRESSIVE_VALUES) / n_attempts

        # 2. innovation — share of capability-building moves (INNOVATE weighted 2x).
        innovation = sum(
            (2.0 if e.get("action_type") == ActionType.INNOVATE.value else 1.0)
            for e in attempts if e.get("action_type") in _INNOVATIVE_VALUES
        ) / (2.0 * n_attempts)

        # 3. trust — mean terminal inter-agent trust, remapped from [-1,1] to [0,1].
        trust_vals: List[float] = []
        for a in terminal_agents.values():
            trust_vals.extend((a.get("trust_network") or {}).values())
        trust = (sum(trust_vals) / len(trust_vals) + 1.0) / 2.0 if trust_vals else 0.5

        # 4. risk — mean committed magnitude (willingness to commit force).
        mags = [float(e.get("magnitude", 0.0)) for e in attempts]
        risk = sum(mags) / len(mags) if mags else 0.0

        # 5. chaos — share of disruptive events (black swans + cascades) in the log.
        n_events = max(1, len(events))
        chaos = sum(1 for e in events if e.get("type") in ("BLACK_SWAN", "CASCADE")) / n_events
        chaos = min(1.0, chaos * 3.0)  # these are rare; scale into a usable range

        # 6. adaptability — how much the behavioral mix shifts over time (mean
        #    tick-to-tick L1 change in the action-type histogram).
        adaptability = self._behavioral_drift(action_events)

        # 7. fragility — share of attempts that failed or were contested (effort
        #    that did not translate into effect).
        fragility = sum(
            1 for e in attempts if e.get("status") in ("FAILED", "CONTESTED")
        ) / n_attempts

        # 8. resilience — recovery of activity in the ticks after a shock.
        resilience = self._resilience(events)

        # 9. intelligence — effective conversion: mean effect of successful actions
        #    times the success rate (getting real outcomes per attempt).
        success_rate = len(successes) / n_attempts
        mean_effect = (
            sum(float(e.get("effect_magnitude", 0.0)) for e in successes) / len(successes)
            if successes else 0.0
        )
        intelligence = success_rate * (0.5 + 0.5 * mean_effect)

        # 10. entropy — Shannon entropy of the action-type distribution, normalized.
        entropy = self._normalized_entropy(
            Counter(e.get("action_type") for e in attempts)
        )

        return {
            "aggression": _clamp(aggression),
            "innovation": _clamp(innovation),
            "trust": _clamp(trust),
            "risk": _clamp(risk),
            "chaos": _clamp(chaos),
            "adaptability": _clamp(adaptability),
            "fragility": _clamp(fragility),
            "resilience": _clamp(resilience),
            "intelligence": _clamp(intelligence),
            "entropy": _clamp(entropy),
        }

    # ------------------------------------------------------------------ #
    @staticmethod
    def _behavioral_drift(action_events: List[Dict[str, Any]]) -> float:
        by_tick: Dict[int, Counter] = defaultdict(Counter)
        for e in action_events:
            by_tick[e.get("tick", 0)][e.get("action_type")] += 1
        ticks = sorted(by_tick)
        if len(ticks) < 2:
            return 0.0

        def norm(c: Counter) -> Dict[str, float]:
            total = sum(c.values()) or 1
            return {k: v / total for k, v in c.items()}

        drifts = []
        prev = norm(by_tick[ticks[0]])
        for t in ticks[1:]:
            cur = norm(by_tick[t])
            keys = set(prev) | set(cur)
            drifts.append(0.5 * sum(abs(prev.get(k, 0) - cur.get(k, 0)) for k in keys))
            prev = cur
        return sum(drifts) / len(drifts)

    @staticmethod
    def _resilience(events: List[Dict[str, Any]]) -> float:
        shock_ticks = sorted({e.get("tick", 0) for e in events if e.get("type") == "BLACK_SWAN"})
        if not shock_ticks:
            return 0.5  # never tested -> neutral prior
        activity: Dict[int, int] = defaultdict(int)
        for e in events:
            if e.get("type") == "ACTION_EXECUTED" and e.get("status") == "SUCCESS":
                activity[e.get("tick", 0)] += 1
        recoveries = []
        for st in shock_ticks:
            before = activity.get(st - 1, 0)
            after = max(activity.get(st + 1, 0), activity.get(st + 2, 0))
            if before <= 0:
                recoveries.append(1.0 if after > 0 else 0.5)
            else:
                recoveries.append(min(1.0, after / before))
        return sum(recoveries) / len(recoveries)

    @staticmethod
    def _normalized_entropy(counts: Counter) -> float:
        total = sum(counts.values())
        if total <= 0 or len(counts) <= 1:
            return 0.0
        probs = [c / total for c in counts.values()]
        h = -sum(p * math.log(p) for p in probs if p > 0)
        return h / math.log(len(counts))


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    try:
        return max(lo, min(hi, float(x)))
    except (TypeError, ValueError):
        return lo
