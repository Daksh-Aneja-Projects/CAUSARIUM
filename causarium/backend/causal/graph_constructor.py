import networkx as nx
from typing import List, Dict, Any, Set, Tuple
from collections import defaultdict
from models.event import Event
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

class GraphConstructor:
    """
    Constructs a causal graph from event logs.
    """
    def __init__(self):
        pass

    def build_graph(self, events: List[Event]) -> nx.DiGraph:
        """
        Builds a directed graph: Event A -> Event B if A preceded B
        and agent memory indicates A influenced decision to B.
        """
        graph = nx.DiGraph()
        
        # Sort events by tick
        sorted_events = sorted(events, key=lambda x: x.tick)
        
        for event in sorted_events:
            graph.add_node(event.event_id, event=event)
            for parent_id in event.causal_parents:
                if graph.has_node(parent_id):
                    # Assigns causal weight to each edge
                    graph.add_edge(parent_id, event.event_id, weight=event.causal_weight)
                    
        return graph

    def do_calculus_filter(self, graphs: List[nx.DiGraph], min_independent_runs: int = 3) -> nx.DiGraph:
        """
        Filters spurious correlations using a simplified do-calculus approach,
        requiring >3 independent runs.
        """
        if len(graphs) < min_independent_runs:
            logger.warning(f"Not enough independent runs for do-calculus filter. Found {len(graphs)}, need {min_independent_runs}.")
            return nx.DiGraph()
            
        edge_counts: Dict[Tuple[str, str], int] = defaultdict(int)
        edge_weights: Dict[Tuple[str, str], List[float]] = defaultdict(list)
        
        for g in graphs:
            run_edges: Set[Tuple[str, str]] = set()
            for u, v, data in g.edges(data=True):
                u_event = g.nodes[u]['event']
                v_event = g.nodes[v]['event']
                
                # Signature to identify similar structural edges across runs
                sig = (f"{u_event.agent_id}_{u_event.action_type}", f"{v_event.agent_id}_{v_event.action_type}")
                
                if sig not in run_edges:
                    run_edges.add(sig)
                    edge_counts[sig] += 1
                    edge_weights[sig].append(data.get('weight', 0.0))
                    
        # Construct the filtered structural graph
        structural_graph = nx.DiGraph()
        for sig, count in edge_counts.items():
            if count >= min_independent_runs:
                avg_weight = sum(edge_weights[sig]) / len(edge_weights[sig])
                structural_graph.add_edge(sig[0], sig[1], weight=avg_weight, frequency=count/len(graphs))
                
        return structural_graph
