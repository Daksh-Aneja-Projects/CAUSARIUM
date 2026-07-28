import { Simulation, DiscoveryData } from '../types';

// Same-origin: Vite proxies /v1 and /health to the backend on :8000.
const API_BASE = '/v1';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface Lens {
  id: string; label: string; accent: string; icon: string;
  primary_metric: string; emphasis: string[]; particle_term: string;
  outcome_vocab: Record<string, string>;
}
export interface AgentCard {
  type: string; label: string; icon: string; blurb: string;
  category: string; defaults: Record<string, number>;
}
export interface AgentCategory { id: string; label: string; agents: AgentCard[]; }
export interface AgentCatalog { categories: AgentCategory[]; count: number; }
export interface Scenario {
  id: string; industry: string; lens: string; title: string; horizon: string;
  context: string; constraint_params: Record<string, number>;
  population: Record<string, any>[]; lens_detail: Lens; agent_count: number;
}
export interface ScenarioCatalog { scenarios: Scenario[]; lenses: Lens[]; }

export interface CreateSimulationPayload {
  scenario_name: string;
  description?: string;
  run_count: number;
  tick_depth: number;
  mode?: 'heuristic' | 'llm';
  constraint_params?: Record<string, number>;
  population?: Record<string, any>[];
  lens?: string | Lens;
  scenario_id?: string;
}

export const causariumApi = {
  async createSimulation(
    payload: CreateSimulationPayload
  ): Promise<{ simulation_id: string; status: string; websocket_url: string }> {
    return http('/simulations/', { method: 'POST', body: JSON.stringify(payload) });
  },

  async getSimulationStatus(simulationId: string): Promise<any> {
    return http(`/simulations/${simulationId}`);
  },

  async getDiscoveryData(simulationId: string): Promise<DiscoveryData> {
    return http(`/simulations/${simulationId}/discovery`);
  },

  async listSimulations(): Promise<{ simulations: any[] }> {
    return http('/simulations/');
  },

  // Returns a blob URL for the generated PDF report.
  async generateReport(simulationId: string): Promise<{ download_url: string }> {
    const res = await fetch(`${API_BASE}/simulations/${simulationId}/report`, { method: 'POST' });
    if (!res.ok) throw new Error(`Report generation failed: ${res.status}`);
    const blob = await res.blob();
    return { download_url: URL.createObjectURL(blob) };
  },

  async getAgentCatalog(): Promise<AgentCatalog> {
    return http('/catalog/agents');
  },
  async getScenarios(): Promise<ScenarioCatalog> {
    return http('/catalog/scenarios');
  },

  async getGraph(simulationId: string): Promise<GraphData> {
    return http(`/simulations/${simulationId}/graph`);
  },

  async getSimilar(simulationId: string): Promise<SimilarData> {
    return http(`/simulations/${simulationId}/similar`);
  },

  async pause(simulationId: string): Promise<any> {
    return http(`/simulations/${simulationId}/pause`, { method: 'POST' });
  },
  async resume(simulationId: string): Promise<any> {
    return http(`/simulations/${simulationId}/resume`, { method: 'POST' });
  },
  async inject(simulationId: string, payload: Record<string, any>): Promise<any> {
    return http(`/simulations/${simulationId}/inject`, { method: 'POST', body: JSON.stringify(payload) });
  },

  async triggerIntervention(
    simulationId: string,
    payload: { agent_index: number; attribute: string; value: number; tick?: number }
  ): Promise<CounterfactualResult> {
    return http(`/simulations/${simulationId}/intervene`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export interface GraphNode {
  id: string;
  agent_type: string;
  action: string;
  degree: number;
}
export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  frequency: number;
}
export interface GraphData {
  simulation_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  attractors: { label: string; convergence_rate: number }[];
}
export interface SimilarNeighbor {
  run_id: string;
  simulation_id: string;
  outcome: string;
  similarity: number;
}
export interface SimilarData {
  simulation_id: string;
  vector_backend: string;
  indexed_runs: number;
  neo4j: { available: boolean; nodes?: number; relationships?: number };
  neighbors: SimilarNeighbor[];
}
export interface CounterfactualResult {
  intervention: { agent_index: number; attribute: string; value: number };
  baseline_outcomes: Record<string, number>;
  counterfactual_outcomes: Record<string, number>;
  dna_delta: Record<string, number>;
  divergence_score: number;
  runs_compared: number;
}

export function streamUrl(simulationId: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/v1/simulations/${simulationId}/stream`;
}
