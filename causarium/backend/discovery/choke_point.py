"""
Choke-point detection (PRD §12).

A temporal choke point is a tick where intervention has maximal leverage over the
final outcome. Without re-running every counterfactual, we approximate leverage
as the share of total downstream causal weight that still flows *from* events at
tick T: acting there can still steer a large fraction of what follows. Ticks that
are local peaks of this leverage curve (above a threshold) are choke points.
"""

import networkx as nx
from collections import defaultdict
from typing import Dict, List

from ..models.discovery import ChokePoint


class ChokePointDetector:
    def __init__(self, min_efficacy: float = 0.4):
        self.min_efficacy = min_efficacy

    def detect_choke_points(
        self, graphs_by_run: Dict[str, nx.DiGraph], simulation_id: str = "sim-local"
    ) -> List[ChokePoint]:
        leverage_by_tick: Dict[int, float] = defaultdict(float)
        interventions_by_tick: Dict[int, set] = defaultdict(set)

        for graph in graphs_by_run.values():
            self._accumulate(graph, leverage_by_tick, interventions_by_tick)

        if not leverage_by_tick:
            return []

        peak = max(leverage_by_tick.values()) or 1.0
        efficacy = {t: w / peak for t, w in leverage_by_tick.items()}

        ticks = sorted(efficacy)
        choke_points: List[ChokePoint] = []
        counter = 1
        for i, t in enumerate(ticks):
            e = efficacy[t]
            if e < self.min_efficacy:
                continue
            if not self._is_local_peak(ticks, efficacy, i):
                continue
            choke_points.append(
                ChokePoint(
                    choke_point_id=f"TCP-{counter:03d}",
                    simulation_id=simulation_id,
                    tick=t,
                    intervention_efficacy=round(e, 4),
                    effective_interventions=sorted(interventions_by_tick[t])[:5],
                    decay_after_tick=self._decay_tick(ticks, efficacy, i, e),
                )
            )
            counter += 1
        return sorted(choke_points, key=lambda c: c.intervention_efficacy, reverse=True)

    # ------------------------------------------------------------------ #
    @staticmethod
    def _accumulate(graph: nx.DiGraph, leverage: Dict[int, float], interventions: Dict[int, set]) -> None:
        for node in graph.nodes:
            nd = graph.nodes[node]
            tick = nd.get("tick", 0)
            downstream = sum(
                data.get("weight", 0.0)
                for _, v, data in graph.out_edges(node, data=True)
            )
            # Add the node's own reachable weight (one hop is already counted;
            # descendants capture the cascade).
            for d in nx.descendants(graph, node):
                downstream += sum(
                    data.get("weight", 0.0) for _, _, data in graph.out_edges(d, data=True)
                )
            leverage[tick] += downstream
            if downstream > 0:
                interventions[tick].add(f"{nd.get('agent_type')}:{nd.get('action_type')}")

    @staticmethod
    def _is_local_peak(ticks: List[int], efficacy: Dict[int, float], i: int) -> bool:
        e = efficacy[ticks[i]]
        left = efficacy[ticks[i - 1]] if i > 0 else -1.0
        right = efficacy[ticks[i + 1]] if i < len(ticks) - 1 else -1.0
        return e >= left and e >= right

    @staticmethod
    def _decay_tick(ticks: List[int], efficacy: Dict[int, float], i: int, peak: float):
        for j in range(i + 1, len(ticks)):
            if efficacy[ticks[j]] < 0.5 * peak:
                return ticks[j]
        return None
