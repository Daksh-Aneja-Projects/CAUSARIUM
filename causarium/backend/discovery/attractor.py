"""
Attractor detection (PRD §12).

Clusters runs by their reality-DNA fingerprint (k-means, k chosen by inertia
elbow). Any cluster containing more than 15% of runs is a basin of convergence —
an Attractor — labeled by its dominant terminal outcome and summarized by its DNA
centroid and the tick by which membership becomes effectively determined.
"""

import hashlib
from typing import Dict, List, Optional

import numpy as np

from ..models.discovery import Attractor
from ..models.run_result import RunResult
from ..graph.dna_tagger import DNA_DIMENSIONS
from ._stats import best_k

CONVERGENCE_THRESHOLD = 0.15


class AttractorDetector:
    def detect_attractors(
        self,
        runs: List[RunResult],
        simulation_id: str = "sim-local",
        chains_by_run: Optional[Dict[str, List[str]]] = None,
    ) -> List[Attractor]:
        if len(runs) < 2:
            return []

        matrix = np.array([_dna_vector(r) for r in runs], dtype=float)
        seed = _seed(runs)
        k, labels, centroids = best_k(matrix, k_max=min(5, len(runs)), seed=seed)

        total = len(runs)
        attractors: List[Attractor] = []
        counter = 1
        for c in range(k):
            members = [runs[i] for i in range(total) if labels[i] == c]
            rate = len(members) / total
            if rate <= CONVERGENCE_THRESHOLD:
                continue

            label = _dominant_outcome(members)
            centroid = {dim: round(float(centroids[c][j]), 4) for j, dim in enumerate(DNA_DIMENSIONS)}
            attractors.append(
                Attractor(
                    attractor_id=f"ATT-{counter:03d}",
                    simulation_id=simulation_id,
                    label=f"Convergence toward {label}",
                    convergence_rate=round(rate, 4),
                    earliest_deterministic_tick=_earliest_deterministic_tick(members),
                    invariant_chains=_invariant_chains(members, chains_by_run or {}),
                    dna_centroid=centroid,
                    member_run_ids=[r.run_id for r in members],
                )
            )
            counter += 1
        return sorted(attractors, key=lambda a: a.convergence_rate, reverse=True)


# --------------------------------------------------------------------------- #
def _dna_vector(run: RunResult) -> List[float]:
    dna = run.reality_dna or {}
    return [float(dna.get(dim, 0.5)) for dim in DNA_DIMENSIONS]


def _dominant_outcome(members: List[RunResult]) -> str:
    counts: Dict[str, int] = {}
    for r in members:
        key = r.terminal_outcome or "UNKNOWN"
        counts[key] = counts.get(key, 0) + 1
    return max(counts, key=counts.get) if counts else "UNKNOWN"


def _earliest_deterministic_tick(members: List[RunResult]) -> int:
    """Tick by which half of a run's successful activity has occurred (proxy for
    when the trajectory becomes committed), averaged over cluster members."""
    ticks: List[int] = []
    for r in members:
        successes = sorted(
            e.get("tick", 0)
            for e in r.events
            if e.get("type") == "ACTION_EXECUTED" and e.get("status") == "SUCCESS"
        )
        if successes:
            ticks.append(successes[len(successes) // 2])
    return int(round(sum(ticks) / len(ticks))) if ticks else 0


def _invariant_chains(members: List[RunResult], chains_by_run: Dict[str, List[str]]) -> List[str]:
    sets = [set(chains_by_run.get(r.run_id, [])) for r in members if r.run_id in chains_by_run]
    if not sets:
        return []
    common = set.intersection(*sets) if len(sets) > 1 else sets[0]
    return sorted(common)


def _seed(runs: List[RunResult]) -> int:
    digest = hashlib.sha256("".join(r.run_id for r in runs).encode("utf-8")).hexdigest()
    return int(digest[:8], 16)
