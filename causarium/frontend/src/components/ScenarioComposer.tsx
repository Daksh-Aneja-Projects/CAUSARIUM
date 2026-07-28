import React, { useEffect, useMemo, useState } from 'react';
import { causariumApi, streamUrl, AgentCatalog, AgentCard, Scenario, Lens } from '../services/api';
import { Icon, agentTypeIcon, lensIcon } from './Icon';

interface RosterMember { uid: string; type: string; label: string; attrs: Record<string, number>; }
const ATTR_KEYS = ['risk_tolerance', 'ethics_threshold', 'influence', 'capital'] as const;
const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const ScenarioComposer: React.FC<{ onLaunch: (id: string, wsUrl: string, lens: Lens | null) => void }> = ({ onLaunch }) => {
  const [catalog, setCatalog] = useState<AgentCatalog | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [lensId, setLensId] = useState<string>('strategy');
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [runCount, setRunCount] = useState(24);
  const [tickDepth, setTickDepth] = useState(25);
  const [entropy, setEntropy] = useState(0.3);
  const [cascade, setCascade] = useState(2.0);
  const [mode, setMode] = useState<'heuristic' | 'llm'>('heuristic');
  const [dragOver, setDragOver] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState('');

  useEffect(() => {
    causariumApi.getAgentCatalog().then(setCatalog).catch(e => setError(e.message));
    causariumApi.getScenarios().then(d => { setScenarios(d.scenarios); setLenses(d.lenses); }).catch(() => {});
  }, []);

  const lens = useMemo(() => lenses.find(l => l.id === lensId) ?? null, [lenses, lensId]);
  const accent = lens?.accent ?? '#6C63FF';

  const loadScenario = (s: Scenario) => {
    setScenarioId(s.id); setLensId(s.lens); setContext(s.context);
    setEntropy(s.constraint_params.entropy_rate ?? 0.3);
    setCascade(s.constraint_params.cascade_coefficient ?? 2.0);
    setRoster(s.population.map((p, i) => ({
      uid: `${s.id}-${i}`, type: p.agent_type, label: titleCase(p.agent_type),
      attrs: Object.fromEntries(ATTR_KEYS.map(k => [k, p[k] ?? 0.5])) as Record<string, number>,
    })));
  };

  const addAgent = (a: AgentCard) => {
    setRoster(r => [...r, {
      uid: `${a.type}-${r.length}-${Math.round(performance.now())}`, type: a.type, label: a.label,
      attrs: Object.fromEntries(ATTR_KEYS.map(k => [k, a.defaults[k] ?? 0.5])) as Record<string, number>,
    }]);
    setScenarioId(null);
  };
  const removeAgent = (uid: string) => setRoster(r => r.filter(m => m.uid !== uid));
  const setAttr = (uid: string, key: string, val: number) =>
    setRoster(r => r.map(m => m.uid === uid ? { ...m, attrs: { ...m.attrs, [key]: val } } : m));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const type = e.dataTransfer.getData('text/agent-type');
    const a = catalog?.categories.flatMap(c => c.agents).find(x => x.type === type);
    if (a) addAgent(a);
  };

  const launch = async () => {
    if (roster.length === 0) { setError('Add at least one agent to the roster.'); return; }
    setLaunching(true); setError(null);
    try {
      const population = roster.map(m => ({ agent_type: m.type, confidence: 0.6, ...m.attrs }));
      const res = await causariumApi.createSimulation({
        scenario_name: scenarios.find(s => s.id === scenarioId)?.title ?? 'Custom scenario',
        description: context, run_count: runCount, tick_depth: tickDepth, mode,
        constraint_params: { entropy_rate: entropy, cascade_coefficient: cascade },
        population, lens: lensId, scenario_id: scenarioId ?? undefined,
      });
      onLaunch(res.simulation_id, streamUrl(res.simulation_id), lens);
    } catch (e: any) { setError(e?.message ?? 'Launch failed'); setLaunching(false); }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in min-h-0">
      {/* Header */}
      <div className="px-8 pt-5 pb-3 shrink-0">
        <div className="text-[11px] font-mono uppercase tracking-[0.3em] mb-1" style={{ color: accent }}>Scenario Forge</div>
        <h1 className="font-display text-3xl font-semibold text-white leading-tight">Compose a Reality</h1>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr] gap-4 px-8 pb-3">
        {/* Agent catalogue */}
        <aside className="glass-panel rounded-2xl flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-white/5 shrink-0">
            <div className="text-[11px] font-mono uppercase tracking-widest text-gray-400">Agent Catalogue</div>
            <div className="text-[10px] text-gray-600 font-mono mt-0.5">{catalog?.count ?? 0} archetypes, drag to roster</div>
          </div>
          <div className="scroll-y flex-1 px-3 py-3 space-y-3">
            {catalog?.categories.map(cat => (
              <div key={cat.id}>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5 px-1">{cat.label}</div>
                <div className="space-y-1.5">
                  {cat.agents.map(a => (
                    <div key={a.type} draggable
                      onDragStart={e => e.dataTransfer.setData('text/agent-type', a.type)}
                      onDoubleClick={() => addAgent(a)}
                      className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-[#0A0A0F] border border-[#222] hover:border-[color:var(--h)] transition-colors"
                      style={{ ['--h' as any]: accent }}
                      title={`${a.blurb}. Drag or double click to add.`}>
                      <span style={{ color: accent }}><Icon name={agentTypeIcon(a.type)} size={16} /></span>
                      <div className="min-w-0">
                        <div className="text-xs text-gray-200 truncate">{a.label}</div>
                        <div className="text-[9px] text-gray-600 font-mono truncate">{a.blurb}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main column */}
        <div className="flex flex-col min-h-0 gap-3">
          {/* Scenarios */}
          <section className="shrink-0">
            <Label>Industry Scenarios</Label>
            <div className="scroll-x flex gap-2.5 pb-1.5">
              {scenarios.map(s => {
                const on = scenarioId === s.id;
                return (
                  <button key={s.id} onClick={() => loadScenario(s)}
                    className={`shrink-0 w-52 text-left p-3 rounded-xl border transition-all bg-[#0A0A0F] ${on ? 'border-transparent' : 'border-[#222] hover:border-[#444]'}`}
                    style={on ? { boxShadow: `0 0 0 1px ${s.lens_detail.accent}, 0 0 22px -8px ${s.lens_detail.accent}` } : undefined}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: s.lens_detail.accent }}>{s.industry}</span>
                      <span style={{ color: s.lens_detail.accent }}><Icon name={lensIcon(s.lens)} size={14} /></span>
                    </div>
                    <div className="text-white font-display text-sm mt-1 leading-snug line-clamp-2">{s.title}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1.5 flex items-center gap-1.5">
                      <Icon name="actors" size={11} /> {s.agent_count}
                      <Icon name="clock" size={11} className="ml-1" /> {s.horizon}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Lens */}
          <section className="shrink-0">
            <Label>Analysis Lens <Faint>adapts every view to your question</Faint></Label>
            <div className="grid grid-cols-6 gap-2">
              {lenses.map(l => {
                const on = lensId === l.id;
                return (
                  <button key={l.id} onClick={() => setLensId(l.id)}
                    className={`py-2 rounded-lg border flex flex-col items-center gap-1 transition-all bg-[#0A0A0F] ${on ? 'border-transparent' : 'border-[#222] hover:border-[#444]'}`}
                    style={on ? { boxShadow: `0 0 0 1px ${l.accent}, 0 0 16px -6px ${l.accent}` } : undefined}>
                    <span style={{ color: on ? l.accent : '#9aa0ad' }}><Icon name={lensIcon(l.id)} size={18} /></span>
                    <span className="text-[9px] leading-tight text-center px-1" style={{ color: on ? l.accent : '#9aa0ad' }}>{l.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cast (fills remaining height, internal scroll) */}
          <section className="flex-1 min-h-0 flex flex-col">
            <Label>The Cast <Faint>{roster.length} actors</Faint></Label>
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
              className={`flex-1 min-h-0 rounded-xl border border-dashed p-2.5 transition-colors ${dragOver ? 'drop-active' : 'border-[#333]'}`}>
              {roster.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-sm text-center px-6">
                  Drag agents here, double click a catalogue card, or pick a scenario above.
                </div>
              ) : (
                <div className="scroll-y h-full grid grid-cols-2 xl:grid-cols-3 gap-2 content-start pr-1">
                  {roster.map(m => (
                    <div key={m.uid} className="bg-[#12121A] border border-[#222] rounded-lg p-2.5 animate-rise">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span style={{ color: accent }}><Icon name={agentTypeIcon(m.type)} size={15} /></span>
                          <span className="text-xs text-gray-200 truncate">{m.label}</span>
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
          </section>

          {/* Physics + settings */}
          <section className="shrink-0 grid grid-cols-2 gap-3">
            <div className="glass-panel rounded-xl px-4 py-3 grid grid-cols-2 gap-x-5 gap-y-1">
              <div className="col-span-2"><Label>Reality Physics</Label></div>
              <Slider label="Entropy" value={entropy} min={0} max={1} step={0.05} onChange={setEntropy} accent={accent} />
              <Slider label="Cascade" value={cascade} min={1} max={5} step={0.1} onChange={setCascade} accent={accent} />
            </div>
            <div className="glass-panel rounded-xl px-4 py-3 grid grid-cols-2 gap-x-5 gap-y-1 items-center">
              <div className="col-span-2"><Label>Run Settings</Label></div>
              <Slider label="Timelines" value={runCount} min={4} max={120} step={2} onChange={v => setRunCount(Math.round(v))} accent={accent} fmt={v => `${Math.round(v)}`} />
              <Slider label="Tick depth" value={tickDepth} min={8} max={60} step={1} onChange={v => setTickDepth(Math.round(v))} accent={accent} fmt={v => `${Math.round(v)}`} />
              <div className="col-span-2 flex gap-2 mt-1">
                <ModeChip active={mode === 'heuristic'} onClick={() => setMode('heuristic')} label="Heuristic" sub="fast" />
                <ModeChip active={mode === 'llm'} onClick={() => setMode('llm')} label="LLM Agents" sub="Ollama" />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Launch bar */}
      <div className="px-8 py-3 border-t border-white/5 flex items-center justify-between bg-[#0A0A0F]/60 backdrop-blur shrink-0">
        <div className="text-sm text-gray-500 font-mono truncate">
          {error ? <span className="text-[#FF3366]">{error}</span>
            : <>Lens: <span style={{ color: accent }}>{lens?.label ?? 'None'}</span> · {roster.length} actors · {runCount} timelines{mode === 'llm' ? ' · LLM capped for CPU' : ''}</>}
        </div>
        <button onClick={launch} disabled={launching}
          className="px-7 py-2.5 rounded-lg font-medium text-white transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
          style={{ backgroundColor: accent, boxShadow: `0 0 22px -4px ${accent}` }}>
          {launching ? 'Colliding' : 'Initiate Reality Collision'}<Icon name="launch" size={16} />
        </button>
      </div>
    </div>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-mono uppercase tracking-widest text-gray-400 mb-1.5">{children}</div>
);
const Faint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-gray-600 normal-case tracking-normal">· {children}</span>
);
const Slider: React.FC<{ label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; accent: string; fmt?: (v: number) => string }> =
  ({ label, value, min, max, step, onChange, accent, fmt }) => (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-0.5">
        <span>{label}</span><span style={{ color: accent }}>{fmt ? fmt(value) : value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-[#6C63FF]" />
    </div>
  );
const ModeChip: React.FC<{ active: boolean; onClick: () => void; label: string; sub: string }> = ({ active, onClick, label, sub }) => (
  <button onClick={onClick} className={`flex-1 px-3 py-1.5 rounded-lg border text-left transition-all ${active ? 'border-[#6C63FF] bg-[#6C63FF]/10' : 'border-[#222] hover:border-[#444]'}`}>
    <div className={`text-xs ${active ? 'text-[#6C63FF]' : 'text-gray-300'}`}>{label}</div>
    <div className="text-[9px] text-gray-600 font-mono">{sub}</div>
  </button>
);
