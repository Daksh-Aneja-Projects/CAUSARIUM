import React, { useState } from 'react';
import { causariumApi, streamUrl } from '../services/api';

export const ScenarioComposer: React.FC<{ onLaunch: (id: string, wsUrl: string) => void }> = ({ onLaunch }) => {
  const [context, setContext] = useState('We are a $2B US SaaS company planning to enter the German enterprise market...');
  const [runCount, setRunCount] = useState(20);
  const [entropy, setEntropy] = useState(30);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLaunch = async () => {
    setIsLaunching(true);
    setError(null);
    try {
      const res = await causariumApi.createSimulation({
        scenario_name: 'Reality Collision',
        description: context,
        run_count: runCount,
        tick_depth: 25,
        mode: 'heuristic',
        constraint_params: { entropy_rate: entropy / 100 },
      });
      onLaunch(res.simulation_id, streamUrl(res.simulation_id));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to launch simulation');
      console.error(e);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-gray-200 p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-light text-white mb-2">Scenario Composer</h1>
        <p className="text-gray-400">Define your initial conditions, actors, and parameters.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(108,99,255,0.1)]">
        <label className="block text-[#00D9FF] text-sm font-semibold mb-2 uppercase tracking-wider">Context & Parameters</label>
        <textarea 
          className="w-full bg-[#0A0A0F] border border-[#333] rounded-lg p-4 text-gray-300 focus:outline-none focus:border-[#6C63FF] transition-colors resize-none h-32"
          value={context}
          onChange={e => setContext(e.target.value)}
        />
        
        <div className="mt-6 flex space-x-6">
          <div className="flex-1">
            <label className="block text-gray-400 text-xs mb-1">Parallel Runs</label>
            <input
              type="range" min="4" max="120" step="2"
              value={runCount} onChange={e => setRunCount(parseInt(e.target.value))}
              className="w-full accent-[#6C63FF]"
            />
            <div className="text-right text-sm text-[#00D9FF]">{runCount} runs</div>
          </div>
          <div className="flex-1">
            <label className="block text-gray-400 text-xs mb-1">Entropy Rate</label>
            <input
              type="range" min="0" max="100"
              value={entropy} onChange={e => setEntropy(parseInt(e.target.value))}
              className="w-full accent-[#6C63FF]"
            />
            <div className="text-right text-sm text-[#00D9FF]">{(entropy / 100).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(108,99,255,0.1)]">
        <label className="block text-[#6C63FF] text-sm font-semibold mb-4 uppercase tracking-wider">Agent Roster</label>
        <div className="grid grid-cols-3 gap-4">
          <AgentCard type="EXECUTIVE_CEO" persona="Growth-focused, high risk tolerance" />
          <AgentCard type="REGULATOR_INTERNATIONAL" persona="GDPR-strict, conservative" />
          <div className="border border-dashed border-[#333] rounded-lg flex items-center justify-center text-gray-500 hover:text-[#00D9FF] hover:border-[#00D9FF] transition-colors cursor-pointer p-4">
            + Add Agent
          </div>
        </div>
      </div>

      {error && (
        <div className="text-[#FF3366] text-sm font-mono bg-[#FF3366]/10 border border-[#FF3366]/30 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={handleLaunch}
          disabled={isLaunching}
          className="bg-[#6C63FF] hover:bg-[#5a52d6] text-white px-8 py-3 rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(108,99,255,0.4)] hover:shadow-[0_0_25px_rgba(108,99,255,0.6)] disabled:opacity-50 flex items-center"
        >
          {isLaunching ? 'Initializing...' : 'Initiate Reality Collision'}
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </button>
      </div>
    </div>
  );
};

const AgentCard: React.FC<{ type: string; persona: string }> = ({ type, persona }) => (
  <div className="glass-panel p-6 rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(108,99,255,0.1)]">
    <div className="text-xs text-[#00D9FF] font-mono mb-1">{type}</div>
    <div className="text-sm text-gray-300">{persona}</div>
  </div>
);
