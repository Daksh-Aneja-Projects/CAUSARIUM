"""
Causal chain extraction.

Finds the longest, highest-weight causal paths through a single run's causal
graph — the "hidden causal chains" that are CAUSARIUM's headline output. Uses a
DAG longest-path pass (with a defensive cycle break) and then ranks candidate
root->leaf paths by cumulative causal weight and length.
"""

import networkx as nx
from typing import Any, Dict, List

from ..models.causal import CausalChain, ChainEvent, TickRange

MIN_CHAIN_LENGTH = 3   # at least 3 events to count as a chain
MAX_CHAINS = 10        # keep the top-N per run


class ChainBuilder:
    def extract_chains(
        self,
        graph: nx.DiGraph,
        run_id: str,
        simulation_id: str = "sim-local",
        terminal_outcome: str = "UNKNOWN_OUTCOME",
    ) -> List[CausalChain]:
        if graph.number_of_nodes() == 0:
            return []

        dag = graph
        if not nx.is_directed_acyclic_graph(dag):
            dag = graph.copy()
            self._break_cycles(dag)

        candidates = self._candidate_paths(dag)
        candidates.sort(key=lambda p: (self._path_weight(dag, p), len(p)), reverse=True)

        chains: List[CausalChain] = []
        counter = 1
        seen_signatures: set = set()
        for path in candidates:
            if len(path) < MIN_CHAIN_LENGTH:
                continue
            signature = tuple(
                (dag.nodes[n].get("agent_type"), dag.nodes[n].get("action_type"))
                for n in path
            )
            if signature in seen_signatures:
                continue
            seen_signatures.add(signature)

            chains.append(self._build_chain(dag, path, counter, run_id, simulation_id, terminal_outcome))
            counter += 1
            if len(chains) >= MAX_CHAINS:
                break
        return chains

    # ------------------------------------------------------------------ #
    def _candidate_paths(self, dag: nx.DiGraph) -> List[List[str]]:
        """
        Highest-weight path ending at each node, via DP over a topological order.

        This is O(V + E) and yields one strong candidate chain per terminal node,
        which we then rank/dedup. It deliberately avoids all_simple_paths, whose
        enumeration is combinatorially explosive on dense causal graphs.
        """
        try:
            topo = list(nx.topological_sort(dag))
        except nx.NetworkXUnfeasible:
            return []

        best_weight: dict = {n: 0.0 for n in dag}
        best_prev: dict = {n: None for n in dag}
        for node in topo:
            for succ in dag.successors(node):
                w = best_weight[node] + dag[node][succ].get("weight", 0.0)
                if w > best_weight[succ]:
                    best_weight[succ] = w
                    best_prev[succ] = node

        paths: List[List[str]] = []
        for node in dag:
            # Reconstruct the best path terminating at this node.
            path: List[str] = []
            cur = node
            guard = 0
            while cur is not None and guard <= len(dag):
                path.append(cur)
                cur = best_prev[cur]
                guard += 1
            path.reverse()
            if len(path) >= MIN_CHAIN_LENGTH:
                paths.append(path)
        return paths

    def _build_chain(
        self,
        dag: nx.DiGraph,
        path: List[str],
        counter: int,
        run_id: str,
        simulation_id: str,
        terminal_outcome: str,
    ) -> CausalChain:
        events: List[ChainEvent] = []
        ticks: List[int] = []
        for node in path:
            nd = dag.nodes[node]
            ticks.append(nd.get("tick", 0))
            events.append(
                ChainEvent(
                    tick=nd.get("tick", 0),
                    agent_id=str(nd.get("agent_id")) if nd.get("agent_id") else None,
                    agent_type=nd.get("agent_type", "UNKNOWN"),
                    action=nd.get("action_type", "UNKNOWN"),
                    magnitude=float(nd.get("magnitude", 0.0)),
                )
            )
        return CausalChain(
            chain_id=f"HCC-{counter:04d}",
            simulation_id=simulation_id,
            run_ids=[run_id],
            frequency=1.0,
            events=events,
            terminal_outcome=terminal_outcome,
            causal_weight=round(self._path_weight(dag, path), 4),
            intervention_window=TickRange(start_tick=min(ticks), end_tick=max(ticks)),
        )

    # ------------------------------------------------------------------ #
    @staticmethod
    def _path_weight(dag: nx.DiGraph, path: List[str]) -> float:
        return sum(
            dag.get_edge_data(path[i], path[i + 1], {}).get("weight", 0.0)
            for i in range(len(path) - 1)
        )

    @staticmethod
    def _break_cycles(graph: nx.DiGraph) -> None:
        while True:
            try:
                cycle = nx.find_cycle(graph, orientation="original")
            except nx.NetworkXNoCycle:
                return
            # Remove the weakest edge in the cycle to restore acyclicity.
            weakest = min(
                cycle, key=lambda e: graph.get_edge_data(e[0], e[1], {}).get("weight", 0.0)
            )
            graph.remove_edge(weakest[0], weakest[1])
