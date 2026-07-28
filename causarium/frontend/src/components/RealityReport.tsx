import React, { useEffect, useState } from 'react';
import { causariumApi, Lens } from '../services/api';
import { Icon, IconName } from './Icon';
import { DNARadar } from './DNARadar';
import { LiveMeter, AnimatedNumber, Typewriter } from './Live';

const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366', CONFLICT_ESCALATION: '#FF7A45', MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF', STABLE_COOPERATION: '#00E5A0', FRAGMENTED_STALEMATE: '#00D9FF',
};
const PALETTE = ['#6C63FF', '#00D9FF', '#FF3366', '#FFB800', '#00E5A0', '#B36CFF', '#FF7A45'];
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); };
const colorFor = (o: string, a: string) => OUTCOME_COLORS[o] || PALETTE[hash(o) % PALETTE.length] || a;

/** In-app Reality Report - the plain-English answer + evidence, styled in-theme (no PDF). */
export const RealityReport: React.FC<{ simulationId: string; lens: Lens | null; onClose: () => void }> = ({ simulationId, lens, onClose }) => {
  const [data, setData] = useState<any | null>(null);
  const [meta, setMeta] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const accent = lens?.accent ?? '#6C63FF';
  const vocab = (o: string) => lens?.outcome_vocab?.[o] ?? o;

  useEffect(() => {
    causariumApi.getDiscoveryData(simulationId).then(setData).catch(e => setError(e.message));
    causariumApi.getSimulationStatus(simulationId).then(setMeta).catch(() => {});
  }, [simulationId]);

  const nar = data?.narrative ?? {};
  const dist = (data?.outcome_distribution ?? {}) as Record<string, number>;
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const ranked = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  const dna = data?.reality_dna_distribution ?? {};

  return (
    <div className="absolute inset-0 bg-[#0A0A0F]/92 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fade-in">
      <div className="glass-panel rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden" style={{ boxShadow: `0 0 0 1px ${accent}22, 0 0 60px -20px ${accent}` }}>
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-white/5 shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-[0.3em]" style={{ color: accent }}>Reality Report</div>
            <h2 className="font-display text-2xl text-white mt-1 truncate">{meta?.title || 'Simulation'}</h2>
            {meta?.prompt && <p className="text-gray-500 font-mono text-xs mt-0.5 truncate">{meta.prompt}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => window.print()} className="px-3 py-2 rounded-lg font-mono text-sm text-white bg-[#12121A] border border-[#333] hover:border-[color:var(--h)] transition flex items-center gap-2" style={{ ['--h' as any]: accent }}>
              <Icon name="report" size={14} /> Print
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none px-1"><Icon name="close" size={20} /></button>
          </div>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center text-[#FF3366] font-mono text-sm">{error}</div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 font-mono animate-pulse">Composing the report...</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* The answer */}
            <section>
              <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">The answer</div>
              <Typewriter text={nar.headline || 'No decisive pattern emerged.'} className="text-white text-[17px] leading-relaxed font-display" />
            </section>

            {/* Outcome probabilities */}
            <section>
              <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">Probability of each outcome</div>
              <div className="space-y-2.5">
                {ranked.map(([o, n], i) => (
                  <div key={o}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2" style={{ color: colorFor(o, accent) }}>
                        {i === 0 && <Icon name="launch" size={13} />}{vocab(o)}
                      </span>
                      <span className="font-mono text-gray-300"><AnimatedNumber value={Math.round((n / total) * 100)} suffix="%" /></span>
                    </div>
                    <LiveMeter value={n / total} color={colorFor(o, accent)} height={8} />
                  </div>
                ))}
              </div>
            </section>

            {/* Evidence grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Block title="Where to intervene" icon="clock" accent="#00D9FF" lines={nar.choke_points} empty="No clear leverage window." />
              <Block title="Small triggers, big effects" icon="intervene" accent="#FFB800" lines={nar.butterfly_events} empty="No outsized triggers." />
              <Block title="Feedback loops and forks" icon="cooperation" accent="#FF7A45" lines={[...(nar.causal_paradoxes ?? []), ...(nar.singularities ?? [])]} empty="No self-reinforcing loops." />
              <Block title="Hidden causal chains" icon="graph" accent="#00E5A0" lines={nar.hidden_causal_chains} empty="No recurring chain." />
            </div>

            {/* DNA */}
            <section className="flex flex-col items-center pt-2">
              <div className="self-start text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Reality DNA fingerprint</div>
              <DNARadar dna={dna} accent={accent} size={260} />
            </section>

            <div className="text-center text-gray-600 text-[11px] font-mono pt-2">Generated by CAUSARIUM Reality Intelligence · {data.run_count} simulated timelines</div>
          </div>
        )}
      </div>
    </div>
  );
};

const Block: React.FC<{ title: string; icon: IconName; accent: string; lines?: string[]; empty: string }> = ({ title, icon, accent, lines, empty }) => (
  <div className="bg-[#0A0A0F] rounded-xl p-4 border border-[#1c1c24]">
    <div className="text-xs font-semibold uppercase tracking-widest mb-2.5 flex items-center gap-2" style={{ color: accent }}><Icon name={icon} size={14} />{title}</div>
    <div className="space-y-2">
      {(lines && lines.length) ? lines.slice(0, 4).map((t, i) => (
        <div key={i} className="flex gap-2 text-[13px] leading-snug text-gray-300"><span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} /><span>{t}</span></div>
      )) : <div className="text-xs text-gray-600 italic">{empty}</div>}
    </div>
  </div>
);
