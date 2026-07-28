"""
Timeline clustering.

Groups runs into "timelines" — families of runs that share a reality-DNA
neighborhood (i.e. that unfolded similarly). Backed by the same DNA space the
vector index uses, via k-means over the run fingerprints.
"""

from typing import Dict, List

import numpy as np

from ..models.run_result import RunResult
from ..discovery._stats import best_k
from .dna_tagger import DNA_DIMENSIONS


class TimelineManager:
    def cluster_into_timelines(self, runs: List[RunResult]) -> Dict[str, List[str]]:
        """Return timeline_id -> [run_id]."""
        if not runs:
            return {}
        if len(runs) == 1:
            return {"TML-001": [runs[0].run_id]}

        matrix = np.array(
            [[float(r.reality_dna.get(d, 0.5)) for d in DNA_DIMENSIONS] for r in runs],
            dtype=float,
        )
        _, labels, _ = best_k(matrix, k_max=min(5, len(runs)), seed=len(runs))

        timelines: Dict[str, List[str]] = {}
        for run, label in zip(runs, labels):
            tid = f"TML-{int(label) + 1:03d}"
            timelines.setdefault(tid, []).append(run.run_id)
        return timelines
