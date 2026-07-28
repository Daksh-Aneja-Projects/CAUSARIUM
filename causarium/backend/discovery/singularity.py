"""
Singularity detection (PRD §12).

A singularity is a decision point where the futures split: runs do not spread
smoothly but pile into two distinct outcome clusters. We test each reality-DNA
dimension for bimodality across runs; a strongly bimodal dimension means the
system bifurcates. We then attribute the split to the agent decision whose
presence most separates the two modes, and locate the tick where it happens.
"""

from collections import Counter
from statistics import median
from typing import List

from ..models.discovery import Singularity
from ..models.run_result import RunResult
from ..graph.dna_tagger import DNA_DIMENSIONS
from ._stats import bimodality_coefficient

BIMODALITY_THRESHOLD = 0.555  # Sarle's rule of thumb


class SingularityFinder:
    def find_singularities(
        self, runs: List[RunResult], simulation_id: str = "sim-local"
    ) -> List[Singularity]:
        if len(runs) < 4:
            return []

        singularities: List[Singularity] = []
        counter = 1
        for dim in DNA_DIMENSIONS:
            values = [float(r.reality_dna.get(dim, 0.5)) for r in runs]
            bc = bimodality_coefficient(values)
            if bc < BIMODALITY_THRESHOLD:
                continue

            split = median(values)
            low = [r for r, v in zip(runs, values) if v <= split]
            high = [r for r, v in zip(runs, values) if v > split]
            if not low or not high:
                continue

            decision, tick = self._discriminating_decision(low, high)
            singularities.append(
                Singularity(
                    singularity_id=f"DS-{counter:03d}",
                    simulation_id=simulation_id,
                    tick=tick,
                    decision=decision,
                    outcome_cluster_a={
                        "label_is": _dominant(low), "size": len(low), f"mean_{dim}": round(_mean(low, dim), 4)
                    },
                    outcome_cluster_b={
                        "label_is": _dominant(high), "size": len(high), f"mean_{dim}": round(_mean(high, dim), 4)
                    },
                    middle_outcome_frequency=0.0,
                    bimodality=round(bc, 4),
                    decision_sensitivity=f"Bifurcates on '{dim}'; small shifts flip the cluster.",
                )
            )
            counter += 1
        return singularities

    # ------------------------------------------------------------------ #
    def _discriminating_decision(self, low: List[RunResult], high: List[RunResult]):
        """Find the (agent_type:action) whose frequency differs most between the
        two clusters, and the median tick at which it occurs."""
        low_freq = _decision_frequencies(low)
        high_freq = _decision_frequencies(high)
        keys = set(low_freq) | set(high_freq)
        if not keys:
            return "UNKNOWN_DECISION", 0

        best_key = max(keys, key=lambda k: abs(low_freq.get(k, 0.0) - high_freq.get(k, 0.0)))
        ticks = [
            e.get("tick", 0)
            for r in (low + high)
            for e in r.events
            if f"{e.get('agent_type')}:{e.get('action_type')}" == best_key
        ]
        return best_key, int(median(ticks)) if ticks else 0


# --------------------------------------------------------------------------- #
def _decision_frequencies(runs: List[RunResult]) -> dict:
    freq: Counter = Counter()
    for r in runs:
        seen = {
            f"{e.get('agent_type')}:{e.get('action_type')}"
            for e in r.events
            if e.get("type") == "ACTION_EXECUTED" and e.get("status") == "SUCCESS"
        }
        freq.update(seen)
    n = max(1, len(runs))
    return {k: v / n for k, v in freq.items()}


def _dominant(runs: List[RunResult]) -> str:
    counts = Counter(r.terminal_outcome or "UNKNOWN" for r in runs)
    return counts.most_common(1)[0][0] if counts else "UNKNOWN"


def _mean(runs: List[RunResult], dim: str) -> float:
    vals = [float(r.reality_dna.get(dim, 0.5)) for r in runs]
    return sum(vals) / len(vals) if vals else 0.5
