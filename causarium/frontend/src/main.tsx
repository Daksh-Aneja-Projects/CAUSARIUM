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
        <div className="flex items-center space-x-3 cursor-pointer" onClick={newScenario}>
          <div className="w-6 h-6 rounded-sm rotate-45" style={{ background: `linear-gradient(135deg, ${accent}, #00D9FF)` }} />
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

const Step: React.FC<{ n: string; label: string; active: boolean; accent: string; enabled: boolean; onClick: () => void }> = ({ n, label, active, accent, enabled, onClick }) => (
  <button onClick={onClick} disabled={!enabled}
    className={`flex items-center gap-1.5 transition ${enabled ? 'hover:text-white cursor-pointer' : 'cursor-default'} ${active ? '' : 'text-gray-600'}`}
    style={{ color: active ? accent : undefined }}>
    <span className="opacity-60">{n}</span>{label}
  </button>
);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
