from enum import Enum

class EventType(str, Enum):
    SIMULATION_STARTED = "simulation_started"
    TICK_COMPLETED = "tick_completed"
    AGENT_ACTION = "agent_action"
    CAUSAL_CHAIN_CREATED = "causal_chain_created"
    DISCOVERY_RESULT = "discovery_result"
    INTERVENTION_APPLIED = "intervention_applied"
    REPORT_GENERATED = "report_generated"

MAX_METADATA_LENGTH = 4096
DEFAULT_AGENT_TEMPERATURE = 0.8
DEFAULT_CAUSAL_TEMPERATURE = 0.0
DEFAULT_AGENT_DECISION_TOKEN_BUDGET = 500
DEFAULT_AGENT_REFLECTION_TOKEN_BUDGET = 1000
