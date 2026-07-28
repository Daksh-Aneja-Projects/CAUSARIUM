import pytest
from backend.models.causal import CausalChain, ChainEvent, TickRange
from backend.models.event import Event
from backend.causal.aggregator import Aggregator
import uuid

def test_imports_and_models():
    # Test that we can import and instantiate core models
    chain_id = "test-chain"
    sim_id = uuid.uuid4()
    run_ids = [uuid.uuid4()]
    
    event = ChainEvent(
        tick=1,
        agent_type="Observer",
        action="Observe",
        magnitude=1.0
    )
    
    chain = CausalChain(
        chain_id=chain_id,
        simulation_id=sim_id,
        run_ids=run_ids,
        frequency=1.0,
        events=[event],
        terminal_outcome="Success",
        causal_weight=0.8,
        intervention_window=TickRange(start_tick=1, end_tick=10)
    )
    
    assert chain.chain_id == chain_id
    assert len(chain.events) == 1

def test_aggregator():
    agg = Aggregator()
    assert agg is not None
