import React, { useEffect, useState } from 'react';
import { causariumApi } from '../services/api';

export const RealityReport: React.FC<{ simulationId: string; onClose: () => void }> = ({ simulationId, onClose }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    causariumApi.generateReport(simulationId)
      .then(r => { revoke = r.download_url; setUrl(r.download_url); })
      .catch(e => setError(e.message));
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [simulationId]);

  return (
    <div className="absolute inset-0 bg-[#0A0A0F]/90 backdrop-blur-md flex items-center justify-center p-8 z-50">
      <div className="bg-white text-black rounded-lg w-full max-w-4xl h-5/6 shadow-2xl flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-2xl font-serif text-gray-900">CAUSARIUM Reality Report</h2>
            <p className="text-sm text-gray-500 mt-1 font-mono uppercase">Simulation: {simulationId}</p>
          </div>
          <div className="flex space-x-4">
            <a
              href={url ?? '#'}
              download={`reality_report_${simulationId}.pdf`}
              className={`px-4 py-2 rounded text-sm transition-colors ${url ? 'bg-[#6C63FF] text-white hover:bg-[#5a52d6]' : 'bg-gray-300 text-gray-500 pointer-events-none'}`}
            >
              Download PDF
            </a>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-2xl leading-none">&times;</button>
          </div>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center text-red-500 font-mono text-sm px-8 text-center">
            Report generation failed: {error}
          </div>
        ) : !url ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 animate-pulse">
            Rendering PDF from discovery results…
          </div>
        ) : (
          <iframe title="Reality Report" src={url} className="flex-1 w-full bg-white" />
        )}
      </div>
    </div>
  );
};
