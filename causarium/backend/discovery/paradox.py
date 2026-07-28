"""
Causal-paradox detection (PRD §12).

A causal paradox is a self-reinforcing loop in the *aggregate* causal structure:
A drives B drives C drives A. These are found on the do-calculus structural graph
(where nodes are agent_type:action signatures), since a loop that reproduces
across runs is a genuine feedback dynamic rather than a single-run artifact.
Loops are ranked by mean edge strength.
"""

import networkx as nx
from typing import List

from ..models.discovery import CausalParadox

MIN_CYCLE_LENGTH = 3
MAX_CYCLE_LENGTH = 6          # bound cycle enumeration (dense graphs are exponential)
DEFAULT_STRENGTH_THRESHOLD = 0.15
MAX_PARADOXES = 20


class ParadoxEngine:
    def detect_paradoxes(
        self,
        structural_graph: nx.DiGraph,
        simulation_id: str = "sim-local",
        strength_threshold: float = DEFAULT_STRENGTH_THRESHOLD,
    ) -> List[CausalParadox]:
        if structural_graph is None or structural_graph.number_of_nodes() == 0:
            return []

        paradoxes: List[CausalParadox] = []
        counter = 1
        seen: set = set()
        # length_bound keeps enumeration polynomial on dense structural graphs
        # (unbounded simple_cycles is exponential and can hang for minutes).
        try:
            cycle_iter = nx.simple_cycles(structural_graph, length_bound=MAX_CYCLE_LENGTH)
        except TypeError:  # older networkx without length_bound
            cycle_iter = nx.simple_cycles(structural_graph)
        for cycle in cycle_iter:
            if len(cycle) < MIN_CYCLE_LENGTH or len(cycle) > MAX_CYCLE_LENGTH:
                continue
            key = frozenset(cycle)
            if key in seen:
                continue
            seen.add(key)

            strength = self._cycle_strength(structural_graph, cycle)
            if strength < strength_threshold:
                continue
            paradoxes.append(
                CausalParadox(
                    paradox_id=f"CP-{counter:03d}",
                    simulation_id=simulation_id,
                    cycle=[str(n) for n in cycle],
                    cycle_strength=round(strength, 4),
                    description=self._describe(cycle),
                )
            )
            counter += 1
            if len(paradoxes) >= MAX_PARADOXES:
                break
        return sorted(paradoxes, key=lambda p: p.cycle_strength, reverse=True)

    # ------------------------------------------------------------------ #
    @staticmethod
    def _cycle_strength(graph: nx.DiGraph, cycle: List[str]) -> float:
        total = 0.0
        for i in range(len(cycle)):
            u, v = cycle[i], cycle[(i + 1) % len(cycle)]
            data = graph.get_edge_data(u, v) or {}
            total += data.get("weight", 0.0)
        return total / len(cycle)

    @staticmethod
    def _describe(cycle: List[str]) -> str:
        loop = " -> ".join(str(n) for n in cycle) + f" -> {cycle[0]}"
        return f"Self-reinforcing feedback loop: {loop}"
