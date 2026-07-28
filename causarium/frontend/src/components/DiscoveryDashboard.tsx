import React, { useEffect, useState } from 'react';
import { causariumApi, SimilarData, Lens, GraphData } from '../services/api';
import { DiscoveryData } from '../types';
import { DNARadar } from './DNARadar';
import { OutcomeConstellation } from './OutcomeConstellation';
import { Icon, IconName } from './Icon';

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

  if (!data) return <div className="p-8 text-white font-mono animate-pulse">Extracting causal structure</div>;
  const dna = data.reality_dna_distribution ?? {};
  const dist = (data.outcome_distribution ?? {}) as Record<string, number>;
  const distTotal = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="h-full flex flex-col min-h-0 animate-fade-in px-6 py-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 shrink-0 mb-3">
        <div className="flex items-center gap-3">
          {lens && <span style={{ color: accent }}><Icon name={('lens-' + lens.id) as IconName} size={20} /></span>}
          <div>
            <h1 className="font-display text-2xl font-semibold text-white leading-none">Discovered Futures</h1>
            <p className="text-gray-500 font-mono text-[11px] mt-1">{data.run_count} timelines · {lens?.label ?? 'Strategy'} lens · {simulationId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Action onClick={() => setShowConstellation(true)} accent={accent} icon="constellation">Constellation</Action>
          <Action onClick={onIntervene} accent={accent} icon="intervene">Intervene</Action>
          <Action onClick={onReport} accent={accent} icon="report">Report</Action>
        </div>
      </div>

      {/* Outcome ribbon */}
      <div className="glass-panel rounded-xl px-4 py-2.5 mb-3 shrink-0">
        <div className="flex h-2.5 rounded-full overflow-hidden bg-[#0A0A0F] gap-[2px]">
          {Object.entries(dist).map(([o, n]) => (
            <div key={o} title={`${vocab(o)}: ${n}`} style={{ width: `${(n / distTotal) * 100}%`, backgroundColor: OUTCOME_COLORS[o] ?? accent }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
          {Object.entries(dist).map(([o, n]) => (
            <span key={o} className="text-[10px] font-mono flex items-center gap-1.5" style={{ color: OUTCOME_COLORS[o] ?? accent }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: OUTCOME_COLORS[o] ?? accent }} />{vocab(o)} · {n}
            </span>
          ))}
        </div>
      </div>

      {/* Main grid fills the viewport */}
      <div className="flex-1 min-h-0 grid grid-rows-2 gap-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0">
          <Card title="Dominant Attractors" accent="#6C63FF" icon="constellation" hot={emphasis.includes('attractors')}>
            {data.attractors.length ? data.attractors.map((a: any, i: number) => (
              <Row key={i} accent="#6C63FF"><div className="text-white text-sm">{a.label}</div>
                <Meta left={`Convergence ${(a.convergence_rate * 100).toFixed(0)}%`} right={`Tick ${a.earliest_deterministic_tick}`} /></Row>
            )) : <Empty>No dominant attractor above 15%.</Empty>}
          </Card>
          <Card title="Temporal Choke Points" accent="#00D9FF" icon="clock" hot={emphasis.includes('choke_points')}>
            {data.choke_points.length ? data.choke_points.map((c: any, i: number) => (
              <Row key={i} accent="#00D9FF"><div className="text-white text-sm">Tick {c.tick} leverage</div>
                <Meta left={`Efficacy ${(c.intervention_efficacy * 100).toFixed(0)}%`} right={c.choke_point_id} /></Row>
            )) : <Empty>No leverage peaks.</Empty>}
          </Card>
          <div className="glass-panel rounded-2xl p-3 flex flex-col items-center min-h-0">
            <div className="self-start text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-2" style={{ color: '#FF3366' }}>
              <Icon name="dna" size={14} /> Reality DNA
            </div>
            <div className="flex-1 min-h-0 flex items-center"><DNARadar dna={dna} accent={accent} size={230} /></div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-h-0">
          <Card title="Butterfly Events" accent="#FFB800" icon="intervene" hot={emphasis.includes('butterfly_events')}>
            {(data.butterfly_events ?? []).length ? data.butterfly_events.slice(0, 6).map((b: any, i: number) => (
              <Row key={i} accent="#FFB800"><div className="text-white text-xs truncate">{b.event_label}</div><Meta left={`x${b.amplification_ratio.toFixed(1)} amplification`} right="" /></Row>
            )) : <Empty>None above threshold.</Empty>}
          </Card>
          <Card title="Singularities" accent="#B36CFF" icon="lens-forecast" hot={emphasis.includes('singularities')}>
            {(data.singularities ?? []).length ? data.singularities.slice(0, 6).map((s: any, i: number) => (
              <Row key={i} accent="#B36CFF"><div className="text-white text-xs">Tick {s.tick}</div><Meta left={s.decision} right="" /></Row>
            )) : <Empty>No bifurcations.</Empty>}
          </Card>
          <Card title="Causal Paradoxes" accent="#FF7A45" icon="cooperation" hot={emphasis.includes('causal_paradoxes')}>
            {(data.causal_paradoxes ?? []).length ? data.causal_paradoxes.slice(0, 6).map((p: any, i: number) => (
              <Row key={i} accent="#FF7A45"><div className="text-white text-xs truncate">{(p.cycle ?? []).join(' > ')}</div><Meta left={`Strength ${p.cycle_strength.toFixed(2)}`} right="" /></Row>
            )) : <Empty>No feedback loops.</Empty>}
          </Card>
          <Card title="Hidden Causal Chains" accent="#00E5A0" icon="graph" hot={emphasis.includes('hidden_causal_chains')}>
            {(data.hidden_causal_chains ?? []).length ? data.hidden_causal_chains.slice(0, 6).map((c: any, i: number) => (
              <Row key={i} accent="#00E5A0"><div className="text-white text-xs">{c.chain_id} · {vocab(c.terminal_outcome)}</div><Meta left={`weight ${c.causal_weight.toFixed(1)}`} right={`${(c.frequency * 100).toFixed(0)}%`} /></Row>
            )) : <Empty>None extracted.</Empty>}
          </Card>
        </div>
      </div>

      {/* Similar timelines (slim strip) */}
      {similar && (
        <div className="glass-panel rounded-xl px-4 py-2.5 mt-3 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: '#00E5A0' }}>
              <Icon name="similar" size={14} /> Similar Timelines
            </div>
            <div className="text-[10px] font-mono text-gray-500">{similar.indexed_runs} indexed · {similar.vector_backend} · Neo4j {similar.neo4j.available ? `${similar.neo4j.nodes} nodes` : 'off'}</div>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {similar.neighbors.slice(0, 8).map((n, i) => (
              <div key={i} className="bg-[#0A0A0F] px-2 py-1.5 rounded border border-[#222]">
                <div className="text-[#00E5A0] font-mono text-xs">{(n.similarity * 100).toFixed(1)}%</div>
                <div className="text-[9px] text-gray-500 truncate">{vocab(n.outcome)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showConstellation && <OutcomeConstellation discovery={data} graph={graph} lens={lens} onClose={() => setShowConstellation(false)} />}
    </div>
  );
};

const Card: React.FC<{ title: string; accent: string; icon: IconName; hot?: boolean; children: React.ReactNode }> = ({ title, accent, icon, hot, children }) => (
  <div className="glass-panel rounded-2xl p-4 flex flex-col min-h-0" style={hot ? { boxShadow: `0 0 0 1px ${accent}55, 0 0 26px -12px ${accent}` } : undefined}>
    <div className="text-xs font-semibold uppercase tracking-widest mb-2.5 flex items-center gap-2 shrink-0" style={{ color: accent }}>
      <Icon name={icon} size={14} />{title}{hot && <span className="text-[9px] text-gray-500 normal-case tracking-normal">focus</span>}
    </div>
    <div className="scroll-y flex-1 min-h-0 space-y-1.5 pr-1">{children}</div>
  </div>
);
const Row: React.FC<{ accent: string; children: React.ReactNode }> = ({ accent, children }) => (
  <div className="bg-[#0A0A0F] p-2.5 rounded border border-[#222] hover:border-[color:var(--h)] transition-colors" style={{ ['--h' as any]: accent }}>{children}</div>
);
const Meta: React.FC<{ left: string; right: string }> = ({ left, right }) => (
  <div className="flex justify-between text-[10px] text-gray-500 font-mono gap-2 mt-0.5"><span className="truncate">{left}</span><span className="shrink-0">{right}</span></div>
);
const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="text-xs text-gray-600 italic py-1">{children}</div>;
const Action: React.FC<{ onClick: () => void; accent: string; icon: IconName; children: React.ReactNode }> = ({ onClick, accent, icon, children }) => (
  <button onClick={onClick} className="px-3.5 py-2 rounded-lg font-mono text-sm text-white bg-[#12121A] border border-[#333] hover:border-[color:var(--h)] transition flex items-center gap-2" style={{ ['--h' as any]: accent }}>
    <Icon name={icon} size={15} />{children}
  </button>
);
