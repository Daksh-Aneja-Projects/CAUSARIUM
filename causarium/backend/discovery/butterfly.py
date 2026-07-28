"""
Butterfly-event scanning (PRD §12).

A butterfly event is a small action with disproportionately large downstream
causal consequences. For every event we sum the causal weight of everything it
influences (the weighted reachable subgraph) and divide by the action's own
committed magnitude. A high amplification ratio means a tiny cause moved a large
share of the future.
"""

import networkx as nx
from typing import Any, Dict, List

from ..models.discovery import ButterflyEvent

DEFAULT_THRESHOLD = 3.0
MAX_RESULTS = 20


class ButterflyScanner:
    def scan_butterflies(
        self,
        graphs_by_run: Dict[str, nx.DiGraph],
        simulation_id: str = "sim-local",
        threshold: float = DEFAULT_THRESHOLD,
    ) -> List[ButterflyEvent]:
        results: List[ButterflyEvent] = []
        for run_id, graph in graphs_by_run.items():
            results.extend(self._scan_one(run_id, graph, simulation_id, threshold))
        results.sort(key=lambda b: b.amplification_ratio, reverse=True)
        return results[:MAX_RESULTS]

    # ------------------------------------------------------------------ #
    # Bound the O(V) reachability calls per run so dense graphs stay fast.
    MAX_CANDIDATES = 60

    def _scan_one(
        self, run_id: str, graph: nx.DiGraph, simulation_id: str, threshold: float
    ) -> List[ButterflyEvent]:
        out: List[ButterflyEvent] = []
        # Only the highest-magnitude actions can be butterflies; cap the count.
        candidates = sorted(
            (n for n in graph.nodes if float(graph.nodes[n].get("magnitude", 0.0)) > 0.05),
            key=lambda n: float(graph.nodes[n].get("magnitude", 0.0)),
            reverse=True,
        )[: self.MAX_CANDIDATES]
        for node in candidates:
            nd = graph.nodes[node]
            magnitude = float(nd.get("magnitude", 0.0))

            downstream_weight, descendants = self._downstream_weight(graph, node)
            if downstream_weight <= 0:
                continue
            amp = downstream_weight / magnitude
            if amp < threshold:
                continue

            out.append(
                ButterflyEvent(
                    butterfly_id=f"BFE-{run_id}-{str(node)[:8]}",
                    simulation_id=simulation_id,
                    event_label=f"{nd.get('agent_type')}:{nd.get('action_type')} @tick{nd.get('tick')}",
                    tick=nd.get("tick", 0),
                    action_magnitude=round(magnitude, 4),
                    downstream_causal_weight=round(downstream_weight, 4),
                    amplification_ratio=round(amp, 4),
                    downstream_events=[str(d) for d in list(descendants)[:12]],
                )
            )
        return out

    @staticmethod
    def _downstream_weight(graph: nx.DiGraph, node: Any):
        """Sum of edge weights over all edges reachable from ``node``."""
        descendants = nx.descendants(graph, node)
        if not descendants:
            return 0.0, descendants
        reachable = descendants | {node}
        total = 0.0
        for u, v, data in graph.edges(reachable, data=True):
            if v in reachable:
                total += data.get("weight", 0.0)
        return total, descendants
