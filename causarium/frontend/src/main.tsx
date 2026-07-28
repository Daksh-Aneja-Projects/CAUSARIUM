import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ScenarioComposer } from './components/ScenarioComposer';
import { SimulationMonitor } from './components/SimulationMonitor';
import { DiscoveryDashboard } from './components/DiscoveryDashboard';
import { InterventionConsole } from './components/InterventionConsole';
import { RealityReport } from './components/RealityReport';
import { Lens } from './services/api';

const App = () => {
  const [view, setView] = useState<'composer' | 'monitor' | 'dashboard'>('composer');
  const [simulationId, setSimulationId] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [lens, setLens] = useState<Lens | null>(null);

  const [showIntervention, setShowIntervention] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const handleLaunch = (id: string, url: string, chosenLens: Lens | null) => {
    setSimulationId(id);
    setWsUrl(url);
    setLens(chosenLens);
    setView('monitor');
  };

  const accent = lens?.accent ?? '#6C63FF';

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0F] font-sans overflow-hidden">
      <nav className="border-b border-white/5 bg-[#0A0A0F]/70 backdrop-blur py-3 px-6 flex justify-between items-center z-30 shrink-0">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('composer')}>
          <div className="w-6 h-6 rounded-sm rotate-45" style={{ background: `linear-gradient(135deg, ${accent}, #00D9FF)` }} />
          <span className="text-white font-display font-semibold tracking-[0.3em] uppercase text-sm">Causarium</span>
        </div>
        <div className="flex space-x-6 text-xs font-mono uppercase tracking-widest text-gray-600">
          <Step n="01" label="Compose" active={view === 'composer'} accent={accent} />
          <Step n="02" label="Collide" active={view === 'monitor'} accent={accent} />
          <Step n="03" label="Discover" active={view === 'dashboard'} accent={accent} />
        </div>
      </nav>

      <main className="flex-1 min-h-0 relative">
        {view === 'composer' && <ScenarioComposer onLaunch={handleLaunch} />}
        {view === 'monitor' && (
          <SimulationMonitor simulationId={simulationId} wsUrl={wsUrl} lens={lens} onComplete={() => setView('dashboard')} />
        )}
        {view === 'dashboard' && (
          <DiscoveryDashboard
            simulationId={simulationId}
            lens={lens}
            onIntervene={() => setShowIntervention(true)}
            onReport={() => setShowReport(true)}
          />
        )}
      </main>

      {showIntervention && <InterventionConsole simulationId={simulationId} onClose={() => setShowIntervention(false)} />}
      {showReport && <RealityReport simulationId={simulationId} onClose={() => setShowReport(false)} />}
    </div>
  );
};

const Step: React.FC<{ n: string; label: string; active: boolean; accent: string }> = ({ n, label, active, accent }) => (
  <span className="flex items-center gap-1.5" style={{ color: active ? accent : undefined }}>
    <span className="opacity-60">{n}</span>{label}
  </span>
);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
