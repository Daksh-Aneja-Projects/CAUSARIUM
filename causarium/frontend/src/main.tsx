import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ScenarioComposer } from './components/ScenarioComposer';
import { SimulationMonitor } from './components/SimulationMonitor';
import { DiscoveryDashboard } from './components/DiscoveryDashboard';
import { InterventionConsole } from './components/InterventionConsole';
import { RealityGraphExplorer } from './components/RealityGraphExplorer';
import { RealityReport } from './components/RealityReport';

const App = () => {
  const [view, setView] = useState<'composer' | 'monitor' | 'dashboard'>('composer');
  const [simulationId, setSimulationId] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  
  const [showGraph, setShowGraph] = useState(false);
  const [showIntervention, setShowIntervention] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const handleLaunch = (id: string, url: string) => {
    setSimulationId(id);
    setWsUrl(url);
    setView('monitor');
  };

  const handleSimulationComplete = () => {
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] font-sans selection:bg-[#6C63FF]/30">
      <nav className="border-b border-[#222] bg-[#12121A] py-3 px-6 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('composer')}>
          <div className="w-6 h-6 bg-gradient-to-tr from-[#6C63FF] to-[#00D9FF] rounded-sm transform rotate-45"></div>
          <span className="text-white font-mono tracking-widest uppercase text-sm">Causarium</span>
        </div>
        <div className="flex space-x-6 text-sm font-mono text-gray-500">
          <span className={view === 'composer' ? 'text-[#00D9FF]' : ''}>1. Compose</span>
          <span className={view === 'monitor' ? 'text-[#00D9FF]' : ''}>2. Simulate</span>
          <span className={view === 'dashboard' ? 'text-[#00D9FF]' : ''}>3. Discover</span>
        </div>
      </nav>

      <main className="h-[calc(100vh-53px)] overflow-y-auto">
        {view === 'composer' && <ScenarioComposer onLaunch={handleLaunch} />}
        {view === 'monitor' && <SimulationMonitor simulationId={simulationId} wsUrl={wsUrl} onComplete={handleSimulationComplete} />}
        {view === 'dashboard' && (
          <DiscoveryDashboard 
            simulationId={simulationId} 
            onExploreGraph={() => setShowGraph(true)}
            onIntervene={() => setShowIntervention(true)}
            onReport={() => setShowReport(true)}
          />
        )}
      </main>

      {/* Overlays */}
      {showGraph && <RealityGraphExplorer simulationId={simulationId} onClose={() => setShowGraph(false)} />}
      {showIntervention && <InterventionConsole simulationId={simulationId} onClose={() => setShowIntervention(false)} />}
      {showReport && <RealityReport simulationId={simulationId} onClose={() => setShowReport(false)} />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
