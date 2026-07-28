import React, { useEffect, useMemo, useRef, useState } from 'react';
import { causariumApi, GraphData, GraphNode } from '../services/api';

// Deterministic color per agent type.
const PALETTE = ['#6C63FF', '#00D9FF', '#FF3366', '#FFB800', '#00E5A0', '#B36CFF', '#FF7A45'];
function colorFor(agentType: string): string {
  let h = 0;
  for (let i = 0; i < agentType.length; i++) h = (h * 31 + agentType.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

interface Pos { x: number; y: number; }

// A small, self-contained force-directed layout (no external deps).
function layout(nodes: GraphNode[], edges: { source: string; target: string }[], w: number, h: number): Record<string, Pos> {
  const pos: Record<string, Pos> = {};
  const n = nodes.length || 1;
  // Deterministic seeded ring start.
  nodes.forEach((node, i) => {
    const a = (2 * Math.PI * i) / n;
    pos[node.id] = { x: w / 2 + Math.cos(a) * w * 0.3, y: h / 2 + Math.sin(a) * h * 0.3 };
  });
  const idx: Record<string, number> = {};
  nodes.forEach((nd, i) => (idx[nd.id] = i));

  const REPULSE = 9000, SPRING = 0.02, DAMP = 0.85;
  const vel: Pos[] = nodes.map(() => ({ x: 0, y: 0 }));

  for (let iter = 0; iter < 220; iter++) {
    // Repulsion (O(n^2), fine for the small structural graph).
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = pos[nodes[i].id], b = pos[nodes[j].id];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy || 0.01;
        const f = REPULSE / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * f, fy = (dy / d) * f;
        vel[i].x += fx; vel[i].y += fy;
        vel[j].x -= fx; vel[j].y -= fy;
      }
    }
    // Spring attraction along edges.
    for (const e of edges) {
      const ia = idx[e.source], ib = idx[e.target];
      if (ia == null || ib == null) continue;
      const a = pos[e.source], b = pos[e.target];
      const dx = b.x - a.x, dy = b.y - a.y;
      vel[ia].x += dx * SPRING; vel[ia].y += dy * SPRING;
      vel[ib].x -= dx * SPRING; vel[ib].y -= dy * SPRING;
    }
    // Integrate + gravity toward center.
    for (let i = 0; i < n; i++) {
      const p = pos[nodes[i].id];
      vel[i].x = (vel[i].x + (w / 2 - p.x) * 0.008) * DAMP;
      vel[i].y = (vel[i].y + (h / 2 - p.y) * 0.008) * DAMP;
      p.x += Math.max(-30, Math.min(30, vel[i].x));
      p.y += Math.max(-30, Math.min(30, vel[i].y));
      p.x = Math.max(40, Math.min(w - 40, p.x));
      p.y = Math.max(40, Math.min(h - 40, p.y));
    }
  }
  return pos;
}

export const RealityGraphExplorer: React.FC<{ simulationId: string; onClose: () => void }> = ({ simulationId, onClose }) => {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<GraphNode | null>(null);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 640 });

  useEffect(() => {
    causariumApi.getGraph(simulationId).then(setData).catch(e => setError(e.message));
  }, [simulationId]);

  useEffect(() => {
    if (wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    }
  }, [data]);

  const positions = useMemo(
    () => (data ? layout(data.nodes, data.edges, size.w, size.h) : {}),
    [data, size.w, size.h]
  );

  const maxDegree = useMemo(
    () => (data ? Math.max(1, ...data.nodes.map(n => n.degree)) : 1),
    [data]
  );
  const q = query.trim().toLowerCase();

  return (
    <div className="absolute inset-0 bg-[#0A0A0F] z-40 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-[#222] bg-[#0A0A0F]/80 backdrop-blur z-50">
        <div>
          <h2 className="text-xl text-white font-light">Reality Graph Explorer</h2>
          <div className="text-xs text-gray-500 font-mono mt-1">
            {data ? `${data.nodes.length} causal nodes · ${data.edges.length} reproducible edges` : 'Loading causal structure...'}
          </div>
        </div>
        <div className="flex space-x-4 items-center">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            type="text" placeholder="Highlight (e.g. 'SABOTAGE')"
            className="bg-[#12121A] border border-[#333] rounded px-4 py-1 text-sm text-gray-300 w-64 focus:outline-none focus:border-[#6C63FF]"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-white px-3 py-1 border border-[#333] rounded">Exit</button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden" ref={wrapRef}>
        {error && <div className="absolute inset-0 flex items-center justify-center text-[#FF3366] font-mono text-sm">{error}</div>}
        {!data && !error && <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono animate-pulse">Computing force layout...</div>}
        {data && data.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono text-sm text-center px-8">
            No reproducible causal structure yet — run more parallel timelines (≥3) to surface do-calculus edges.
          </div>
        )}
        {data && data.nodes.length > 0 && (
          <svg width={size.w} height={size.h} className="absolute inset-0">
            <defs>
              <radialGradient id="bg" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#15152a" />
                <stop offset="100%" stopColor="#0A0A0F" />
              </radialGradient>
            </defs>
            <rect width={size.w} height={size.h} fill="url(#bg)" />
            {data.edges.map((e, i) => {
              const a = positions[e.source], b = positions[e.target];
              if (!a || !b) return null;
              const strong = e.frequency >= 0.6;
              return (
                <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={strong ? '#6C63FF' : '#333'}
                  strokeOpacity={0.25 + e.frequency * 0.6}
                  strokeWidth={0.5 + e.weight * 4} />
              );
            })}
            {data.nodes.map(node => {
              const p = positions[node.id];
              if (!p) return null;
              const r = 6 + (node.degree / maxDegree) * 20;
              const c = colorFor(node.agent_type);
              const match = q && (node.id.toLowerCase().includes(q));
              const dim = q && !match;
              return (
                <g key={node.id}
                  onMouseEnter={() => setHover(node)} onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer', opacity: dim ? 0.15 : 1 }}>
                  <circle cx={p.x} cy={p.y} r={r} fill={c} fillOpacity={0.25}
                    stroke={c} strokeWidth={match ? 3 : 1.5}
                    style={{ filter: match ? `drop-shadow(0 0 8px ${c})` : 'none' }} />
                  {(node.degree >= maxDegree * 0.5 || match) && (
                    <text x={p.x} y={p.y - r - 4} textAnchor="middle" fontSize="10"
                      fill="#cbd5e1" fontFamily="JetBrains Mono, monospace">
                      {node.action}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {hover && (
          <div className="absolute bottom-4 left-4 glass-panel rounded-lg p-4 text-sm font-mono max-w-xs">
            <div className="text-[#00D9FF]">{hover.agent_type}</div>
            <div className="text-white text-lg">{hover.action}</div>
            <div className="text-gray-400 text-xs mt-1">causal degree: {hover.degree}</div>
          </div>
        )}

        {data && data.attractors.length > 0 && (
          <div className="absolute top-4 right-4 glass-panel rounded-lg p-4 text-xs font-mono space-y-2 max-w-xs">
            <div className="text-gray-400 uppercase tracking-wider">Attractors</div>
            {data.attractors.map((a, i) => (
              <div key={i} className="text-gray-300">
                <span className="text-[#6C63FF]">{(a.convergence_rate * 100).toFixed(0)}%</span> {a.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
