from typing import List, Dict, Any

class ButterflyScanner:
    def __init__(self):
        pass

    def scan_butterflies(self, events: List[Any]) -> List[Dict[str, Any]]:
        """
        1. For every agent action in every run, compute the causal graph weight of all downstream events attributed to it
        2. Rank actions by (downstream weight / action magnitude) — the amplification ratio
        3. Actions with amplification ratio > threshold are labeled Butterfly Events
        """
        butterflies = []
        threshold = 10.0
        
        for e in events:
            mag = e.action_payload.get('magnitude', 1.0)
            if mag == 0:
                continue
                
            downstream_weight = sum([w for w in getattr(e, 'downstream_weights', [])]) # Mock property
            amp_ratio = downstream_weight / mag
            
            if amp_ratio > threshold:
                butterflies.append({
                    "butterfly_id": f"BFE-{e.event_id}",
                    "event": f"{e.action_type} (Tick {e.tick})",
                    "action_magnitude": mag,
                    "downstream_causal_weight": downstream_weight,
                    "amplification_ratio": amp_ratio,
                    "downstream_events": []
                })
                
        return sorted(butterflies, key=lambda x: x['amplification_ratio'], reverse=True)
