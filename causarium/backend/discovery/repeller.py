from typing import List, Dict, Any

class RepellerDetector:
    def __init__(self):
        pass

    def detect_repellers(self, target_outcome: str, runs: List[Any]) -> Dict[str, Any]:
        """
        1. Define target outcome from user input
        2. Compute fraction of runs achieving target
        3. If < 5%, run counterfactual sweep: vary starting conditions, find nearest achieving runs
        4. Extract which agent attributes or world parameters would need to change
        """
        total = len(runs)
        if total == 0:
            return {}
            
        achieving_runs = [r for r in runs if r.terminal_outcome == target_outcome]
        rate = len(achieving_runs) / total
        
        if rate < 0.05:
            return {
                "repeller_id": "REP-001",
                "target_outcome": target_outcome,
                "achievement_rate": rate,
                "structural_blockers": [
                    "Identified blocker based on counterfactual."
                ],
                "nearest_achieving_condition": "Mock conditions"
            }
        return {}
