import React, { useEffect, useState } from 'react';
import { causariumApi, CounterfactualResult, RosterActor } from '../services/api';

export const InterventionConsole: React.FC<{ simulationId: string; onClose: () => void }> = ({ simulationId, onClose }) => {
  const [roster, setRoster] = useState<RosterActor[]>([]);
  const [agentIndex, setAgentIndex] = useState(0);
  const [attribute, setAttribute] = useState('risk_tolerance');
  const [newValue, setNewValue] = useState('0.2');
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<CounterfactualResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The actors are whoever CAUSARIUM reasoned for this question - never a fixed list.
  useEffect(() => {
    causariumApi.getSimulationStatus(simulationId)
      .then(s => setRoster(s?.roster ?? []))
      .catch(() => setRoster([]));
  }, [simulationId]);

  const handleIntervene = async () => {
    setStatus('running');
    setError(null);
    try {
      const res = await causariumApi.triggerIntervention(simulationId, {
        agent_index: agentIndex,
        attribute,
        value: parseFloat(newValue),
      });
      setResult(res);
      setStatus('done');
    } catch (e: any) {
      setError(e?.message ?? 'Intervention failed');
      setStatus('idle');
    }
  };

  return (
    <div className="absolute inset-0 bg-[#0A0A0F]/90 backdrop-blur-md flex items-center justify-center p-8 z-50 animate-fade-in">
      <div className="bg-[#12121A] border border-[#333] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white z-10">&times;</button>

        <div className="p-8 border-b border-[#222]">
          <h2 className="text-2xl font-light text-white mb-2">Intervention Console</h2>
          <p className="text-gray-400 font-mono text-sm">Override an actor and re-run the futures to measure causal divergence.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-xs mb-2">Target Actor</label>
              <select value={agentIndex} onChange={e => setAgentIndex(parseInt(e.target.value))}
                disabled={!roster.length}
                className="w-full bg-[#0A0A0F] border border-[#333] rounded p-2 text-white font-mono disabled:opacity-50">
                {roster.length
                  ? roster.map(a => <option key={a.index} value={a.index}>{a.name}{a.contender ? ' (outcome)' : ''}</option>)
                  : <option value={0}>Loading actors...</option>}
              </select>
              {roster[agentIndex]?.role && <div className="text-[10px] text-gray-500 mt-1.5">{roster[agentIndex].role}</div>}
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-2">Attribute</label>
              <select value={attribute} onChange={e => setAttribute(e.target.value)}
                className="w-full bg-[#0A0A0F] border border-[#333] rounded p-2 text-white font-mono">
                <option value="risk_tolerance">risk_tolerance</option>
                <option value="ethics_threshold">ethics_threshold</option>
                <option value="influence">influence</option>
                <option value="capital">capital</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-2">New Value: <span className="text-[#00D9FF]">{newValue}</span></label>
            <input type="range" min="0" max="3" step="0.05" value={newValue}
              onChange={e => setNewValue(e.target.value)} className="w-full accent-[#00D9FF]" />
          </div>

          {error && <div className="text-[#FF3366] text-sm font-mono">{error}</div>}

          {result && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-light text-white">{(result.divergence_score * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-400">outcome divergence over {result.runs_compared} re-run timelines</div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <OutcomeBars title="Baseline" dist={result.baseline_outcomes} color="#6C63FF" />
                <OutcomeBars title="Counterfactual" dist={result.counterfactual_outcomes} color="#00D9FF" />
              </div>

              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Reality DNA shift</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {Object.entries(result.dna_delta)
                    .filter(([, v]) => Math.abs(v) >= 0.01)
                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                    .slice(0, 8)
                    .map(([dim, v]) => (
                      <div key={dim} className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">{dim.replace(/_/g, ' ')}</span>
                        <span className={v > 0 ? 'text-[#00E5A0]' : 'text-[#FF3366]'}>
                          {v > 0 ? '+' : ''}{v.toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-[#0a0a0f] border-t border-[#222] flex justify-between items-center sticky bottom-0">
          <div className="text-sm font-mono text-[#00D9FF]">
            {status === 'running' && <span className="animate-pulse">Computing counterfactual divergence...</span>}
            {status === 'done' && <span className="text-[#6C63FF]">Counterfactual complete.</span>}
          </div>
          <button onClick={handleIntervene} disabled={status === 'running'}
            className="bg-[#00D9FF] hover:bg-[#00b3d6] text-black px-6 py-2 rounded font-medium transition-all shadow-[0_0_10px_rgba(0,217,255,0.4)] disabled:opacity-50">
            {status === 'running' ? 'Running…' : 'Inject & Re-run'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Outcomes are either a reasoned contender name or an engine enum - never show the enum raw.
const readable = (o: string) =>
  /^[A-Z0-9_]+$/.test(o) ? o.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : o;

const OutcomeBars: React.FC<{ title: string; dist: Record<string, number>; color: string }> = ({ title, dist, color }) => (
  <div>
    <div className="text-xs uppercase tracking-wider mb-2" style={{ color }}>{title}</div>
    <div className="space-y-2">
      {Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([outcome, p]) => (
        <div key={outcome}>
          <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-0.5">
            <span>{readable(outcome)}</span><span>{(p * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-[#0A0A0F] h-1.5 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${p * 100}%`, backgroundColor: color }}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
