import networkx as nx
from typing import List, Dict, Any

class ParadoxEngine:
    def __init__(self):
        pass

    def detect_paradoxes(self, causal_graph: nx.DiGraph) -> List[Dict[str, Any]]:
        """
        1. Detect cycles in the causal graph with minimum cycle length 3
        2. Compute cycle strength (average causal weight of edges in cycle)
        3. Label high-strength cycles as Causal Paradoxes
        """
        paradoxes = []
        try:
            cycles = list(nx.simple_cycles(causal_graph))
            for i, cycle in enumerate(cycles):
                if len(cycle) >= 3:
                    strength = 0.0
                    for j in range(len(cycle)):
                        u = cycle[j]
                        v = cycle[(j + 1) % len(cycle)]
                        edge_data = causal_graph.get_edge_data(u, v)
                        strength += edge_data.get('weight', 0.0)
                        
                    strength /= len(cycle)
                    
                    if strength > 0.5: # threshold
                        paradoxes.append({
                            "paradox_id": f"CP-{i:03d}",
                            "cycle": [str(node) for node in cycle],
                            "cycle_strength": strength,
                            "description": "System is trapped in a self-reinforcing negative spiral."
                        })
        except nx.NetworkXNoCycle:
            pass
            
        return paradoxes
