from typing import List, Dict, Any
from uuid import UUID
import networkx as nx

from models.simulation import Simulation, SimulationRun
from models.event import Event
from models.causal import CausalChain

from causal.extractor import Extractor
from causal.graph_constructor import GraphConstructor
from causal.chain_builder import ChainBuilder
from causal.aggregator import Aggregator

from discovery.attractor import AttractorDetector
from discovery.repeller import RepellerDetector
from discovery.choke_point import ChokePointDetector
from discovery.butterfly import ButterflyScanner
from discovery.singularity import SingularityFinder
from discovery.paradox import ParadoxEngine

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

    def process_simulation(self, simulation: Simulation, runs: List[SimulationRun], events_by_run: Dict[UUID, List[Event]]) -> Dict[str, Any]:
        """
        Processes completed simulation runs to extract causal chains and run discovery engines.
        """
        run_graphs = []
        run_chains_list = []
        all_events = []
        
        # 1. Causal Extraction Pipeline
        for run in runs:
            run_events = events_by_run.get(run.run_id, [])
            all_events.extend(run_events)
            
            filtered_events = self.extractor.extract_events(run_events)
            
            graph = self.graph_constructor.build_graph(filtered_events)
            run_graphs.append(graph)
            
            chains = self.chain_builder.extract_chains(graph, run.run_id)
            run_chains_list.append(chains)
            
        # Do-calculus filter
        structural_graph = self.graph_constructor.do_calculus_filter(run_graphs, min_independent_runs=3)
        
        # Aggregate chains
        aggregated_chains = self.aggregator.aggregate_chains(run_chains_list, len(runs))
        
        # 2. Discovery Engines
        results = {
            "simulation_id": simulation.simulation_id,
            "hidden_causal_chains": [c.model_dump() for c in aggregated_chains],
            "attractors": [],
            "repellers": [],
            "choke_points": [],
            "butterfly_events": [],
            "singularities": [],
            "causal_paradoxes": []
        }
        
        if simulation.discovery_config.enable_attractors:
            results["attractors"] = [a.model_dump() for a in self.attractor_detector.detect_attractors(runs, simulation.simulation_id)]
            
        results["repellers"] = self.repeller_detector.detect_repellers(target_outcome="TARGET", runs=runs)
        
        if simulation.discovery_config.enable_choke_points:
            results["choke_points"] = self.choke_point_detector.detect_choke_points(runs)
            
        if simulation.discovery_config.enable_butterfly_scan:
            results["butterfly_events"] = self.butterfly_scanner.scan_butterflies(all_events)
            
        if simulation.discovery_config.enable_singularity_finder:
            results["singularities"] = self.singularity_finder.find_singularities(runs)
            
        results["causal_paradoxes"] = self.paradox_engine.detect_paradoxes(structural_graph)
            
        return results
