from enum import Enum

class EventType(str, Enum):
    SIMULATION_STARTED = "simulation_started"
    TICK_COMPLETED = "tick_completed"
    AGENT_ACTION = "agent_action"
    CAUSAL_CHAIN_CREATED = "causal_chain_created"
    DISCOVERY_RESULT = "discovery_result"
    INTERVENTION_APPLIED = "intervention_applied"
    REPORT_GENERATED = "report_generated"


class ActionType(str, Enum):
    """
    Canonical action taxonomy shared by the LLM decision prompt (which the agent
    is instructed to choose from) and the ActionResolver (which applies each
    action's physics). Keeping this in one place guarantees the model's output
    vocabulary matches what the simulation substrate knows how to resolve.
    """
    # Cooperation / conflict
    COOPERATE = "COOPERATE"
    COMPETE = "COMPETE"
    DEFECT = "DEFECT"
    NEGOTIATE = "NEGOTIATE"
    FORM_ALLIANCE = "FORM_ALLIANCE"
    BETRAY = "BETRAY"
    # Resource / capital
    INVEST = "INVEST"
    DIVEST = "DIVEST"
    ACQUIRE = "ACQUIRE"
    HOARD = "HOARD"
    # Information
    COMMUNICATE = "COMMUNICATE"
    BROADCAST = "BROADCAST"
    DECEIVE = "DECEIVE"
    DISCLOSE = "DISCLOSE"
    GATHER_INTEL = "GATHER_INTEL"
    # Capability
    INNOVATE = "INNOVATE"
    IMITATE = "IMITATE"
    SABOTAGE = "SABOTAGE"
    # Systemic / posture
    ESCALATE = "ESCALATE"
    DE_ESCALATE = "DE_ESCALATE"
    REGULATE = "REGULATE"
    LOBBY = "LOBBY"
    # No-op
    WAIT = "WAIT"


# Actions considered antagonistic / high-conflict — used by the resolver for
# contention and by discovery engines for behavioral tagging.
AGGRESSIVE_ACTIONS = frozenset({
    ActionType.COMPETE, ActionType.DEFECT, ActionType.BETRAY,
    ActionType.SABOTAGE, ActionType.DECEIVE, ActionType.ESCALATE,
    ActionType.HOARD,
})

# Actions that consume/contest a shared, finite resource — subject to
# mutual-exclusion resolution within a tick.
CONTENTIOUS_ACTIONS = frozenset({
    ActionType.ACQUIRE, ActionType.INVEST, ActionType.HOARD,
    ActionType.SABOTAGE, ActionType.REGULATE,
})

MAX_METADATA_LENGTH = 4096
DEFAULT_AGENT_TEMPERATURE = 0.8
DEFAULT_CAUSAL_TEMPERATURE = 0.0
DEFAULT_AGENT_DECISION_TOKEN_BUDGET = 500
DEFAULT_AGENT_REFLECTION_TOKEN_BUDGET = 1000
