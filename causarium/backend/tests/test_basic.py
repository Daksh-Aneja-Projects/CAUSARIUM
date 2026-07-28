from backend.models.causal import CausalChain, ChainEvent, TickRange
from backend.causal.aggregator import Aggregator


def test_imports_and_models():
    chain = CausalChain(
        chain_id="test-chain",
        simulation_id="sim-1",
        run_ids=["run-1"],
        frequency=1.0,
        events=[ChainEvent(tick=1, agent_type="Observer", action="Observe", magnitude=1.0)],
        terminal_outcome="STABLE_COOPERATION",
        causal_weight=0.8,
        intervention_window=TickRange(start_tick=1, end_tick=10),
    )
    assert chain.chain_id == "test-chain"
    assert len(chain.events) == 1


def test_aggregator_instantiates():
    assert Aggregator() is not None
