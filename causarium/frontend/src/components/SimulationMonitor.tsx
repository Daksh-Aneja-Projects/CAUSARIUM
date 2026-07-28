import React, { useEffect } from 'react';
import { useSimulationStream } from '../hooks/useSimulationStream';

export const SimulationMonitor: React.FC<{ simulationId: string; wsUrl: string; onComplete: () => void }> = ({ simulationId, wsUrl, onComplete }) => {
  const { events, isConnected, progress } = useSimulationStream(wsUrl);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <div className="flex flex-col h-full text-gray-200 p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-3xl font-light text-white mb-2 flex items-center">
          Simulation Running
          <span className="ml-4 flex space-x-1">
            <span className="w-2 h-2 bg-[#00D9FF] rounded-full animate-ping"></span>
          </span>
        </h1>
        <p className="text-gray-400 font-mono text-sm">ID: {simulationId} | Status: {isConnected ? 'CONNECTED' : 'CONNECTING...'}</p>
      </div>

      <div className="glass-panel p-8 rounded-2xl shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#222]">
          <div className="h-full bg-gradient-to-r from-[#6C63FF] to-[#00D9FF] transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="flex justify-between items-end mb-6 mt-2">
          <div className="text-6xl font-light text-white">{progress}%</div>
          <div className="text-[#00D9FF] font-mono uppercase tracking-widest text-sm animate-pulse">Running Futures</div>
        </div>

        <div className="h-64 bg-[#0A0A0F] border border-[#333] rounded-lg p-4 font-mono text-xs overflow-y-auto flex flex-col-reverse">
          {events.map((ev, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-[#1a1a24] last:border-0">
              <span className="text-[#6C63FF] mr-3">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>
              <span className={ev.type.includes('FOUND') ? 'text-[#00D9FF]' : 'text-gray-400'}>{ev.type}</span>
              <span className="text-gray-500 ml-2">— {ev.payload?.message || 'Processing...'}</span>
            </div>
          ))}
          {events.length === 0 && <div className="text-gray-600 italic">Initializing event stream...</div>}
        </div>
      </div>
      
      <div className="text-center text-gray-500 text-sm">
        Simulating interactions across parallel universes. Please wait.
      </div>
    </div>
  );
};
