/**
 * Full-spectrum emotional intelligence subscription
 * Real-time behavioral emotion detection with reliable reconnection
 */

import { useEffect, useState, useRef } from 'react';

interface EmotionalEvent {
  sessionId: string;
  emotion: string;
  confidence: number;
  timestamp: string;
  [key: string]: any;
}

export const useEmotionalSpectrum = (onEvent: (event: EmotionalEvent) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(5000);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  useEffect(() => {
    let mounted = true;

    const connect = () => {
      if (!mounted) return;

      // Don't reconnect if we've hit the limit
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setError('Max reconnection attempts reached');
        setConnectionStatus('Failed - Refresh page');
        return;
      }

      // Clear any existing connection
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }

      const wsUrl = window.location.hostname === 'sentientiq.app'
        ? 'wss://api.sentientiq.app/ws/nats'
        : 'ws://localhost:9222';

      console.log('🔄 Connecting to:', wsUrl);

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;
          console.log('✅ WebSocket connected');
          setIsConnected(true);
          setConnectionStatus('Connected');
          setError(null);

          // Reset reconnect attempts on successful connection
          reconnectAttemptsRef.current = 0;
          reconnectDelayRef.current = 5000;

          // Subscribe to emotions
          ws.send(JSON.stringify({
            type: 'subscribe',
            subject: 'EMOTIONS.state'
          }));

          // Set up heartbeat to keep connection alive
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
              }));
            }
          }, 25000); // Every 25 seconds
        };

        ws.onmessage = (event) => {
          if (!mounted) return;

          try {
            const message = JSON.parse(event.data);

            if (message.type === 'subscribed') {
              setConnectionStatus('Live');
              console.log('📡 Subscribed successfully');
            }

            if (message.type === 'heartbeat') {
              // Heartbeat received, connection is healthy
              return;
            }

            if (message.type === 'message' && message.data) {
              const emotion = message.data as EmotionalEvent;
              console.log(`🎭 ${emotion.emotion} (${emotion.confidence}%)`);
              onEvent(emotion);
            }
          } catch (err) {
            console.error('Parse error:', err);
          }
        };

        ws.onerror = () => {
          if (!mounted) return;
          console.log('❌ WebSocket error');
          setIsConnected(false);
          setConnectionStatus('Error');
        };

        ws.onclose = () => {
          if (!mounted) return;
          console.log('🔌 WebSocket closed');
          setIsConnected(false);
          setConnectionStatus('Disconnected');
          wsRef.current = null;

          // Clear heartbeat
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }

          // Exponential backoff reconnection
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectAttemptsRef.current++;
          const delay = Math.min(reconnectDelayRef.current * Math.pow(1.5, reconnectAttemptsRef.current - 1), 60000);

          console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mounted) {
              connect();
            }
          }, delay);
        };

      } catch (error) {
        console.error('Connection failed:', error);
        setConnectionStatus('Failed');

        // Retry after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mounted) connect();
        }, 5000);
      }
    };

    // Initial connection
    connect();

    // Cleanup
    return () => {
      mounted = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [onEvent]);

  return {
    isConnected,
    connectionStatus,
    error
  };
};