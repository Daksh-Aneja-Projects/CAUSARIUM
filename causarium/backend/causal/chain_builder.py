import networkx as nx
from typing import List, Dict, Any
from models.causal import CausalChain, ChainEvent
from uuid import UUID

class ChainBuilder:
    def __init__(self):
        pass

    def extract_chains(self, graph: nx.DiGraph, run_id: UUID) -> List[CausalChain]:
        """
        Identifies longest significant causal chains in a single run graph.
        Labels each chain with start event, end event, chain length, and cumulative causal weight
        Names chain: 'Hidden Causal Chain #[N]'
        """
        chains = []
        if len(graph) == 0:
            return chains
            
        if not nx.is_directed_acyclic_graph(graph):
            try:
                cycle_edges = list(nx.find_cycle(graph, orientation='original'))
                graph.remove_edges_from([(u, v) for u, v, _ in cycle_edges])
            except nx.NetworkXNoCycle:
                pass
                
        roots = [n for n, d in graph.in_degree() if d == 0]
        leaves = [n for n, d in graph.out_degree() if d == 0]
        
        all_paths = []
        for root in roots:
            for leaf in leaves:
                if nx.has_path(graph, root, leaf):
                    for path in nx.all_simple_paths(graph, root, leaf):
                        if len(path) > 3: # significant length
                            all_paths.append(path)
                            
        # Sort paths by length (longest first)
        all_paths.sort(key=len, reverse=True)
        
        chain_counter = 1
        for path in all_paths[:10]: # Top 10 longest chains
            weight = 0.0
            events = []
            start_tick = None
            end_tick = None
            
            for i in range(len(path)):
                node = path[i]
                node_event = graph.nodes[node]['event']
                
                events.append(ChainEvent(
                    tick=node_event.tick,
                    agent_type="UNKNOWN", # Agent type should be resolved from agent state
                    action=node_event.action_type,
                    magnitude=node_event.action_payload.get('magnitude', 1.0)
                ))
                
                if start_tick is None or node_event.tick < start_tick:
                    start_tick = node_event.tick
                if end_tick is None or node_event.tick > end_tick:
                    end_tick = node_event.tick
                    
                if i < len(path) - 1:
                    edge_data = graph.get_edge_data(path[i], path[i+1])
                    weight += edge_data.get('weight', 0.0)
            
            chains.append(CausalChain(
                chain_id=f"HCC-{chain_counter:04d}",
                simulation_id=node_event.run_id, # Assume run_id relates to sim
                run_ids=[run_id],
                frequency=1.0, 
                events=events,
                terminal_outcome="UNKNOWN_OUTCOME", 
                causal_weight=weight,
                intervention_window={"start_tick": start_tick or 0, "end_tick": end_tick or 0}
            ))
            chain_counter += 1
            
        return chains
