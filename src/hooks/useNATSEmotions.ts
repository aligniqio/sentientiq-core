/**
 * NATS JetStream Hook for Emotional Events
 * Reliable, persistent event streaming that actually works
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { connect, NatsConnection, StringCodec, JSONCodec, JetStreamClient } from 'nats.ws';

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

interface NATSConfig {
  servers: string[];
  streamName: string;
  subject: string;
  consumerName: string;
}

export const useNATSEmotions = (onEvent: (event: EmotionalEvent) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [error, setError] = useState<string | null>(null);
  const ncRef = useRef<NatsConnection | null>(null);
  const jsRef = useRef<JetStreamClient | null>(null);

  // Use SSL proxy for production, direct connection for local dev
  const isProduction = window.location.hostname === 'sentientiq.app';
  const wsUrl = isProduction
    ? 'wss://api.sentientiq.app/ws/nats'  // SSL proxy through nginx
    : 'ws://localhost:9222';               // Direct connection for local dev

  const config: NATSConfig = {
    servers: [wsUrl],
    streamName: 'EMOTIONAL_EVENTS',
    subject: 'emotions.events',
    consumerName: `dashboard-${Date.now()}` // Unique consumer per session
  };

  const connectToNATS = useCallback(async () => {
    try {
      setConnectionStatus('Connecting...');

      // Connect to NATS
      const nc = await connect({
        servers: config.servers,
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 1000,
        timeout: 5000
      });

      ncRef.current = nc;
      console.log('✅ Connected to NATS');
      setIsConnected(true);
      setConnectionStatus('Connected');

      // Skip JetStream entirely - just use regular NATS pub/sub
      // This avoids replaying old messages from the stream
      console.log('Using direct NATS subscription (no replay)');

      // Subscribe directly to the subject for NEW messages only
      const sub = nc.subscribe(config.subject);

      setConnectionStatus('Live');
      console.log('📡 Subscribed to emotional events');

      // Process messages
      (async () => {
        for await (const msg of sub) {
          try {
            const jc = JSONCodec();
            const event = jc.decode(msg.data) as EmotionalEvent;
            console.log('🎯 Emotional event:', event);

            // Pass to handler
            onEvent(event);

          } catch (err) {
            console.error('Error processing message:', err);
          }
        }
      })();

      // Monitor connection status
      (async () => {
        for await (const status of nc.status()) {
          console.log(`NATS connection status: ${status.type}`);
          // Only show user-friendly status
          if (status.type === 'pingTimer') {
            // Skip internal ping timer status
            continue;
          }
          const friendlyStatus = status.type === 'disconnect' ? 'Reconnecting...' : 'Connected';
          setConnectionStatus(friendlyStatus);

          if (status.type === 'disconnect' || status.type === 'error') {
            setIsConnected(false);
            setError(status.data?.toString() || 'Connection lost');
          } else if (status.type === 'reconnect') {
            setIsConnected(true);
            setError(null);
          }
        }
      })();

    } catch (err) {
      console.error('Failed to connect to NATS:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
      setConnectionStatus('Failed to connect');

      // Retry connection after 5 seconds
      setTimeout(connectToNATS, 5000);
    }
  }, [onEvent]);

  useEffect(() => {
    connectToNATS();

    return () => {
      if (ncRef.current) {
        ncRef.current.close();
        ncRef.current = null;
        jsRef.current = null;
      }
    };
  }, [connectToNATS]);

  return {
    isConnected,
    connectionStatus,
    error
  };
};