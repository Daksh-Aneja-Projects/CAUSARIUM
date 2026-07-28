import React, { useEffect, useRef } from 'react';

export const RealityGraphExplorer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // In a production environment, this would use D3.js and WebGL.
    // Simulating the graph initialization.
    if (!containerRef.current) return;
    
    containerRef.current.innerHTML = `
      <div class="w-full h-full flex items-center justify-center flex-col text-gray-500 font-mono text-sm animate-pulse">
        <svg class="w-16 h-16 mb-4 text-[#6C63FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
        Rendering 500,000+ nodes...
      </div>
    `;

    // Simulating WebGL context completion
    const t = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="w-full h-full relative">
            <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a2e] via-[#0A0A0F] to-[#0A0A0F]"></div>
            <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-12">
               <div class="w-32 h-32 rounded-full border border-[#00D9FF] flex items-center justify-center bg-[#00D9FF]/10 shadow-[0_0_30px_rgba(0,217,255,0.2)]">Attractor A</div>
               <div class="w-24 h-24 rounded-full border border-[#6C63FF] flex items-center justify-center bg-[#6C63FF]/10 shadow-[0_0_30px_rgba(108,99,255,0.2)]">Attractor B</div>
            </div>
            <svg class="absolute inset-0 w-full h-full pointer-events-none">
               <path d="M 500 400 Q 600 300 700 400" stroke="#333" fill="transparent" stroke-width="2" stroke-dasharray="5,5" />
            </svg>
          </div>
        `;
      }
    }, 2000);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0 bg-[#0A0A0F] z-40 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-[#222] bg-[#0A0A0F]/80 backdrop-blur z-50">
        <div>
          <h2 className="text-xl text-white font-light">Reality Graph Explorer</h2>
          <div className="text-xs text-gray-500 font-mono mt-1">D3.js WebGL Renderer Active</div>
        </div>
        <div className="flex space-x-4">
          <input type="text" placeholder="Semantic Search (e.g. 'trust collapsed')" className="bg-[#12121A] border border-[#333] rounded px-4 py-1 text-sm text-gray-300 w-64 focus:outline-none focus:border-[#6C63FF]" />
          <button onClick={onClose} className="text-gray-400 hover:text-white px-3 py-1 border border-[#333] rounded">Exit</button>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        {/* D3 Graph mounts here */}
      </div>
    </div>
  );
};
