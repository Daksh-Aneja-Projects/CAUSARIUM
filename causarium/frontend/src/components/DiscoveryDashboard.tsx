import React, { useEffect, useState } from 'react';
import { causariumApi, SimilarData, Lens, GraphData } from '../services/api';
import { DiscoveryData } from '../types';
import { DNARadar } from './DNARadar';
import { OutcomeConstellation } from './OutcomeConstellation';

const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366', CONFLICT_ESCALATION: '#FF7A45', MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF', STABLE_COOPERATION: '#00E5A0', FRAGMENTED_STALEMATE: '#00D9FF',
};

export const DiscoveryDashboard: React.FC<{ simulationId: string; lens: Lens | null; onIntervene: () => void; onReport: () => void }> = ({ simulationId, lens, onIntervene, onReport }) => {
  const [data, setData] = useState<(DiscoveryData & any) | null>(null);
  const [similar, setSimilar] = useState<SimilarData | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [showConstellation, setShowConstellation] = useState(false);

  useEffect(() => {
    causariumApi.getDiscoveryData(simulationId).then(setData);
    causariumApi.getSimilar(simulationId).then(setSimilar).catch(() => {});
    causariumApi.getGraph(simulationId).then(setGraph).catch(() => {});
  }, [simulationId]);

  const accent = lens?.accent ?? '#6C63FF';
  const vocab = (o: string) => lens?.outcome_vocab?.[o] ?? o;
  const emphasis = lens?.emphasis ?? [];

  if (!data) return <div className="p-8 text-white font-mono animate-pulse">Extracting causal structure…</div>;

  const dna = data.reality_dna_distribution ?? {};

  return (
    <div className="absolute inset-0 scroll-y">
      <div className="max-w-7xl mx-auto p-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.3em] mb-1 flex items-center gap-2" style={{ color: accent }}>
              {lens && <span>{lens.icon} {lens.label}</span>}<span className="text-gray-600">lens</span>
            </div>
            <h1 className="font-display text-4xl font-semibold text-white">Discovered Futures</h1>
            <p className="text-gray-400 font-mono text-sm mt-1">{simulationId} · {data.run_count} timelines analyzed</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Action onClick={() => setShowConstellation(true)} accent={accent} icon="✦">Constellation</Action>
            <Action onClick={onIntervene} accent={accent} icon="⚡">Intervene</Action>
            <Action onClick={onReport} accent={accent} icon="📄">Report</Action>
          </div>
        </div>

        {/* Outcome distribution ribbon */}
        {data.outcome_distribution && (
          <div className="glass-panel rounded-xl p-4 mb-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Outcome Distribution</div>
            <div className="flex h-3 rounded-full overflow-hidden bg-[#0A0A0F]">
              {Object.entries(data.outcome_distribution as Record<string, number>).map(([o, n]) => {
                const total = Object.values(data.outcome_distribution as Record<string, number>).reduce((a, b) => a + b, 0) || 1;
                return <div key={o} title={`${vocab(o)}: ${n}`} style={{ width: `${(n / total) * 100}%`, backgroundColor: OUTCOME_COLORS[o] ?? accent }} />;
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {Object.entries(data.outcome_distribution as Record<string, number>).map(([o, n]) => (
                <span key={o} className="text-[10px] font-mono flex items-center gap-1" style={{ color: OUTCOME_COLORS[o] ?? accent }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: OUTCOME_COLORS[o] ?? accent }} />{vocab(o)} · {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card title="Dominant Attractors" accent="#6C63FF" hot={emphasis.includes('attractors')}>
            {data.attractors.length ? data.attractors.map((a: any, i: number) => (
              <Row key={i} accent="#6C63FF">
                <div className="text-white text-sm mb-1">{a.label}</div>
                <Meta left={`Convergence ${(a.convergence_rate * 100).toFixed(0)}%`} right={`Tick ${a.earliest_deterministic_tick}`} />
              </Row>
            )) : <Empty>No dominant attractor above 15%.</Empty>}
          </Card>

          <Card title="Temporal Choke Points" accent="#00D9FF" hot={emphasis.includes('choke_points')}>
            {data.choke_points.length ? data.choke_points.map((c: any, i: number) => (
              <Row key={i} accent="#00D9FF">
                <div className="text-white text-sm mb-1">Tick {c.tick} leverage</div>
                <Meta left={`Efficacy ${(c.intervention_efficacy * 100).toFixed(0)}%`} right={c.choke_point_id} />
              </Row>
            )) : <Empty>No leverage peaks.</Empty>}
          </Card>

          <div className="glass-panel rounded-2xl p-5 flex flex-col items-center">
            <div className="self-start text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#FF3366' }}>Reality DNA</div>
            <DNARadar dna={dna} accent={accent} size={300} />
          </div>
        </div>

        {/* Phenomena row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
          <Card title="Butterfly Events" accent="#FFB800" hot={emphasis.includes('butterfly_events')}>
            {(data.butterfly_events ?? []).length ? data.butterfly_events.slice(0, 5).map((b: any, i: number) => (
              <Row key={i} accent="#FFB800"><div className="text-white text-xs">{b.event_label}</div><Meta left={`×${b.amplification_ratio.toFixed(1)} amplification`} right="" /></Row>
            )) : <Empty>None above threshold.</Empty>}
          </Card>
          <Card title="Singularities" accent="#B36CFF" hot={emphasis.includes('singularities')}>
            {(data.singularities ?? []).length ? data.singularities.slice(0, 5).map((s: any, i: number) => (
              <Row key={i} accent="#B36CFF"><div className="text-white text-xs">Tick {s.tick}</div><Meta left={s.decision} right="" /></Row>
            )) : <Empty>No bifurcations.</Empty>}
          </Card>
          <Card title="Causal Paradoxes" accent="#FF7A45" hot={emphasis.includes('causal_paradoxes')}>
            {(data.causal_paradoxes ?? []).length ? data.causal_paradoxes.slice(0, 5).map((p: any, i: number) => (
              <Row key={i} accent="#FF7A45"><div className="text-white text-xs">{(p.cycle ?? []).join(' → ')}</div><Meta left={`Strength ${p.cycle_strength.toFixed(2)}`} right="" /></Row>
            )) : <Empty>No feedback loops.</Empty>}
          </Card>
          <Card title="Hidden Causal Chains" accent="#00E5A0" hot={emphasis.includes('hidden_causal_chains')}>
            {(data.hidden_causal_chains ?? []).length ? data.hidden_causal_chains.slice(0, 5).map((c: any, i: number) => (
              <Row key={i} accent="#00E5A0"><div className="text-white text-xs">{c.chain_id} · {vocab(c.terminal_outcome)}</div><Meta left={`w ${c.causal_weight.toFixed(1)}`} right={`${(c.frequency * 100).toFixed(0)}%`} /></Row>
            )) : <Empty>None extracted.</Empty>}
          </Card>
        </div>

        {/* Similar timelines */}
        {similar && (
          <div className="glass-panel rounded-2xl p-5 mt-5">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#00E5A0' }}>Similar Timelines · Reality DNA</div>
              <div className="text-[10px] font-mono text-gray-500">{similar.indexed_runs} indexed · {similar.vector_backend} · Neo4j {similar.neo4j.available ? `${similar.neo4j.nodes} nodes` : 'off'}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {similar.neighbors.slice(0, 8).map((n, i) => (
                <div key={i} className="bg-[#0A0A0F] p-3 rounded border border-[#222]">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#00E5A0] font-mono text-sm">{(n.similarity * 100).toFixed(1)}%</span>
                    <span className="text-[9px] text-gray-600 font-mono">{n.simulation_id.slice(0, 10)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{vocab(n.outcome)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showConstellation && (
        <OutcomeConstellation discovery={data} graph={graph} lens={lens} onClose={() => setShowConstellation(false)} />
      )}
    </div>
  );
};

// ── presentational ───────────────────────────────────────────────────── //
const Card: React.FC<{ title: string; accent: string; hot?: boolean; children: React.ReactNode }> = ({ title, accent, hot, children }) => (
  <div className="glass-panel rounded-2xl p-5 flex flex-col" style={hot ? { boxShadow: `0 0 0 1px ${accent}66, 0 0 30px -10px ${accent}` } : undefined}>
    <div className="text-sm font-semibold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: accent }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />{title}{hot && <span className="text-[9px] text-gray-500 normal-case tracking-normal">· focus</span>}
    </div>
    <div className="scroll-y flex-1 max-h-72 space-y-2 pr-1">{children}</div>
  </div>
);
const Row: React.FC<{ accent: string; children: React.ReactNode }> = ({ accent, children }) => (
  <div className="bg-[#0A0A0F] p-3 rounded border border-[#222] hover:border-[color:var(--h)] transition-colors" style={{ ['--h' as any]: accent }}>{children}</div>
);
const Meta: React.FC<{ left: string; right: string }> = ({ left, right }) => (
  <div className="flex justify-between text-[10px] text-gray-500 font-mono gap-2"><span className="truncate">{left}</span><span>{right}</span></div>
);
const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="text-xs text-gray-600 italic py-2">{children}</div>;
const Action: React.FC<{ onClick: () => void; accent: string; icon: string; children: React.ReactNode }> = ({ onClick, accent, icon, children }) => (
  <button onClick={onClick} className="px-4 py-2 rounded-lg font-mono text-sm text-white bg-[#12121A] border border-[#333] hover:border-[color:var(--h)] transition flex items-center gap-2" style={{ ['--h' as any]: accent }}>
    <span>{icon}</span>{children}
  </button>
);
