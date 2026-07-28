import React, { useEffect, useMemo, useState } from 'react';
import { causariumApi, streamUrl, AgentCatalog, AgentCard, Lens, SynthesizedScenario } from '../services/api';
import { Icon, agentTypeIcon } from './Icon';
import { AmbientField } from './AmbientField';

interface RosterMember { uid: string; type: string; label: string; attrs: Record<string, number>; contender?: boolean; }
const ATTR_KEYS = ['risk_tolerance', 'ethics_threshold', 'influence', 'capital'] as const;
const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const EXAMPLES = [
  'Who will win the next UK general election?',
  'Who wins the 2026 FIFA World Cup?',
  'Will the Fed cut rates and how does the market react?',
  'Who takes the next IPL title?',
];

/**
 * Prompt-first composer. Asking a question makes CAUSARIUM reason out the actors,
 * forces, lens, physics, and possible outcomes and fill everything below. The
 * derived cast stays fully visible and editable, and more actors can be added
 * from the catalogue. The lens is chosen automatically (shown, not a manual grid).
 */
export const ScenarioComposer: React.FC<{ onLaunch: (id: string, wsUrl: string, lens: Lens | null) => void }> = ({ onLaunch }) => {
  const [catalog, setCatalog] = useState<AgentCatalog | null>(null);
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [contenders, setContenders] = useState<string[]>([]);
  const [lensId, setLensId] = useState('forecast');
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [entropy, setEntropy] = useState(0.35);
  const [cascade, setCascade] = useState(2.0);
  const [runCount, setRunCount] = useState(40);
  const [mode, setMode] = useState<'heuristic' | 'llm'>('heuristic');
  const [dragOver, setDragOver] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    causariumApi.getAgentCatalog().then(setCatalog).catch(() => {});
    causariumApi.getScenarios().then(d => setLenses(d.lenses)).catch(() => {});
  }, []);

  const lens = useMemo(() => lenses.find(l => l.id === lensId) ?? null, [lenses, lensId]);
  const accent = lens?.accent ?? '#6C63FF';

  const design = async (q: string) => {
    const question = q.trim();
    if (!question) return;
    setSynthesizing(true); setError(null); setPrompt(question);
    try {
      const s: SynthesizedScenario = await causariumApi.synthesize(question);
      setTitle(s.title); setContext(s.context); setLensId(s.lens_id);
      setContenders(s.contenders || []);
      setEntropy(s.constraint_params.entropy_rate ?? 0.35);
      setCascade(s.constraint_params.cascade_coefficient ?? 2.0);
      setRoster(s.population.map((p: any, i: number) => ({
        uid: `syn-${i}`, type: p.agent_type, label: p.agent_type, contender: !!p.contender,
        attrs: Object.fromEntries(ATTR_KEYS.map(k => [k, p[k] ?? 0.5])) as Record<string, number>,
      })));
    } catch (e: any) {
      setError(e?.message ?? 'Could not reason a scenario for that question');
    } finally {
      setSynthesizing(false);
    }
  };

  const addAgent = (a: AgentCard) => setRoster(r => [...r, {
    uid: `${a.type}-${r.length}-${Math.round(performance.now())}`, type: a.type, label: a.label,
    attrs: Object.fromEntries(ATTR_KEYS.map(k => [k, a.defaults[k] ?? 0.5])) as Record<string, number>,
  }]);
  const removeAgent = (uid: string) => setRoster(r => r.filter(m => m.uid !== uid));
  const setAttr = (uid: string, k: string, v: number) => setRoster(r => r.map(m => m.uid === uid ? { ...m, attrs: { ...m.attrs, [k]: v } } : m));
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const type = e.dataTransfer.getData('text/agent-type');
    const a = catalog?.categories.flatMap(c => c.agents).find(x => x.type === type);
    if (a) addAgent(a);
  };

  const simulate = async () => {
    if (roster.length === 0) { setError('Ask a question above, or add at least one actor.'); return; }
    setLaunching(true); setError(null);
    try {
      const population = roster.map(m => ({ agent_type: m.type, confidence: 0.6, ...m.attrs }));
      const res = await causariumApi.createSimulation({
        scenario_name: title || prompt || 'Custom scenario', description: context,
        run_count: runCount, tick_depth: 25, mode,
        constraint_params: { entropy_rate: entropy, cascade_coefficient: cascade },
        population, lens: lensId,
        contenders: contenders.length ? contenders : undefined, prompt: prompt || undefined,
      });
      onLaunch(res.simulation_id, streamUrl(res.simulation_id), lens);
    } catch (e: any) { setError(e?.message ?? 'Launch failed'); setLaunching(false); }
  };

  return (
    <div className="h-full flex flex-col min-h-0 animate-fade-in relative">
      {/* Living background - futures always drifting and connecting */}
      <AmbientField accent={accent} className="opacity-30 pointer-events-none" energetic={synthesizing} />

      {/* Prompt bar */}
      <div className="px-8 pt-4 pb-3 shrink-0 relative z-10">
        <div className="text-[11px] font-mono uppercase tracking-[0.3em] mb-1.5" style={{ color: accent }}>Ask the future</div>
        <div className="relative">
          <input value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') design(prompt); }}
            placeholder="Ask anything: who wins the election, the World Cup, the market move, the merger..."
            className="w-full bg-[#0A0A0F] border border-[#333] rounded-xl pl-11 pr-36 py-3 text-white text-[15px] font-display focus:outline-none focus:border-[color:var(--h)] transition-colors"
            style={{ ['--h' as any]: accent }} />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Icon name="search" size={18} /></span>
          <button onClick={() => design(prompt)} disabled={synthesizing || !prompt.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-40 flex items-center gap-2"
            style={{ backgroundColor: accent, boxShadow: `0 0 18px -6px ${accent}` }}>
            {synthesizing ? 'Reasoning...' : <>Reason <Icon name="launch" size={14} /></>}
          </button>
        </div>
        {!title && !synthesizing && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => design(ex)} className="text-[10px] font-mono px-2 py-1 rounded-full border border-[#222] text-gray-500 hover:text-gray-300 hover:border-[#444] transition">{ex}</button>
            ))}
          </div>
        )}
        {title && (
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="font-display text-white text-sm">{title}</span>
            {lens && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ color: accent, borderColor: `${accent}44` }}><Icon name={('lens-' + lens.id) as any} size={11} />{lens.label}</span>}
            {contenders.length > 0 && <span className="text-[10px] font-mono text-gray-500 ml-1">outcomes:</span>}
            {contenders.map(c => <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: accent, background: `${accent}14` }}>{c}</span>)}
          </div>
        )}
      </div>

      {/* Workspace: catalogue + reasoned cast */}
      <div className="flex-1 min-h-0 grid grid-cols-[260px_minmax(0,1fr)] gap-4 px-8 pb-3 relative z-10">
        <aside className="glass-panel rounded-2xl flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-white/5 shrink-0">
            <div className="text-[11px] font-mono uppercase tracking-widest text-gray-400">Actor Catalogue</div>
            <div className="text-[10px] text-gray-600 font-mono mt-0.5">{catalog?.count ?? 0} archetypes, drag to add</div>
          </div>
          <div className="flex-1 min-h-0 px-2.5 py-2 space-y-2 overflow-y-auto">
            {catalog?.categories.map(cat => (
              <div key={cat.id}>
                <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-1 px-1">{cat.label}</div>
                <div className="grid grid-cols-2 gap-1">
                  {cat.agents.map(a => (
                    <div key={a.type} draggable onDragStart={e => e.dataTransfer.setData('text/agent-type', a.type)}
                      onDoubleClick={() => addAgent(a)} title={`${a.label}. ${a.blurb}. Drag or double click to add.`}
                      className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-[#0A0A0F] border border-[#222] hover:border-[color:var(--h)] transition-colors cursor-grab"
                      style={{ ['--h' as any]: accent }}>
                      <span className="shrink-0" style={{ color: accent }}><Icon name={agentTypeIcon(a.type)} size={13} /></span>
                      <span className="text-[10px] text-gray-300 truncate">{a.label.replace('Executive ', '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex flex-col min-h-0 min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-widest text-gray-400 mb-1.5 shrink-0">
            The Cast <span className="text-gray-600 normal-case tracking-normal">· {roster.length} actors{roster.length ? ', drag more or edit attributes' : ''}</span>
          </div>
          <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
            className={`flex-1 min-h-0 rounded-xl border border-dashed p-2.5 transition-colors ${dragOver ? 'drop-active' : 'border-[#333]'}`}>
            {roster.length === 0 ? (
              <div className="relative h-full overflow-hidden rounded-lg">
                <AmbientField accent={accent} energetic={synthesizing} className="opacity-70" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pointer-events-none">
                  {synthesizing ? (
                    <>
                      <div className="text-white font-display text-lg animate-pulse">Reasoning the futures</div>
                      <div className="text-gray-400 text-sm mt-1">CAUSARIUM is mapping the actors, forces, and possible outcomes...</div>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-300 font-display text-base">Ask a question above</div>
                      <div className="text-gray-500 text-sm mt-1">CAUSARIUM will reason the cast, or drag actors from the catalogue.</div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto h-full grid grid-cols-2 xl:grid-cols-3 gap-2 content-start pr-1">
                {roster.map(m => (
                  <div key={m.uid} className="bg-[#12121A] border border-[#222] rounded-lg p-2.5 animate-rise" style={m.contender ? { borderColor: `${accent}66` } : undefined}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span style={{ color: accent }}><Icon name={agentTypeIcon(m.type)} size={15} /></span>
                        <span className="text-xs text-gray-200 truncate">{m.label}</span>
                        {m.contender && <span className="text-[8px] font-mono px-1 rounded" style={{ color: accent, background: `${accent}18` }}>outcome</span>}
                      </div>
                      <button onClick={() => removeAgent(m.uid)} className="text-gray-600 hover:text-[#FF3366] shrink-0"><Icon name="close" size={13} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5">
                      {ATTR_KEYS.map(k => (
                        <label key={k} className="text-[9px] font-mono text-gray-500">
                          <div className="flex justify-between"><span>{k.replace('_', ' ')}</span><span style={{ color: accent }}>{m.attrs[k]?.toFixed(2)}</span></div>
                          <input type="range" min={0} max={k === 'capital' ? 4 : 1} step={0.05} value={m.attrs[k]}
                            onChange={e => setAttr(m.uid, k, parseFloat(e.target.value))} className="w-full h-1 accent-[#6C63FF]" />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compact physics + run row */}
          <div className="shrink-0 mt-2.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Mini label="Entropy" v={entropy} min={0} max={1} step={0.05} on={setEntropy} accent={accent} />
              <Mini label="Cascade" v={cascade} min={1} max={5} step={0.1} on={setCascade} accent={accent} />
              <Mini label="Timelines" v={runCount} min={10} max={120} step={2} on={v => setRunCount(Math.round(v))} accent={accent} fmt={v => `${Math.round(v)}`} />
              <div className="flex gap-1">
                {(['heuristic', 'llm'] as const).map(mm => (
                  <button key={mm} onClick={() => setMode(mm)} className={`text-[10px] font-mono px-2.5 py-1 rounded border transition ${mode === mm ? 'text-white border-[color:var(--h)]' : 'text-gray-500 border-[#222] hover:border-[#444]'}`} style={{ ['--h' as any]: accent }}>{mm === 'llm' ? 'LLM agents' : 'Fast'}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {error && <span className="text-[#FF3366] text-xs font-mono">{error}</span>}
              <button onClick={simulate} disabled={launching || roster.length === 0}
                className="px-7 py-2.5 rounded-xl font-medium text-white transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: accent, boxShadow: `0 0 22px -4px ${accent}` }}>
                {launching ? 'Simulating...' : 'Simulate futures'}<Icon name="launch" size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Mini: React.FC<{ label: string; v: number; min: number; max: number; step: number; on: (v: number) => void; accent: string; fmt?: (v: number) => string }> =
  ({ label, v, min, max, step, on, accent, fmt }) => (
    <label className="text-[10px] font-mono text-gray-400 flex items-center gap-2">
      {label}
      <input type="range" min={min} max={max} step={step} value={v} onChange={e => on(parseFloat(e.target.value))} className="w-20 accent-[#6C63FF]" />
      <span style={{ color: accent }}>{fmt ? fmt(v) : v.toFixed(2)}</span>
    </label>
  );
