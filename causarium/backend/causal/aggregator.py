"""
Cross-run chain aggregation.

Runs the same extraction over every parallel run, then groups structurally
identical chains (same ordered agent_type:action signature) to compute how often
each hidden causal chain recurs. Chains that appear across many independent runs
are the robust, reproducible causal structures; chains unique to one run are
flagged as such.
"""

from collections import defaultdict
from typing import List

from ..models.causal import CausalChain


class Aggregator:
    def aggregate_chains(
        self, run_chains_list: List[List[CausalChain]], total_runs: int
    ) -> List[CausalChain]:
        total_runs = max(1, total_runs)
        groups: dict = defaultdict(list)

        for chains in run_chains_list:
            for chain in chains:
                sig = "->".join(f"{e.agent_type}:{e.action}" for e in chain.events)
                groups[sig].append(chain)

        aggregated: List[CausalChain] = []
        counter = 1
        for sig, matching in sorted(
            groups.items(), key=lambda kv: len(kv[1]), reverse=True
        ):
            run_ids = sorted({rid for c in matching for rid in c.run_ids})
            frequency = len(run_ids) / total_runs
            representative = max(matching, key=lambda c: c.causal_weight)
            mean_weight = sum(c.causal_weight for c in matching) / len(matching)

            aggregated.append(
                CausalChain(
                    chain_id=f"HCC-{counter:04d}",
                    simulation_id=representative.simulation_id,
                    run_ids=run_ids,
                    frequency=round(frequency, 4),
                    events=representative.events,
                    terminal_outcome=representative.terminal_outcome,
                    causal_weight=round(mean_weight, 4),
                    intervention_window=representative.intervention_window,
                    label=representative.label,
                    mechanism_class=representative.mechanism_class,
                )
            )
            counter += 1
        return aggregated
