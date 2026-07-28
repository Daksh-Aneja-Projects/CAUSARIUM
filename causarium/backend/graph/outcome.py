"""
Terminal-outcome classification.

Maps a run's reality-DNA and terminal agent states onto a small vocabulary of
qualitative end-states. Discrete outcomes are what the attractor, repeller, and
singularity engines cluster and count over, so this turns the continuous DNA
fingerprint into the categorical signal those engines need.
"""

from typing import Any, Dict


OUTCOMES = [
    "SYSTEMIC_COLLAPSE",
    "CONFLICT_ESCALATION",
    "MONOPOLY_CAPTURE",
    "DISRUPTIVE_INNOVATION",
    "STABLE_COOPERATION",
    "FRAGMENTED_STALEMATE",
]


def classify_outcome(
    dna: Dict[str, float], terminal_agents: Dict[str, Dict[str, Any]] | None = None
) -> str:
    """Classify a run into one qualitative terminal outcome."""
    d = dna or {}
    chaos = d.get("chaos", 0.0)
    fragility = d.get("fragility", 0.0)
    resilience = d.get("resilience", 0.5)
    aggression = d.get("aggression", 0.0)
    trust = d.get("trust", 0.5)
    innovation = d.get("innovation", 0.0)

    concentration = _capital_concentration(terminal_agents or {})

    # Order matters: collapse and conflict dominate softer readings.
    if chaos > 0.5 or (fragility > 0.6 and resilience < 0.4):
        return "SYSTEMIC_COLLAPSE"
    if aggression > 0.5:
        return "CONFLICT_ESCALATION"
    if concentration > 0.6:
        return "MONOPOLY_CAPTURE"
    if innovation > 0.4:
        return "DISRUPTIVE_INNOVATION"
    if trust > 0.6 and aggression < 0.3:
        return "STABLE_COOPERATION"
    return "FRAGMENTED_STALEMATE"


def _capital_concentration(terminal_agents: Dict[str, Dict[str, Any]]) -> float:
    """Gini coefficient of terminal capital (0 = equal, 1 = one agent owns all)."""
    caps = [max(0.0, float(a.get("capital", 0.0))) for a in terminal_agents.values()]
    n = len(caps)
    if n < 2:
        return 0.0
    total = sum(caps)
    if total <= 0:
        return 0.0
    caps.sort()
    cumulative = 0.0
    for i, c in enumerate(caps, start=1):
        cumulative += i * c
    # Gini via the ordered-values formula.
    gini = (2.0 * cumulative) / (n * total) - (n + 1.0) / n
    return max(0.0, min(1.0, gini))
