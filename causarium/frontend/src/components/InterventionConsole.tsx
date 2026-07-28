import React, { useState } from 'react';
import { causariumApi } from '../services/api';

export const InterventionConsole: React.FC<{ simulationId: string; onClose: () => void }> = ({ simulationId, onClose }) => {
  const [tick, setTick] = useState(7);
  const [agentId, setAgentId] = useState('agent-CEO-001');
  const [attribute, setAttribute] = useState('confidence');
  const [newValue, setNewValue] = useState('0.85');
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');

  const handleIntervene = async () => {
    setStatus('running');
    try {
      await causariumApi.triggerIntervention({
        target_run_id: 'run-043',
        pause_at_tick: tick,
        intervention_type: 'AGENT_ATTRIBUTE_INJECTION',
        payload: { agent_id: agentId, attribute, new_value: parseFloat(newValue) },
        run_counterfactual: true
      });
      setTimeout(() => setStatus('done'), 1500); // Simulate processing time
    } catch (e) {
      console.error(e);
      setStatus('idle');
    }
  };

  return (
    <div className="absolute inset-0 bg-[#0A0A0F]/90 backdrop-blur-md flex items-center justify-center p-8 z-50 animate-fade-in">
      <div className="bg-[#12121A] border border-[#333] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">&times;</button>
        
        <div className="p-8 border-b border-[#222]">
          <h2 className="text-2xl font-light text-white mb-2">Intervention Console</h2>
          <p className="text-gray-400 font-mono text-sm">Inject counterfactual variables and observe causal re-routing.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-xs mb-2">Pause at Tick</label>
              <input type="number" value={tick} onChange={e => setTick(parseInt(e.target.value))} className="w-full bg-[#0A0A0F] border border-[#333] rounded p-2 text-white font-mono" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-2">Target Agent</label>
              <input type="text" value={agentId} onChange={e => setAgentId(e.target.value)} className="w-full bg-[#0A0A0F] border border-[#333] rounded p-2 text-white font-mono" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-xs mb-2">Attribute</label>
              <select value={attribute} onChange={e => setAttribute(e.target.value)} className="w-full bg-[#0A0A0F] border border-[#333] rounded p-2 text-white font-mono">
                <option value="confidence">confidence</option>
                <option value="risk_tolerance">risk_tolerance</option>
                <option value="capital">capital</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-2">New Value</label>
              <input type="number" step="0.1" value={newValue} onChange={e => setNewValue(e.target.value)} className="w-full bg-[#0A0A0F] border border-[#333] rounded p-2 text-white font-mono" />
            </div>
          </div>
        </div>

        <div className="p-8 bg-[#0a0a0f] border-t border-[#222] flex justify-between items-center">
          <div className="text-sm font-mono text-[#00D9FF]">
            {status === 'running' && <span className="animate-pulse">Computing Counterfactual Divergence...</span>}
            {status === 'done' && <span className="text-[#6C63FF]">Intervention Applied. Branch created.</span>}
          </div>
          
          <button 
            onClick={handleIntervene}
            disabled={status !== 'idle'}
            className="bg-[#00D9FF] hover:bg-[#00b3d6] text-black px-6 py-2 rounded font-medium transition-all shadow-[0_0_10px_rgba(0,217,255,0.4)] disabled:opacity-50"
          >
            Inject & Branch
          </button>
        </div>
      </div>
    </div>
  );
};
