"""
Causal graph construction.

Turns one run's resolved event log into a directed causal graph, then filters
across many runs to keep only edges that reproduce independently (a practical
stand-in for do-calculus: a structural dependency that survives repeated
independent randomization of the world is far more likely causal than a
coincidence of a single run).

Two kinds of causal edge are inferred within a run:
  * explicit    — a cascade/child event that names its trigger in causal_parents
  * responsive  — agent Y acts shortly after agent X acted upon Y (X -> Y)
  * contested   — two agents contend for the same target in the same window
  * exogenous   — a black swan influences everyone acting soon after it
Each edge is weighted by the source's effect magnitude and a temporal-decay
factor, and weak edges are pruned to avoid a temporal hairball.
"""

import networkx as nx
from collections import defaultdict
from typing import Any, Dict, List, Tuple

EDGE_WEIGHT_FLOOR = 0.05


class GraphConstructor:
    def __init__(self, influence_window: int = 3, min_edge_weight: float = EDGE_WEIGHT_FLOOR):
        self.influence_window = influence_window
        self.min_edge_weight = min_edge_weight

    # ------------------------------------------------------------------ #
    def build_graph(self, events: List[Dict[str, Any]]) -> nx.DiGraph:
        graph = nx.DiGraph()
        ordered = sorted(events, key=lambda e: (e.get("tick", 0), e.get("event_id", "")))

        by_id: Dict[str, Dict[str, Any]] = {}
        for e in ordered:
            eid = e.get("event_id")
            if eid is None:
                continue
            by_id[eid] = e
            graph.add_node(
                eid,
                agent_id=e.get("agent_id"),
                agent_type=e.get("agent_type", "UNKNOWN"),
                action_type=e.get("action_type", "UNKNOWN"),
                tick=e.get("tick", 0),
                magnitude=float(e.get("magnitude", 0.0)),
                effect=float(e.get("effect_magnitude", 0.0)),
                status=e.get("status"),
                target=e.get("target"),
                event_type=e.get("type"),
            )

        for e in ordered:
            self._add_explicit_edges(graph, e, by_id)

        self._add_inferred_edges(graph, ordered)
        return graph

    # ------------------------------------------------------------------ #
    def _add_explicit_edges(
        self, graph: nx.DiGraph, event: Dict[str, Any], by_id: Dict[str, Dict[str, Any]]
    ) -> None:
        child = event.get("event_id")
        for parent_id in event.get("causal_parents", []) or []:
            if parent_id in by_id and graph.has_node(parent_id):
                weight = float(by_id[parent_id].get("effect_magnitude", 0.0)) or 0.5
                graph.add_edge(parent_id, child, weight=round(weight, 4), kind="explicit")

    def _add_inferred_edges(self, graph: nx.DiGraph, ordered: List[Dict[str, Any]]) -> None:
        # Index successful/impactful source events by tick for windowed lookups.
        for i, src in enumerate(ordered):
            if src.get("status") not in ("SUCCESS",) and src.get("type") != "BLACK_SWAN":
                continue
            src_id = src.get("event_id")
            src_tick = src.get("tick", 0)
            src_effect = float(src.get("effect_magnitude", 0.0)) or 0.3
            src_agent = src.get("agent_id")
            src_target = src.get("target")
            is_swan = src.get("type") == "BLACK_SWAN"

            for dst in ordered[i + 1:]:
                gap = dst.get("tick", 0) - src_tick
                if gap <= 0:
                    continue
                if gap > self.influence_window:
                    break  # ordered by tick -> no further candidates in window
                if dst.get("action_type") == "WAIT":
                    continue

                relation, factor = self._relation(
                    src_agent, src_target, is_swan, dst
                )
                if relation is None:
                    continue

                decay = 1.0 / (1.0 + gap)
                weight = round(src_effect * factor * decay, 4)
                if weight < self.min_edge_weight:
                    continue
                dst_id = dst.get("event_id")
                # Keep the strongest edge if multiple relations connect the pair.
                if graph.has_edge(src_id, dst_id):
                    if graph[src_id][dst_id]["weight"] >= weight:
                        continue
                graph.add_edge(src_id, dst_id, weight=weight, kind=relation)

    @staticmethod
    def _relation(
        src_agent: Any, src_target: Any, is_swan: bool, dst: Dict[str, Any]
    ) -> Tuple[Any, float]:
        """Classify how a source event could influence a destination event."""
        if is_swan:
            return "exogenous", 0.8
        dst_agent = dst.get("agent_id")
        dst_target = dst.get("target")
        # X acted on Y, then Y responds.
        if src_target is not None and str(src_target) == str(dst_agent):
            return "responsive", 0.9
        # Both contend for the same target.
        if src_target is not None and dst_target is not None and str(src_target) == str(dst_target) \
                and str(src_agent) != str(dst_agent):
            return "contested", 0.6
        return None, 0.0

    # ------------------------------------------------------------------ #
    def do_calculus_filter(
        self, graphs: List[nx.DiGraph], min_independent_runs: int = 3
    ) -> nx.DiGraph:
        """
        Keep only structural edges (agent_type:action_type -> agent_type:action_type)
        that recur in at least ``min_independent_runs`` runs. Edge weight is the
        mean across runs; ``frequency`` is the fraction of runs exhibiting it.
        """
        structural = nx.DiGraph()
        if len(graphs) < min_independent_runs:
            return structural

        edge_runs: Dict[Tuple[str, str], int] = defaultdict(int)
        edge_weights: Dict[Tuple[str, str], List[float]] = defaultdict(list)

        for g in graphs:
            seen: set = set()
            per_run_weight: Dict[Tuple[str, str], List[float]] = defaultdict(list)
            for u, v, data in g.edges(data=True):
                su = _sig(g.nodes[u])
                sv = _sig(g.nodes[v])
                if su == sv:
                    continue  # ignore trivial self-signature loops within a run
                per_run_weight[(su, sv)].append(data.get("weight", 0.0))
                seen.add((su, sv))
            for sig in seen:
                edge_runs[sig] += 1
                ws = per_run_weight[sig]
                edge_weights[sig].append(sum(ws) / len(ws))

        n = len(graphs)
        for sig, count in edge_runs.items():
            if count >= min_independent_runs:
                avg = sum(edge_weights[sig]) / len(edge_weights[sig])
                structural.add_edge(
                    sig[0], sig[1], weight=round(avg, 4), frequency=round(count / n, 4)
                )
        return structural


def _sig(node: Dict[str, Any]) -> str:
    return f"{node.get('agent_type', 'UNKNOWN')}:{node.get('action_type', 'UNKNOWN')}"
