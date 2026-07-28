import { Simulation, DiscoveryData } from '../types';

const API_BASE_URL = 'https://api.causarium.io/v1';

export const causariumApi = {
  async createSimulation(payload: any): Promise<{ simulation_id: string; status: string; websocket_url: string }> {
    // In a real implementation this would fetch, but we simulate it for now to avoid CORS/network issues without backend
    return {
      simulation_id: 'sim-' + Math.random().toString(36).substr(2, 9),
      status: 'QUEUED',
      websocket_url: `wss://api.causarium.io/v1/simulations/stream`,
    };
  },

  async getSimulationStatus(simulationId: string): Promise<Simulation> {
    // Mock response
    return {
      simulation_id: simulationId,
      title: 'Germany Market Entry Q4 2026',
      context: 'We are a $2B US SaaS company...',
      status: 'RUNNING',
      tenant_id: 'tenant-1',
      created_at: new Date().toISOString(),
      run_config: {
        run_count: 200,
        tick_depth: 30,
        constraint_params: { entropy_rate: 0.3, cascade_coefficient: 1.8, black_swan_probability: 0.02 }
      },
      discovery_config: { enable_attractors: true, enable_choke_points: true, enable_butterfly_scan: true, enable_singularity_finder: true }
    };
  },

  async getDiscoveryData(simulationId: string): Promise<DiscoveryData> {
    return {
      simulation_id: simulationId,
      run_count: 200,
      completed_at: new Date().toISOString(),
      attractors: [
        { attractor_id: 'ATT-007', label: 'Regulatory Consolidation', convergence_rate: 0.67, earliest_deterministic_tick: 14 }
      ],
      repellers: [],
      choke_points: [
        { choke_point_id: 'TCP-012', tick: 7, intervention_efficacy: 0.89 }
      ],
      butterfly_events: [],
      singularities: [],
      causal_paradoxes: [],
      hidden_causal_chains: [],
      reality_dna_distribution: { aggression: 0.72, innovation: 0.34, trust: 0.21, risk: 0.88, chaos: 0.61 }
    };
  },

  async triggerIntervention(payload: any) {
    return { success: true };
  },

  async generateReport(simulationId: string) {
    return {
      report_id: 'rpt-' + Math.random().toString(36).substr(2, 9),
      download_url: '#',
      format: 'PDF',
      pages: 12
    };
  }
};
