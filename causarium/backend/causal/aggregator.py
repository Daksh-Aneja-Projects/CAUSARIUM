from typing import List, Dict, Any
from models.causal import CausalChain
from collections import defaultdict
from uuid import UUID

class Aggregator:
    def __init__(self):
        pass

    def aggregate_chains(self, run_chains_list: List[List[CausalChain]], total_runs: int) -> List[CausalChain]:
        """
        Runs same pipeline across all N parallel runs
        Identifies which chains appear in > X% of runs
        Identifies which chains are unique to certain runs
        """
        chain_freq: Dict[str, List[CausalChain]] = defaultdict(list)
        
        for chains in run_chains_list:
            for chain in chains:
                # Use a signature to identify similar chains across runs
                # A simple signature could be the sequence of action types
                sig = "->".join([f"{e.agent_type}:{e.action}" for e in chain.events])
                chain_freq[sig].append(chain)
                
        aggregated = []
        for sig, matching_chains in chain_freq.items():
            frequency = len(matching_chains) / float(total_runs)
            
            # Merge runs
            run_ids = []
            for c in matching_chains:
                run_ids.extend(c.run_ids)
                
            # Use the first chain as representative, but update frequency and run_ids
            representative = matching_chains[0]
            
            agg_chain = CausalChain(
                chain_id=representative.chain_id,
                simulation_id=representative.simulation_id,
                run_ids=list(set(run_ids)),
                frequency=frequency,
                events=representative.events,
                terminal_outcome=representative.terminal_outcome,
                causal_weight=representative.causal_weight,
                intervention_window=representative.intervention_window
            )
            aggregated.append(agg_chain)
            
        return aggregated
