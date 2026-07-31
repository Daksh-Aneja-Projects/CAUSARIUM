import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Studio } from './components/ScenarioComposer';
import { DiscoveryDashboard } from './components/DiscoveryDashboard';
import { InterventionConsole } from './components/InterventionConsole';
import { RealityReport } from './components/RealityReport';
import { Lens } from './services/api';

const App = () => {
  const [view, setView] = useState<'studio' | 'discover'>('studio');
  const [simulationId, setSimulationId] = useState<string>('');
  const [lens, setLens] = useState<Lens | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [showIntervention, setShowIntervention] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const accent = lens?.accent ?? '#6C63FF';

  const newScenario = () => { setSimulationId(''); setLens(null); setView('studio'); setResetKey(k => k + 1); };

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0F] font-sans overflow-hidden">
      <nav className="border-b border-white/5 bg-[#0A0A0F]/70 backdrop-blur py-3 px-6 flex justify-between items-center z-30 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={newScenario}>
          <CausalMark accent={accent} />
          <span className="text-white font-display font-semibold tracking-[0.3em] uppercase text-sm">Causarium</span>
        </div>
        <div className="flex items-center gap-5 text-xs font-mono uppercase tracking-widest">
          <Step n="01" label="Ask & Simulate" active={view === 'studio'} accent={accent} onClick={() => setView('studio')} enabled />
          <Step n="02" label="Discover" active={view === 'discover'} accent={accent} onClick={() => simulationId && setView('discover')} enabled={!!simulationId} />
          <button onClick={newScenario} className="ml-2 px-3 py-1.5 rounded-md border border-[#333] text-gray-400 hover:text-white hover:border-[#555] transition tracking-normal normal-case">New question</button>
        </div>
      </nav>

      <main className="flex-1 min-h-0 relative">
        {view === 'studio' && (
          <Studio key={resetKey} onComplete={(id, l) => { setSimulationId(id); setLens(l); setView('discover'); }} />
        )}
        {view === 'discover' && (
          <DiscoveryDashboard simulationId={simulationId} lens={lens} onIntervene={() => setShowIntervention(true)} onReport={() => setShowReport(true)} />
        )}
      </main>

      {showIntervention && <InterventionConsole simulationId={simulationId} onClose={() => setShowIntervention(false)} />}
      {showReport && <RealityReport simulationId={simulationId} lens={lens} onClose={() => setShowReport(false)} />}
    </div>
  );
};

// A small, live causal glyph: three nodes, connecting links, one pulse orbiting them.
const CausalMark: React.FC<{ accent: string }> = ({ accent }) => (
  <svg width="26" height="22" viewBox="0 0 28 24" fill="none" className="shrink-0" aria-hidden>
    <line x1="4" y1="7" x2="23" y2="5" stroke={accent} strokeOpacity="0.28" strokeWidth="1" />
    <line x1="23" y1="5" x2="14" y2="20" stroke={accent} strokeOpacity="0.28" strokeWidth="1" />
    <line x1="14" y1="20" x2="4" y2="7" stroke={accent} strokeOpacity="0.28" strokeWidth="1" />
    <circle cx="4" cy="7" r="2.1" fill={accent} fillOpacity="0.55" />
    <circle cx="23" cy="5" r="2.1" fill="#00D9FF" fillOpacity="0.55" />
    <circle cx="14" cy="20" r="2.1" fill={accent} fillOpacity="0.55" />
    <circle className="causal-pulse" cx="0" cy="0" r="1.7" fill="#fff" style={{ filter: `drop-shadow(0 0 4px ${accent})` }} />
  </svg>
);

const Step: React.FC<{ n: string; label: string; active: boolean; accent: string; enabled: boolean; onClick: () => void }> = ({ n, label, active, accent, enabled, onClick }) => (
  <button onClick={onClick} disabled={!enabled}
    className={`flex items-center gap-1.5 transition ${enabled ? 'hover:text-white cursor-pointer' : 'cursor-default'} ${active ? '' : 'text-gray-600'}`}
    style={{ color: active ? accent : undefined }}>
    <span className="opacity-60">{n}</span>{label}
  </button>
);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
