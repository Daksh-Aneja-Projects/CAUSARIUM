"""
Discovery pipeline orchestration.

Takes the RunResults from a completed simulation and runs the full causal +
discovery stack:

    events  ->  per-run causal graphs  ->  hidden chains (aggregated across runs)
            ->  do-calculus structural graph
            ->  attractors / repellers / choke points / butterflies
                / singularities / paradoxes

Returns a single JSON-serializable results dict for the API and report layers.
"""

from typing import Any, Dict, List, Optional

from ..models.run_result import RunResult
from ..causal.extractor import Extractor
from ..causal.graph_constructor import GraphConstructor
from ..causal.chain_builder import ChainBuilder
from ..causal.aggregator import Aggregator
from ..discovery.attractor import AttractorDetector
from ..discovery.repeller import RepellerDetector
from ..discovery.choke_point import ChokePointDetector
from ..discovery.butterfly import ButterflyScanner
from ..discovery.singularity import SingularityFinder
from ..discovery.paradox import ParadoxEngine


class DiscoveryWorker:
    def __init__(self):
        self.extractor = Extractor()
        self.graph_constructor = GraphConstructor()
        self.chain_builder = ChainBuilder()
        self.aggregator = Aggregator()
        self.attractor_detector = AttractorDetector()
        self.repeller_detector = RepellerDetector()
        self.choke_point_detector = ChokePointDetector()
        self.butterfly_scanner = ButterflyScanner()
        self.singularity_finder = SingularityFinder()
        self.paradox_engine = ParadoxEngine()

    def process_simulation(
        self,
        runs: List[RunResult],
        simulation_id: str = "sim-local",
        target_outcome: Optional[str] = None,
        min_independent_runs: int = 3,
    ) -> Dict[str, Any]:
        graphs_by_run = {}
        run_chains_list: List[list] = []
        chains_by_run: Dict[str, List[str]] = {}

        # 1. Per-run causal extraction.
        for run in runs:
            filtered = self.extractor.extract_events(run.events)
            graph = self.graph_constructor.build_graph(filtered)
            graphs_by_run[run.run_id] = graph

            chains = self.chain_builder.extract_chains(
                graph, run.run_id, simulation_id, run.terminal_outcome or "UNKNOWN"
            )
            run_chains_list.append(chains)
            chains_by_run[run.run_id] = [
                "->".join(f"{e.agent_type}:{e.action}" for e in c.events) for c in chains
            ]

        # 2. Do-calculus structural graph + aggregated hidden chains.
        structural_graph = self.graph_constructor.do_calculus_filter(
            list(graphs_by_run.values()), min_independent_runs=min_independent_runs
        )
        aggregated_chains = self.aggregator.aggregate_chains(run_chains_list, len(runs))

        # 3. Discovery engines.
        attractors = self.attractor_detector.detect_attractors(
            runs, simulation_id, chains_by_run
        )
        target = target_outcome or self._least_common_outcome(runs)
        repeller = (
            self.repeller_detector.detect_repellers(target, runs, simulation_id)
            if target
            else None
        )
        choke_points = self.choke_point_detector.detect_choke_points(graphs_by_run, simulation_id)
        butterflies = self.butterfly_scanner.scan_butterflies(graphs_by_run, simulation_id)
        singularities = self.singularity_finder.find_singularities(runs, simulation_id)
        paradoxes = self.paradox_engine.detect_paradoxes(structural_graph, simulation_id)

        return {
            "simulation_id": simulation_id,
            "run_count": len(runs),
            "hidden_causal_chains": [c.model_dump() for c in aggregated_chains],
            "structural_edges": [
                {"source": u, "target": v, **d}
                for u, v, d in structural_graph.edges(data=True)
            ],
            "attractors": [a.model_dump() for a in attractors],
            "repellers": [repeller.model_dump()] if repeller else [],
            "choke_points": [c.model_dump() for c in choke_points],
            "butterfly_events": [b.model_dump() for b in butterflies],
            "singularities": [s.model_dump() for s in singularities],
            "causal_paradoxes": [p.model_dump() for p in paradoxes],
        }

    @staticmethod
    def _least_common_outcome(runs: List[RunResult]) -> Optional[str]:
        from collections import Counter

        counts = Counter(r.terminal_outcome for r in runs if r.terminal_outcome)
        if not counts:
            return None
        return min(counts, key=counts.get)
