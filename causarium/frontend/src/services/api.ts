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

export interface CreateSimulationPayload {
  scenario_name: string;
  description?: string;
  run_count: number;
  tick_depth: number;
  mode?: 'heuristic' | 'llm';
  constraint_params?: Record<string, number>;
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

  async triggerIntervention(payload: any): Promise<any> {
    return http('/interventions/', { method: 'POST', body: JSON.stringify(payload) });
  },
};

export function streamUrl(simulationId: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/v1/simulations/${simulationId}/stream`;
}
