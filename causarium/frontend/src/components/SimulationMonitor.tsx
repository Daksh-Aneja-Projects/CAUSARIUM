import React, { useEffect } from 'react';
import { useSimulationStream } from '../hooks/useSimulationStream';
import { causariumApi, Lens } from '../services/api';
import { RealityCollider } from './RealityCollider';

const OUTCOME_COLORS: Record<string, string> = {
  SYSTEMIC_COLLAPSE: '#FF3366', CONFLICT_ESCALATION: '#FF7A45', MONOPOLY_CAPTURE: '#FFB800',
  DISRUPTIVE_INNOVATION: '#B36CFF', STABLE_COOPERATION: '#00E5A0', FRAGMENTED_STALEMATE: '#00D9FF',
};

export const SimulationMonitor: React.FC<{ simulationId: string; wsUrl: string; lens: Lens | null; onComplete: () => void }> = ({ simulationId, wsUrl, lens, onComplete }) => {
  const { events, isConnected, progress, status, currentRun, outcomes, complete, paused } = useSimulationStream(wsUrl);
  const running = !complete && status !== 'FAILED';
  const accent = lens?.accent ?? '#6C63FF';
  const vocab = (o: string) => lens?.outcome_vocab?.[o] ?? o;

  useEffect(() => {
    if (complete) { const t = setTimeout(onComplete, 1600); return () => clearTimeout(t); }
  }, [complete, onComplete]);

  return (
    <div className="absolute inset-0">
      {/* Hero canvas */}
      <RealityCollider events={events} status={status} progress={progress} outcomes={outcomes} running={running} paused={paused} lens={lens} />

      {/* Top status bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-6 pointer-events-none">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white flex items-center gap-3">
            {status === 'DISCOVERY' ? 'Extracting Causality' : 'Reality Collider'}
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: accent }} />
          </h1>
          <p className="text-gray-500 font-mono text-xs mt-1">
            {simulationId} · {isConnected ? 'CONNECTED' : 'CONNECTING'} · {status} · Timeline {currentRun}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-5xl font-semibold text-white tabular-nums">{progress}%</div>
        </div>
      </div>

      {/* Live controls */}
      {running && status !== 'DISCOVERY' && (
        <div className="absolute top-24 left-6 flex flex-wrap items-center gap-2 pointer-events-auto">
          {!paused ? (
            <Ctl onClick={() => causariumApi.pause(simulationId)} color="#FFB800">⏸ Pause</Ctl>
          ) : (
            <Ctl onClick={() => causariumApi.resume(simulationId)} color="#00E5A0">▶ Resume</Ctl>
          )}
          <Ctl onClick={() => causariumApi.inject(simulationId, { kind: 'SHOCK', shock: 'INJECTED_CRISIS' })} color="#FF3366">💉 Inject Shock</Ctl>
          <Ctl onClick={() => causariumApi.inject(simulationId, { kind: 'CONSTRAINT', param: 'cooperation_incentive', value: 1.8 })} color="#6C63FF">🤝 Boost Cooperation</Ctl>
          {paused && <span className="text-[10px] font-mono text-[#FFB800] animate-pulse ml-1">PAUSED — inject, then resume</span>}
        </div>
      )}

      {/* Event log (scrolls internally) */}
      <div className="absolute bottom-6 right-6 w-[380px] max-w-[46vw] glass-panel rounded-xl overflow-hidden pointer-events-auto">
        <div className="px-3 py-2 border-b border-white/5 text-[10px] font-mono uppercase tracking-widest text-gray-500">Event Stream</div>
        <div className="scroll-y h-48 px-3 py-2 font-mono text-[11px] flex flex-col-reverse">
          <div>
            {events.slice(-120).map((ev, i) => (
              <div key={i} className="mb-1 leading-snug">
                <span className="text-gray-600 mr-2">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>
                <span className={ev.raw?.black_swan ? 'text-[#FF3366]' : ev.type === 'agent_decision' ? 'text-gray-300' : 'text-gray-500'}>{ev.message}</span>
              </div>
            ))}
            {events.length === 0 && <div className="text-gray-600 italic">Awaiting reality collision…</div>}
          </div>
        </div>
      </div>

      {/* Outcome tally */}
      {Object.keys(outcomes).length > 0 && (
        <div className="absolute bottom-6 left-6 flex flex-wrap gap-1.5 max-w-[40vw] pointer-events-none">
          {Object.entries(outcomes).map(([o, n]) => (
            <span key={o} className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#0A0A0F]/80 border" style={{ borderColor: `${OUTCOME_COLORS[o] ?? accent}55`, color: OUTCOME_COLORS[o] ?? accent }}>
              {vocab(o)} ×{n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const Ctl: React.FC<{ onClick: () => void; color: string; children: React.ReactNode }> = ({ onClick, color, children }) => (
  <button onClick={onClick} className="px-3 py-1 rounded text-xs font-mono border transition hover:bg-white/5"
    style={{ borderColor: color, color }}>{children}</button>
);
