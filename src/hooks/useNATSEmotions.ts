/**
 * NATS WebSocket Bridge Hook for Emotional Events
 * Connects to NATS via WebSocket bridge for browser compatibility
 */

import { useEffect, useState, useRef, useCallback } from 'react';

interface EmotionalEvent {
  sessionId: string;
  tenantId?: string;
  emotion: string;
  confidence: number;
  intensity?: number;
  frustration?: number;
  anxiety?: number;
  urgency?: number;
  excitement?: number;
  trust?: number;
  pageUrl?: string;
  sessionAge?: number;
  timestamp: string;
}

export const useNATSEmotions = (onEvent: (event: EmotionalEvent) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Use SSL proxy for production, direct connection for local dev
  const isProduction = window.location.hostname === 'sentientiq.app';
  const wsUrl = isProduction
    ? 'wss://api.sentientiq.app/ws/nats'  // SSL proxy through nginx
    : 'ws://localhost:9222';               // Direct connection for local dev

  const connectToNATS = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      console.log('⏳ Connection already in progress...');
      return;
    }

    try {
      setConnectionStatus('Connecting...');
      setError(null);

      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Reconnecting');
        wsRef.current = null;
      }

      // Create WebSocket connection to bridge
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to NATS bridge');
        setIsConnected(true);
        setConnectionStatus('Connected');

        // Subscribe to emotion events
        ws.send(JSON.stringify({
          type: 'subscribe',
          subject: 'EMOTIONS.state'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'connected') {
            console.log('🔌 Bridge connection confirmed');
          }

          if (message.type === 'subscribed') {
            setConnectionStatus('Live');
            console.log('📡 Subscribed to:', message.subject);
          }

          if (message.type === 'message' && message.data) {
            const emotionEvent = message.data as EmotionalEvent;
            console.log('🎭 Emotion received:', emotionEvent.emotion, `${emotionEvent.confidence}%`);

            // Add timestamp if missing
            if (!emotionEvent.timestamp) {
              emotionEvent.timestamp = new Date().toISOString();
            }

            // Pass to handler
            onEvent(emotionEvent);
          }

          if (message.type === 'error') {
            console.error('❌ Bridge error:', message.error);
            setError(message.error);
          }

        } catch (err) {
          console.error('Error processing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('Connection error');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        wsRef.current = null;

        // Only reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          setTimeout(() => {
            console.log('🔄 Attempting reconnection...');
            connectToNATS();
          }, 3000);
        }
      };

    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
      setConnectionStatus('Failed');

      // Retry after delay
      setTimeout(() => connectToNATS(), 5000);
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