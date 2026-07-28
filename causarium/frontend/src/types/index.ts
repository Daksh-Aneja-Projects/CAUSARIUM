export type SimulationStatus = 'QUEUED' | 'RUNNING' | 'DISCOVERY' | 'COMPLETE' | 'FAILED';

export interface Simulation {
  simulation_id: string;
  title: string;
  context: string;
  status: SimulationStatus;
  tenant_id: string;
  created_at: string;
  completed_at?: string;
  run_config: RunConfig;
  discovery_config: DiscoveryConfig;
}

export interface RunConfig {
  run_count: number;
  tick_depth: number;
  constraint_params: {
    entropy_rate: number;
    cascade_coefficient: number;
    black_swan_probability: number;
  };
}

export interface DiscoveryConfig {
  enable_attractors: boolean;
  enable_choke_points: boolean;
  enable_butterfly_scan: boolean;
  enable_singularity_finder: boolean;
}

export interface Agent {
  type: string;
  persona: string;
  confidence: number;
  risk_tolerance: number;
}

export interface DiscoveryData {
  simulation_id: string;
  run_count: number;
  completed_at: string;
  attractors: any[];
  repellers: any[];
  choke_points: any[];
  butterfly_events: any[];
  singularities: any[];
  causal_paradoxes: any[];
  hidden_causal_chains: any[];
  reality_dna_distribution: Record<string, number>;
}
