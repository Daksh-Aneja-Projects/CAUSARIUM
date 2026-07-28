from models.event import Event
from typing import List

class Extractor:
    """
    Extracts relevant event sub-sequences for causal analysis.
    """
    def __init__(self):
        pass
        
    def extract_events(self, run_events: List[Event]) -> List[Event]:
        """
        Filters and preprocesses raw agent action sequences 
        into events eligible for causal graph construction.
        """
        # Exclude trivial or purely observational events if needed
        filtered_events = [e for e in run_events if e.causal_weight > 0.0]
        return filtered_events
