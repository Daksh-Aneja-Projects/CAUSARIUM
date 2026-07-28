import { useEffect, useRef, useState } from 'react';

export type StreamEvent = {
  type: string;
  message?: string;
  timestamp: string;
  raw: any;
};

interface StreamState {
  events: StreamEvent[];
  isConnected: boolean;
  progress: number;      // 0-100
  status: string;
  currentRun: number;
  outcomes: Record<string, number>;
  complete: boolean;
}

const HUMAN: Record<string, (e: any) => string> = {
  status: (e) => `Status: ${e.status}`,
  notice: (e) => e.message,
  run_start: (e) => `Run ${e.run} started (${e.agents} agents)`,
  tick: (e) => `Run ${e.run} · tick ${e.tick} — ${e.events} events${e.black_swan ? ' ⚡ BLACK SWAN' : ''}`,
  agent_decision: (e) => `${e.persona} (${e.agent_type}): ${e.action_type} → ${e.target} — ${e.rationale}`,
  run_complete: (e) => `Run ${e.run} complete → ${e.outcome}`,
  complete: () => 'All runs + discovery complete',
  error: (e) => `Error: ${e.message}`,
};

export function useSimulationStream(websocketUrl: string | null) {
  const [state, setState] = useState<StreamState>({
    events: [], isConnected: false, progress: 0, status: 'CONNECTING',
    currentRun: 0, outcomes: {}, complete: false,
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!websocketUrl) return;
    const ws = new WebSocket(websocketUrl);
    wsRef.current = ws;

    ws.onopen = () => setState((s) => ({ ...s, isConnected: true }));

    ws.onmessage = (msg) => {
      let data: any;
      try { data = JSON.parse(msg.data); } catch { return; }

      setState((s) => {
        const next: StreamState = { ...s };
        // Only log meaningful events (throttle raw ticks a little).
        const label = HUMAN[data.type]?.(data) ?? data.type;
        if (data.type !== 'tick' || data.tick % 5 === 0 || data.black_swan) {
          next.events = [
            ...s.events,
            { type: data.type, message: label, timestamp: new Date().toISOString(), raw: data },
          ].slice(-200);
        }
        if (typeof data.progress === 'number') next.progress = Math.round(data.progress * 100);
        if (data.status) next.status = data.status;
        if (typeof data.run === 'number') next.currentRun = data.run + 1;
        if (data.type === 'run_complete' && data.outcome) {
          next.outcomes = { ...s.outcomes, [data.outcome]: (s.outcomes[data.outcome] || 0) + 1 };
        }
        if (data.type === 'complete') { next.progress = 100; next.status = 'COMPLETE'; next.complete = true; }
        if (data.type === 'error') { next.status = 'FAILED'; }
        return next;
      });
    };

    ws.onclose = () => setState((s) => ({ ...s, isConnected: false }));
    ws.onerror = () => setState((s) => ({ ...s, isConnected: false }));

    return () => ws.close();
  }, [websocketUrl]);

  return state;
}
