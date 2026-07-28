"""
Repeller detection (PRD §12).

A repeller is a target outcome the system structurally resists. If fewer than
~5% of runs reach the target, we compare the (few) achieving runs against the
rest to surface which reality-DNA dimensions would have to move — the structural
blockers standing between the system and the desired future.
"""

from typing import List, Optional

from ..models.discovery import Repeller
from ..models.run_result import RunResult
from ..graph.dna_tagger import DNA_DIMENSIONS

DEFAULT_MAX_RATE = 0.05


class RepellerDetector:
    def detect_repellers(
        self,
        target_outcome: str,
        runs: List[RunResult],
        simulation_id: str = "sim-local",
        max_rate: float = DEFAULT_MAX_RATE,
    ) -> Optional[Repeller]:
        if not runs:
            return None

        achieving = [r for r in runs if r.terminal_outcome == target_outcome]
        rate = len(achieving) / len(runs)
        if rate > max_rate:
            return None  # not a repeller — the system reaches it often enough

        blockers, nearest = self._diagnose(achieving, runs, target_outcome)
        return Repeller(
            repeller_id="REP-001",
            simulation_id=simulation_id,
            target_outcome=target_outcome,
            achievement_rate=round(rate, 4),
            structural_blockers=blockers,
            nearest_achieving_condition=nearest,
        )

    # ------------------------------------------------------------------ #
    def _diagnose(self, achieving: List[RunResult], runs: List[RunResult], target: str):
        others = [r for r in runs if r.terminal_outcome != target]
        if not others:
            return ["Target is universal — no contrast available."], None
        if not achieving:
            return (
                [f"No run reached {target}; the outcome may be unreachable under current physics."],
                None,
            )

        gaps = []
        for dim in DNA_DIMENSIONS:
            a_mean = _mean(r.reality_dna.get(dim, 0.5) for r in achieving)
            o_mean = _mean(r.reality_dna.get(dim, 0.5) for r in others)
            gaps.append((dim, a_mean - o_mean))

        gaps.sort(key=lambda g: abs(g[1]), reverse=True)
        blockers = [
            f"{'raise' if delta > 0 else 'lower'} {dim} (Δ={delta:+.2f})"
            for dim, delta in gaps[:3]
            if abs(delta) > 0.05
        ] or ["No single DNA dimension separates achieving runs; blocker is structural/combinatorial."]

        nearest = ", ".join(
            f"{dim}≈{_mean(r.reality_dna.get(dim, 0.5) for r in achieving):.2f}"
            for dim, _ in gaps[:3]
        )
        return blockers, nearest


def _mean(values) -> float:
    vals = [float(v) for v in values]
    return sum(vals) / len(vals) if vals else 0.5
