from typing import List, Dict, Any
from uuid import UUID
from models.simulation import SimulationRun
from models.discovery import Attractor
import collections

class AttractorDetector:
    def __init__(self):
        pass

    def detect_attractors(self, runs: List[SimulationRun], simulation_id: UUID) -> List[Attractor]:
        """
        1. Cluster all terminal world states using k-means on DNA vectors
        2. Compute trajectory similarity: what fraction of all runs end in each cluster
        3. Label clusters with frequency > 15% as Attractors
        4. Trace back the earliest common causal events across runs in each Attractor
        """
        # Simplified Mock Implementation
        attractors = []
        if not runs:
            return attractors
            
        total_runs = len(runs)
        outcome_counts = collections.Counter(r.terminal_outcome for r in runs if r.terminal_outcome)
        
        attractor_id_counter = 1
        for outcome, count in outcome_counts.items():
            freq = count / total_runs
            if freq > 0.15:
                # Find centroid of DNA vectors
                dna_centroid = {k: 0.5 for k in runs[0].reality_dna.keys()} # Mock centroid
                
                attractors.append(Attractor(
                    attractor_id=f"ATT-{attractor_id_counter:03d}",
                    simulation_id=simulation_id,
                    label=f"Attractor towards {outcome}",
                    convergence_rate=freq,
                    earliest_deterministic_tick=10, # Mock tick
                    invariant_chains=["HCC-001"], # Mock chain
                    dna_centroid=dna_centroid
                ))
                attractor_id_counter += 1
                
        return attractors
