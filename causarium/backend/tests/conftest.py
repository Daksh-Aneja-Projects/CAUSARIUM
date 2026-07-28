"""
Shared test configuration and fixtures.

Forces the LLM layer into deterministic OFFLINE mode BEFORE backend.config is
imported, so the whole suite runs fast and reproducibly with no dependency on
Ollama or any hosted provider.
"""

import os

# Must be set before backend.config.Settings() is instantiated on first import.
os.environ.setdefault("LLM_OFFLINE_MODE", "true")

from typing import List  # noqa: E402

import pytest  # noqa: E402

from backend.simulation.scenario import run_scenario  # noqa: E402
from backend.models.run_result import RunResult  # noqa: E402


DIVERSE_SPECS = [
    {"agent_type": "COMPETITOR_DIRECT", "risk_tolerance": 0.85, "ethics_threshold": 0.3,
     "influence": 0.7, "capital": 2.0},
    {"agent_type": "EXECUTIVE_CEO", "risk_tolerance": 0.7, "ethics_threshold": 0.6,
     "influence": 0.9, "capital": 3.0},
    {"agent_type": "REGULATOR_DOMESTIC", "risk_tolerance": 0.2, "ethics_threshold": 0.8,
     "influence": 0.8, "capital": 1.0},
    {"agent_type": "INVESTOR_ACTIVIST", "risk_tolerance": 0.6, "ethics_threshold": 0.5,
     "influence": 0.6, "capital": 2.5},
    {"agent_type": "EMPLOYEE_DISGRUNTLED", "risk_tolerance": 0.8, "ethics_threshold": 0.2,
     "influence": 0.3, "capital": 0.5},
]

CONSTRAINTS = {
    "entropy_rate": 0.3, "cascade_coefficient": 2.0,
    "black_swan_probability": 0.05, "trust_decay_rate": 0.15,
}


@pytest.fixture(scope="session")
def sample_runs() -> List[RunResult]:
    """Eight authentic runs produced through the real physics (deterministic)."""
    return [
        run_scenario(
            f"run-{i}", DIVERSE_SPECS, n_ticks=20,
            constraint_params=CONSTRAINTS, detect_convergence=False,
        )
        for i in range(8)
    ]


@pytest.fixture(scope="session")
def single_run(sample_runs) -> RunResult:
    return sample_runs[0]
