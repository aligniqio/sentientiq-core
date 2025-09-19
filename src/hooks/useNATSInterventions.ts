/**
 * NATS JetStream Hook for Intervention Events
 * Reliable, persistent intervention streaming
 */

import { useEffect, useState, useRef, useCallback } from 'react';

interface InterventionEvent {
  id: string;
  sessionId: string;
  interventionType: string;
  emotion?: string;
  confidence?: number;
  priority?: string;
  timing?: string;
  reason?: string;
  timestamp: string;
}


export const useNATSInterventions = (onEvent: (event: InterventionEvent) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Use SSL proxy for production, direct connection for local dev
  const isProduction = window.location.hostname === 'sentientiq.app';
  const wsUrl = isProduction
    ? 'wss://api.sentientiq.app/ws/interventions'  // Dedicated interventions endpoint
    : 'ws://localhost:3004/ws/interventions';       // Direct connection to intervention service

  const connectToNATS = useCallback(() => {
    try {
      setConnectionStatus('Connecting...');
      setError(null);

      // Dashboard connects as a monitor, not a specific session
      const sessionId = 'dashboard-monitor';
      const urlWithParams = `${wsUrl}?session=${sessionId}&monitor=true`;
      const ws = new WebSocket(urlWithParams);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to WebSocket bridge (Interventions)');
        setIsConnected(true);
        setConnectionStatus('Connected');

        // Subscribe to intervention events
        ws.send(JSON.stringify({
          type: 'subscribe',
          subject: 'interventions.events'
        }));

        console.log('📡 Subscribed to intervention events');
        setConnectionStatus('Subscribed to intervention events');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'message' && message.data) {
            console.log('🎯 Intervention event:', message.data);

            // Pass to handler
            onEvent(message.data as InterventionEvent);
          } else if (message.type === 'subscribed') {
            console.log('✅ Subscription confirmed:', message.subject);
          }
        } catch (err) {
          console.error('Error processing intervention message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error (Interventions):', error);
        setError('Connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed (Interventions)');
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        setError('Connection closed');

        // Retry connection after 5 seconds
        setTimeout(connectToNATS, 5000);
      };

    } catch (err) {
      console.error('Failed to connect to WebSocket (Interventions):', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
      setConnectionStatus('Failed to connect');

      // Retry connection after 5 seconds
      setTimeout(connectToNATS, 5000);
    }
  }, [wsUrl, onEvent]);

  useEffect(() => {
    connectToNATS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectToNATS]);

  return {
    isConnected,
    connectionStatus,
    error
  };
};