import React, { useEffect, useState } from 'react';
import { causariumApi, SimilarData } from '../services/api';
import { DiscoveryData } from '../types';

export const DiscoveryDashboard: React.FC<{ simulationId: string, onExploreGraph: () => void, onIntervene: () => void, onReport: () => void }> = ({ simulationId, onExploreGraph, onIntervene, onReport }) => {
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [similar, setSimilar] = useState<SimilarData | null>(null);

  useEffect(() => {
    causariumApi.getDiscoveryData(simulationId).then(setData);
    causariumApi.getSimilar(simulationId).then(setSimilar).catch(() => {});
  }, [simulationId]);

  if (!data) return <div className="p-8 text-white font-mono animate-pulse">Loading Discovery Results...</div>;

  return (
    <div className="flex flex-col h-full text-gray-200 p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-light text-white mb-2">Discovery Dashboard</h1>
          <p className="text-gray-400 font-mono text-sm">Simulation ID: {simulationId} | {data.run_count} Timelines Analyzed</p>
        </div>
        <div className="flex space-x-4">
          <ActionBtn label="Intervene" onClick={onIntervene} icon="⚡" />
          <ActionBtn label="Graph Explorer" onClick={onExploreGraph} icon="🕸️" />
          <ActionBtn label="Generate Report" onClick={onReport} icon="📄" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard title="Dominant Attractors" color="#6C63FF">
          {data.attractors.map((a, i) => (
            <div key={i} className="mb-4 bg-[#0A0A0F] p-4 rounded border border-[#222] hover:border-[#6C63FF] transition-colors cursor-pointer group">
              <div className="text-lg text-white mb-1 group-hover:text-[#6C63FF]">{a.label}</div>
              <div className="flex justify-between text-xs text-gray-400 font-mono">
                <span>Convergence: {(a.convergence_rate * 100).toFixed(1)}%</span>
                <span>Tick: {a.earliest_deterministic_tick}</span>
              </div>
            </div>
          ))}
          <div className="text-center text-xs text-[#6C63FF] cursor-pointer hover:underline mt-2">View all attractors &rarr;</div>
        </DashboardCard>

        <DashboardCard title="Temporal Choke Points" color="#00D9FF">
          {data.choke_points.map((c, i) => (
            <div key={i} className="mb-4 bg-[#0A0A0F] p-4 rounded border border-[#222] hover:border-[#00D9FF] transition-colors cursor-pointer group">
              <div className="text-lg text-white mb-1 group-hover:text-[#00D9FF]">Tick {c.tick} Leverage</div>
              <div className="flex justify-between text-xs text-gray-400 font-mono">
                <span>Efficacy: {(c.intervention_efficacy * 100).toFixed(1)}%</span>
                <span>ID: {c.choke_point_id}</span>
              </div>
            </div>
          ))}
          <div className="text-center text-xs text-[#00D9FF] cursor-pointer hover:underline mt-2">View timeline plot &rarr;</div>
        </DashboardCard>

        <DashboardCard title="Reality DNA Profile" color="#FF3366">
          <div className="flex flex-col space-y-3 mt-2">
            {Object.entries(data.reality_dna_distribution).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                  <span className="uppercase">{key}</span>
                  <span>{value.toFixed(2)}</span>
                </div>
                <div className="w-full bg-[#0A0A0F] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#FF3366] h-full" style={{ width: `${value * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {similar && (
        <div className="mt-6">
          <DashboardCard title="Similar Timelines (Reality DNA)" color="#00E5A0">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-3">
              <span>{similar.indexed_runs} runs indexed · vector store: {similar.vector_backend}</span>
              <span>Neo4j: {similar.neo4j.available ? `${similar.neo4j.nodes} nodes` : 'not connected'}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {similar.neighbors.slice(0, 8).map((n, i) => (
                <div key={i} className="bg-[#0A0A0F] p-3 rounded border border-[#222]">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#00E5A0] font-mono text-sm">{(n.similarity * 100).toFixed(1)}%</span>
                    <span className="text-[9px] text-gray-600 font-mono">{n.simulation_id.slice(0, 10)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{n.outcome}</div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      )}
    </div>
  );
};

const DashboardCard: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
  <div className="glass-panel rounded-2xl p-6 flex flex-col shadow-lg transition-all hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(108,99,255,0.15)]">
    <div className="text-sm font-semibold mb-6 uppercase tracking-widest flex items-center" style={{ color }}>
      <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: color }}></div>
      {title}
    </div>
    <div className="flex-1 overflow-y-auto hide-scrollbar">{children}</div>
  </div>
);

const ActionBtn: React.FC<{ label: string; onClick: () => void; icon: string }> = ({ label, onClick, icon }) => (
  <button 
    onClick={onClick}
    className="bg-[#12121A] border border-[#333] hover:border-[#6C63FF] hover:bg-[#1a1a2e] text-white px-4 py-2 rounded font-mono text-sm transition-all flex items-center space-x-2"
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);
