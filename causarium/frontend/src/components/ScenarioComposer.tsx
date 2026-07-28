import React, { useEffect, useMemo, useState } from 'react';
import { causariumApi, streamUrl, Lens, SynthesizedScenario } from '../services/api';
import { useSimulationStream } from '../hooks/useSimulationStream';
import { Icon, agentTypeIcon } from './Icon';
import { AmbientField } from './AmbientField';
import { RealityCollider } from './RealityCollider';

const EXAMPLES = [
  'Who will win the next UK general election?',
  'Who wins the 2026 FIFA World Cup?',
  'Will the Fed cut rates and how does the market react?',
  'Who takes the next IPL title?',
];

/**
 * Studio - the single page where you ASK and WATCH. Top: the question. Left: the
 * actors CAUSARIUM reasons for that question (auto, no manual catalogue). Right:
 * the live reality field that comes alive when you Simulate. On completion it
 * hands off to Discover.
 */
export const Studio: React.FC<{ onComplete: (id: string, lens: Lens | null) => void }> = ({ onComplete }) => {
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [prompt, setPrompt] = useState('');
  const [scenario, setScenario] = useState<SynthesizedScenario | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(40);
  const [mode, setMode] = useState<'heuristic' | 'llm'>('heuristic');
  const [simId, setSimId] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');

  const stream = useSimulationStream(wsUrl || null);

  useEffect(() => { causariumApi.getScenarios().then(d => setLenses(d.lenses)).catch(() => {}); }, []);
  const lens = useMemo(() => lenses.find(l => l.id === (scenario?.lens_id ?? '')) ?? null, [lenses, scenario]);
  const accent = lens?.accent ?? '#6C63FF';

  // hand off to Discover when the run finishes
  useEffect(() => {
    if (stream.complete && simId) { const t = setTimeout(() => onComplete(simId, lens), 1400); return () => clearTimeout(t); }
  }, [stream.complete, simId]);

  const design = async (q: string) => {
    const question = q.trim(); if (!question) return;
    setSynthesizing(true); setError(null); setPrompt(question); setScenario(null); setSimId(''); setWsUrl('');
    try { setScenario(await causariumApi.synthesize(question)); }
    catch (e: any) { setError(e?.message ?? 'Could not reason a scenario'); }
    finally { setSynthesizing(false); }
  };

  const simulate = async () => {
    if (!scenario) return;
    setLaunching(true); setError(null);
    try {
      const population = scenario.population.map((p: any) => ({
        agent_type: p.agent_type, confidence: 0.6,
        risk_tolerance: p.risk_tolerance ?? 0.5, ethics_threshold: p.ethics_threshold ?? 0.5,
        influence: p.influence ?? 0.5, capital: p.capital ?? 1.5,
      }));
      const res = await causariumApi.createSimulation({
        scenario_name: scenario.title, description: scenario.context,
        run_count: runCount, tick_depth: 25, mode,
        constraint_params: { entropy_rate: scenario.constraint_params.entropy_rate ?? 0.35, cascade_coefficient: scenario.constraint_params.cascade_coefficient ?? 2.0 },
        population, lens: scenario.lens_id,
        contenders: scenario.contenders?.length ? scenario.contenders : undefined, prompt: scenario.prompt,
      });
      setSimId(res.simulation_id); setWsUrl(streamUrl(res.simulation_id));
    } catch (e: any) { setError(e?.message ?? 'Launch failed'); }
    finally { setLaunching(false); }
  };

  const contenders = scenario?.contenders ?? [];
  const simulating = !!simId && !stream.complete;

  return (
    <div className="h-full flex flex-col min-h-0 animate-fade-in relative">
      <AmbientField accent={accent} className="opacity-20 pointer-events-none" energetic={synthesizing} />

      {/* Prompt (top) */}
      <div className="px-8 pt-4 pb-3 shrink-0 relative z-10">
        <div className="text-[11px] font-mono uppercase tracking-[0.3em] mb-1.5" style={{ color: accent }}>Ask the future</div>
        <div className="relative">
          <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') design(prompt); }}
            placeholder="Ask anything: who wins the election, the World Cup, the market move, the merger..."
            className="w-full bg-[#0A0A0F] border border-[#333] rounded-xl pl-11 pr-32 py-3 text-white text-[15px] font-display focus:outline-none focus:border-[color:var(--h)] transition-colors" style={{ ['--h' as any]: accent }} />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Icon name="search" size={18} /></span>
          <button onClick={() => design(prompt)} disabled={synthesizing || !prompt.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-40 flex items-center gap-2" style={{ backgroundColor: accent, boxShadow: `0 0 18px -6px ${accent}` }}>
            {synthesizing ? 'Reasoning...' : <>Reason <Icon name="launch" size={14} /></>}
          </button>
        </div>
        {!scenario && !synthesizing && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLES.map(ex => <button key={ex} onClick={() => design(ex)} className="text-[10px] font-mono px-2 py-1 rounded-full border border-[#222] text-gray-500 hover:text-gray-300 hover:border-[#444] transition">{ex}</button>)}
          </div>
        )}
      </div>

      {/* Studio body: agents (left) + live field (right) */}
      <div className="flex-1 min-h-0 grid grid-cols-[300px_minmax(0,1fr)] gap-4 px-8 pb-4 relative z-10">
        {/* LEFT - reasoned actors */}
        <aside className="glass-panel rounded-2xl flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-white/5 shrink-0">
            <div className="text-[11px] font-mono uppercase tracking-widest text-gray-400">Reasoned actors</div>
            <div className="text-[10px] text-gray-600 font-mono mt-0.5 truncate">{scenario?.title || 'Ask a question to begin'}</div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
            {!scenario ? (
              <div className="text-gray-600 text-xs text-center px-3 py-8">{synthesizing ? 'Reasoning the actors and forces...' : 'CAUSARIUM will identify the actors and possible outcomes for your question.'}</div>
            ) : (
              <>
                {contenders.length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-1.5 px-1">Possible outcomes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {contenders.map(c => <span key={c} className="text-[11px] px-2 py-1 rounded-md border" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}0f` }}>{c}</span>)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-1.5 mt-2 px-1">Actors & forces</div>
                  <div className="space-y-1.5">
                    {scenario.population.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#0A0A0F] border border-[#222]" title={a.role}>
                        <span className="shrink-0" style={{ color: accent }}><Icon name={agentTypeIcon(a.agent_type)} size={14} /></span>
                        <span className="text-xs text-gray-200 truncate">{a.agent_type}</span>
                        {a.contender && <span className="ml-auto text-[8px] font-mono px-1 rounded shrink-0" style={{ color: accent, background: `${accent}18` }}>outcome</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          {/* settings + simulate */}
          <div className="px-4 py-3 border-t border-white/5 shrink-0 space-y-2.5">
            <label className="text-[10px] font-mono text-gray-400 flex items-center justify-between">Timelines
              <span className="flex items-center gap-2"><input type="range" min={10} max={120} step={2} value={runCount} onChange={e => setRunCount(parseInt(e.target.value))} className="w-24 accent-[#6C63FF]" /><span style={{ color: accent }}>{runCount}</span></span>
            </label>
            <div className="flex gap-1">
              {(['heuristic', 'llm'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} className={`flex-1 text-[10px] font-mono py-1 rounded border transition ${mode === m ? 'text-white border-[color:var(--h)]' : 'text-gray-500 border-[#222] hover:border-[#444]'}`} style={{ ['--h' as any]: accent }}>{m === 'llm' ? 'LLM agents' : 'Fast'}</button>
              ))}
            </div>
            {simulating ? (
              <div className="flex items-center gap-2">
                {!stream.paused
                  ? <button onClick={() => causariumApi.pause(simId)} className="flex-1 text-xs font-mono py-2 rounded border border-[#FFB800] text-[#FFB800] flex items-center justify-center gap-1.5"><Icon name="pause" size={13} />Pause</button>
                  : <button onClick={() => causariumApi.resume(simId)} className="flex-1 text-xs font-mono py-2 rounded border border-[#00E5A0] text-[#00E5A0] flex items-center justify-center gap-1.5"><Icon name="play" size={13} />Resume</button>}
                <button onClick={() => causariumApi.inject(simId, { kind: 'SHOCK', shock: 'INJECTED_CRISIS' })} className="flex-1 text-xs font-mono py-2 rounded border border-[#FF3366] text-[#FF3366] flex items-center justify-center gap-1.5"><Icon name="inject" size={13} />Shock</button>
              </div>
            ) : (
              <button onClick={simulate} disabled={!scenario || launching}
                className="w-full py-2.5 rounded-xl font-medium text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2" style={{ backgroundColor: accent, boxShadow: `0 0 22px -6px ${accent}` }}>
                {launching ? 'Starting...' : 'Simulate futures'}<Icon name="launch" size={15} />
              </button>
            )}
            {error && <div className="text-[#FF3366] text-[11px] font-mono">{error}</div>}
          </div>
        </aside>

        {/* RIGHT - live field */}
        <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#0A0A0F] min-h-0">
          {simId ? (
            <RealityCollider events={stream.events} status={stream.status} progress={stream.progress} outcomes={stream.outcomes} running={!stream.complete} paused={stream.paused} lens={lens} />
          ) : (
            <>
              <AmbientField accent={accent} energetic={synthesizing} />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pointer-events-none">
                {synthesizing ? (
                  <><div className="text-white font-display text-xl animate-pulse">Reasoning the futures</div><div className="text-gray-400 text-sm mt-1">Mapping the actors, forces, and possible outcomes...</div></>
                ) : scenario ? (
                  <><div className="text-white font-display text-xl">Ready to collide</div><div className="text-gray-400 text-sm mt-1">Press Simulate to run {runCount} parallel timelines and watch the futures form.</div></>
                ) : (
                  <><div className="text-gray-300 font-display text-lg">Ask a question to begin</div><div className="text-gray-500 text-sm mt-1">CAUSARIUM reasons the actors, then simulates thousands of futures live here.</div></>
                )}
              </div>
            </>
          )}
          {simId && (
            <div className="absolute top-4 right-5 text-right pointer-events-none">
              <div className="font-display text-4xl font-semibold text-white tabular-nums">{stream.progress}%</div>
              <div className="text-gray-500 font-mono text-[10px] mt-0.5">{stream.status} · timeline {stream.currentRun}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
