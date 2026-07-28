import React, { useEffect, useState } from 'react';
import { causariumApi, SimilarData, Lens, GraphData } from '../services/api';
import { DiscoveryData } from '../types';
import { DNARadar } from './DNARadar';
import { OutcomeConstellation } from './OutcomeConstellation';
import { Icon, IconName } from './Icon';
import { AnimatedNumber, LiveMeter, Typewriter } from './Live';

const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366', CONFLICT_ESCALATION: '#FF7A45', MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF', STABLE_COOPERATION: '#00E5A0', FRAGMENTED_STALEMATE: '#00D9FF',
};

interface Narrative {
  headline: string;
  attractors: string[]; choke_points: string[]; butterfly_events: string[];
  singularities: string[]; causal_paradoxes: string[]; hidden_causal_chains: string[];
}

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
  const emphasis: string[] = lens?.emphasis ?? [];

  if (!data) return <div className="h-full flex items-center justify-center text-white font-mono animate-pulse">Extracting causal structure</div>;

  const dna = data.reality_dna_distribution ?? {};
  const dist = (data.outcome_distribution ?? {}) as Record<string, number>;
  const distTotal = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const nar: Narrative = data.narrative ?? { headline: '', attractors: [], choke_points: [], butterfly_events: [], singularities: [], causal_paradoxes: [], hidden_causal_chains: [] };

  return (
    <div className="h-full flex flex-col min-h-0 animate-fade-in px-6 py-4 gap-3">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {lens && <span className="shrink-0" style={{ color: accent }}><Icon name={('lens-' + lens.id) as IconName} size={20} /></span>}
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-white leading-none">Discovered Futures</h1>
            <p className="text-gray-500 font-mono text-[11px] mt-1">
              <AnimatedNumber value={data.run_count} /> timelines · {lens?.label ?? 'Strategy'} lens
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Action onClick={() => setShowConstellation(true)} accent={accent} icon="constellation">Constellation</Action>
          <Action onClick={onIntervene} accent={accent} icon="intervene">Intervene</Action>
          <Action onClick={onReport} accent={accent} icon="report">Report</Action>
        </div>
      </div>

      {/* Executive summary - the plain-English "what happened", typed live */}
      <div className="glass-panel rounded-2xl px-5 py-4 shrink-0" style={{ boxShadow: `0 0 0 1px ${accent}33, 0 0 40px -20px ${accent}` }}>
        <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} /> What the futures reveal
        </div>
        <Typewriter text={nar.headline || 'The simulation did not produce a decisive pattern.'} className="text-white text-[15px] leading-relaxed font-display" />
      </div>

      {/* Main: three readable columns filling the viewport */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Column 1: where it lands */}
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="Where the futures land" accent={accent} icon="constellation" flex={false}>
            <div className="space-y-2">
              {Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([o, n]) => (
                <div key={o}>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span style={{ color: OUTCOME_COLORS[o] ?? accent }}>{vocab(o)}</span>
                    <span className="text-gray-400"><AnimatedNumber value={Math.round((n / distTotal) * 100)} suffix="%" /></span>
                  </div>
                  <LiveMeter value={n / distTotal} color={OUTCOME_COLORS[o] ?? accent} height={7} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Basins of convergence" accent="#6C63FF" icon="constellation" hot={emphasis.includes('attractors')}>
            <Narr lines={nar.attractors} empty="No dominant basin formed; the outcome stayed open." accent="#6C63FF" />
          </Panel>
        </div>

        {/* Column 2: leverage + fragility (narrated) */}
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="Where to intervene" accent="#00D9FF" icon="clock" hot={emphasis.includes('choke_points')}>
            <Narr lines={nar.choke_points} empty="No clear leverage window." accent="#00D9FF" />
          </Panel>
          <Panel title="Small triggers, big effects" accent="#FFB800" icon="intervene" hot={emphasis.includes('butterfly_events')}>
            <Narr lines={nar.butterfly_events} empty="No outsized triggers detected." accent="#FFB800" />
          </Panel>
          <Panel title="Feedback loops and forks" accent="#FF7A45" icon="cooperation" hot={emphasis.includes('causal_paradoxes') || emphasis.includes('singularities')}>
            <Narr lines={[...nar.causal_paradoxes, ...nar.singularities]} empty="No self-reinforcing loops or hard forks." accent="#FF7A45" />
          </Panel>
        </div>

        {/* Column 3: fingerprint + chains + neighbors */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className="glass-panel rounded-2xl p-3 flex flex-col items-center shrink-0">
            <div className="self-start text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-2" style={{ color: '#FF3366' }}>
              <Icon name="dna" size={14} /> Reality DNA
            </div>
            <DNARadar dna={dna} accent={accent} size={210} />
          </div>
          <Panel title="Hidden causal chains" accent="#00E5A0" icon="graph" hot={emphasis.includes('hidden_causal_chains')}>
            <Narr lines={nar.hidden_causal_chains} empty="No recurring causal chain." accent="#00E5A0" />
          </Panel>
          {similar && (
            <div className="glass-panel rounded-2xl px-4 py-3 shrink-0">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: '#00E5A0' }}>
                  <Icon name="similar" size={13} /> Similar timelines
                </div>
                <div className="text-[9px] font-mono text-gray-500">{similar.indexed_runs} indexed · {similar.vector_backend}{similar.neo4j.available ? ` · Neo4j ${similar.neo4j.nodes}` : ''}</div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {similar.neighbors.slice(0, 8).map((n, i) => (
                  <div key={i} className="bg-[#0A0A0F] px-2 py-1.5 rounded border border-[#222]">
                    <div className="text-[#00E5A0] font-mono text-[11px]"><AnimatedNumber value={n.similarity * 100} decimals={0} suffix="%" /></div>
                    <div className="text-[8px] text-gray-500 truncate">{vocab(n.outcome)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showConstellation && <OutcomeConstellation discovery={data} graph={graph} lens={lens} onClose={() => setShowConstellation(false)} />}
    </div>
  );
};

// A panel that holds narrated sentences with a contained scroller.
const Panel: React.FC<{ title: string; accent: string; icon: IconName; hot?: boolean; flex?: boolean; children: React.ReactNode }> = ({ title, accent, icon, hot, flex = true, children }) => (
  <div className={`glass-panel rounded-2xl p-4 flex flex-col ${flex ? 'flex-1 min-h-0' : 'shrink-0'}`} style={hot ? { boxShadow: `0 0 0 1px ${accent}55, 0 0 26px -12px ${accent}` } : undefined}>
    <div className="text-xs font-semibold uppercase tracking-widest mb-2.5 flex items-center gap-2 shrink-0" style={{ color: accent }}>
      <Icon name={icon} size={14} />{title}{hot && <span className="text-[9px] text-gray-500 normal-case tracking-normal">focus</span>}
    </div>
    <div className="scroll-y flex-1 min-h-0">{children}</div>
  </div>
);

const Narr: React.FC<{ lines: string[]; empty: string; accent: string }> = ({ lines, empty, accent }) => (
  <div className="space-y-2 pr-1">
    {lines.length ? lines.slice(0, 6).map((t, i) => (
      <div key={i} className="flex gap-2 text-[13px] leading-snug text-gray-300">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
        <span>{t}</span>
      </div>
    )) : <div className="text-xs text-gray-600 italic">{empty}</div>}
  </div>
);

const Action: React.FC<{ onClick: () => void; accent: string; icon: IconName; children: React.ReactNode }> = ({ onClick, accent, icon, children }) => (
  <button onClick={onClick} className="px-3.5 py-2 rounded-lg font-mono text-sm text-white bg-[#12121A] border border-[#333] hover:border-[color:var(--h)] transition flex items-center gap-2" style={{ ['--h' as any]: accent }}>
    <Icon name={icon} size={15} />{children}
  </button>
);
