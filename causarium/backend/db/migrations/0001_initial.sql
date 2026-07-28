CREATE TABLE IF NOT EXISTS simulation_events (
    event_id UUID PRIMARY KEY,
    run_id UUID NOT NULL,
    tick INTEGER NOT NULL,
    agent_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_payload JSONB NOT NULL,
    causal_parents UUID[] NOT NULL,
    causal_weight FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulation_runs (
    run_id UUID PRIMARY KEY,
    simulation_id UUID NOT NULL,
    run_index INTEGER NOT NULL,
    completed BOOLEAN NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NOW()
);
