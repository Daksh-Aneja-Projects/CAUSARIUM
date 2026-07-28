"""Default agent population and reality-physics for out-of-the-box simulations."""

# A deliberately heterogeneous cast so runs produce varied, interesting dynamics.
DEFAULT_POPULATION = [
    {"agent_type": "EXECUTIVE_CEO", "risk_tolerance": 0.7, "ethics_threshold": 0.6,
     "influence": 0.9, "capital": 3.0},
    {"agent_type": "COMPETITOR_DIRECT", "risk_tolerance": 0.85, "ethics_threshold": 0.3,
     "influence": 0.7, "capital": 2.0},
    {"agent_type": "REGULATOR_DOMESTIC", "risk_tolerance": 0.2, "ethics_threshold": 0.85,
     "influence": 0.8, "capital": 1.0},
    {"agent_type": "INVESTOR_ACTIVIST", "risk_tolerance": 0.6, "ethics_threshold": 0.5,
     "influence": 0.6, "capital": 2.5},
    {"agent_type": "EMPLOYEE_DISGRUNTLED", "risk_tolerance": 0.8, "ethics_threshold": 0.2,
     "influence": 0.3, "capital": 0.5},
    {"agent_type": "MEDIA_SOCIAL", "risk_tolerance": 0.5, "ethics_threshold": 0.5,
     "influence": 0.55, "capital": 0.8},
]

DEFAULT_CONSTRAINTS = {
    "entropy_rate": 0.3,
    "cascade_coefficient": 2.0,
    "trust_decay_rate": 0.15,
    "black_swan_probability": 0.04,
    "cooperation_incentive": 1.1,
}
