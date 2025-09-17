/**
 * NATS JetStream Hook for Intervention Events
 * Reliable, persistent intervention streaming
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { connect, NatsConnection, StringCodec, JSONCodec, JetStreamClient, RetentionPolicy, StorageType, DiscardPolicy } from 'nats.ws';

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

interface NATSConfig {
  servers: string[];
  streamName: string;
  subject: string;
  consumerName: string;
}

export const useNATSInterventions = (onEvent: (event: InterventionEvent) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
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
    streamName: 'INTERVENTION_EVENTS',
    subject: 'interventions.events',
    consumerName: `dashboard-interventions-${Date.now()}` // Unique consumer per session
  };

  const connectToNATS = useCallback(async () => {
    try {
      setConnectionStatus('Connecting to NATS...');

      // Connect to NATS
      const nc = await connect({
        servers: config.servers,
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 1000,
        timeout: 5000
      });

      ncRef.current = nc;
      console.log('✅ Connected to NATS (Interventions)');
      setIsConnected(true);
      setConnectionStatus('Connected to NATS');

      // Get JetStream context
      const js = nc.jetstream();
      jsRef.current = js;
      console.log('✅ JetStream initialized (Interventions)');

      // Create ephemeral consumer for this dashboard session
      const jsm = await nc.jetstreamManager();

      // Check if stream exists, create if not
      try {
        await jsm.streams.info(config.streamName);
      } catch (err) {
        console.log('Creating INTERVENTION_EVENTS stream...');
        await jsm.streams.add({
          name: config.streamName,
          subjects: [config.subject],
          retention: RetentionPolicy.Limits,
          max_msgs: 100000,
          max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
          storage: StorageType.Memory,
          discard: DiscardPolicy.Old
        });
      }

      // Subscribe to intervention events
      // @ts-ignore - NATS.ws API requires options but works with undefined
      const sub = await js.subscribe(config.subject, undefined);

      setConnectionStatus('Subscribed to intervention events');
      console.log('📡 Subscribed to intervention events');

      // Process messages
      (async () => {
        for await (const msg of sub) {
          try {
            const jc = JSONCodec();
            const event = jc.decode(msg.data) as InterventionEvent;
            console.log('🎯 Intervention event:', event);

            // Acknowledge the message
            msg.ack();

            // Pass to handler
            onEvent(event);

          } catch (err) {
            console.error('Error processing intervention message:', err);
            msg.nak(); // Negative acknowledge for retry
          }
        }
      })();

      // Monitor connection status
      (async () => {
        for await (const status of nc.status()) {
          console.log(`NATS connection status (Interventions): ${status.type}`);
          setConnectionStatus(`NATS: ${status.type}`);

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
      console.error('Failed to connect to NATS (Interventions):', err);
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