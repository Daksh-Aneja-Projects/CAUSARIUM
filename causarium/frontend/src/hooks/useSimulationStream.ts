import { useState, useEffect } from 'react';

export type StreamEvent = {
  type: 'RUN_STARTED' | 'RUN_COMPLETED' | 'DISCOVERY_STARTED' | 'ATTRACTOR_FOUND' | 'CHOKE_POINT_FOUND' | 'BUTTERFLY_FOUND' | 'SIMULATION_COMPLETE';
  payload: any;
  timestamp: string;
};

export function useSimulationStream(websocketUrl: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!websocketUrl) return;

    // Mocking websocket behavior for the UI demo purposes
    setIsConnected(true);
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      currentProgress += 5;
      if (currentProgress <= 100) {
        setProgress(currentProgress);
        
        const mockEvents: StreamEvent['type'][] = ['RUN_STARTED', 'RUN_COMPLETED', 'ATTRACTOR_FOUND'];
        const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
        
        setEvents(prev => [...prev, {
          type: randomEvent,
          payload: { message: `Event ${randomEvent} occurred` },
          timestamp: new Date().toISOString()
        }]);
      }
      
      if (currentProgress >= 100) {
        setEvents(prev => [...prev, {
          type: 'SIMULATION_COMPLETE',
          payload: { message: 'All runs and discovery complete' },
          timestamp: new Date().toISOString()
        }]);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [websocketUrl]);

  return { events, isConnected, progress };
}
