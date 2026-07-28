import React, { useEffect, useMemo } from 'react';
import { useSimulationStream } from '../hooks/useSimulationStream';
import { causariumApi, Lens } from '../services/api';
import { RealityCollider } from './RealityCollider';
import { Icon } from './Icon';

export const SimulationMonitor: React.FC<{ simulationId: string; wsUrl: string; lens: Lens | null; onComplete: () => void }> = ({ simulationId, wsUrl, lens, onComplete }) => {
  const { events, isConnected, progress, status, currentRun, outcomes, complete, paused } = useSimulationStream(wsUrl);
  const running = !complete && status !== 'FAILED';
  const accent = lens?.accent ?? '#6C63FF';

  // Strip the emoji icon before handing the lens to the canvas HUD (no emoji in UI).
  const canvasLens = useMemo(() => (lens ? { ...lens, icon: '' } : null), [lens]);

  useEffect(() => {
    if (complete) { const t = setTimeout(onComplete, 1600); return () => clearTimeout(t); }
  }, [complete, onComplete]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Hero canvas owns the left HUD (lens label, status, particle count) + outcome tally */}
      <RealityCollider events={events} status={status} progress={progress} outcomes={outcomes} running={running} paused={paused} lens={canvasLens} />

      {/* Right chrome: progress + status + controls (no overlap with the left HUD) */}
      <div className="absolute top-5 right-6 flex flex-col items-end gap-3 pointer-events-none">
        <div className="text-right">
          <div className="font-display text-5xl font-semibold text-white tabular-nums leading-none">{progress}%</div>
          <div className="text-gray-500 font-mono text-[11px] mt-1">
            {isConnected ? 'CONNECTED' : 'CONNECTING'} · {status} · Timeline {currentRun}
          </div>
        </div>

        {running && status !== 'DISCOVERY' && (
          <div className="flex items-center gap-2 pointer-events-auto">
            {!paused
              ? <Ctl onClick={() => causariumApi.pause(simulationId)} color="#FFB800" icon="pause" label="Pause" />
              : <Ctl onClick={() => causariumApi.resume(simulationId)} color="#00E5A0" icon="play" label="Resume" />}
            <Ctl onClick={() => causariumApi.inject(simulationId, { kind: 'SHOCK', shock: 'INJECTED_CRISIS' })} color="#FF3366" icon="inject" label="Inject shock" />
            <Ctl onClick={() => causariumApi.inject(simulationId, { kind: 'CONSTRAINT', param: 'cooperation_incentive', value: 1.8 })} color="#6C63FF" icon="cooperation" label="Boost co-op" />
          </div>
        )}
        {paused && <span className="text-[10px] font-mono text-[#FFB800] animate-pulse">Paused. Inject, then resume.</span>}
      </div>

      {/* Event stream (contained scroll, fixed height, own corner) */}
      <div className="absolute bottom-6 right-6 w-[360px] max-w-[42vw] glass-panel rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-white/5 text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Icon name="dot" size={10} color={accent} /> Event Stream
        </div>
        <div className="scroll-y h-44 px-3 py-2 font-mono text-[11px] flex flex-col-reverse">
          <div>
            {events.slice(-120).map((ev, i) => (
              <div key={i} className="mb-1 leading-snug">
                <span className="text-gray-600 mr-2">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                <span className={ev.raw?.black_swan ? 'text-[#FF3366]' : ev.type === 'agent_decision' ? 'text-gray-300' : 'text-gray-500'}>{ev.message}</span>
              </div>
            ))}
            {events.length === 0 && <div className="text-gray-600 italic">Awaiting reality collision</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const Ctl: React.FC<{ onClick: () => void; color: string; icon: any; label: string }> = ({ onClick, color, icon, label }) => (
  <button onClick={onClick} title={label}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition hover:bg-white/5"
    style={{ borderColor: color, color }}>
    <Icon name={icon} size={14} /> {label}
  </button>
);
