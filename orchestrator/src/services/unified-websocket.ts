/**
 * Unified WebSocket Server
 * Single server, multiple channels for different client types
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { Server } from 'http';
import { IncomingMessage } from 'http';

interface Client {
  ws: WebSocket;
  sessionId: string;
  tenantId: string;
  type: string;
  connectedAt?: Date;
}

class UnifiedWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null;
  private channels: {
    emotions: Set<Client>;
    interventions: Map<string, Client>;
    telemetry: Map<string, Client>;
  };

  constructor() {
    super();
    this.wss = null;
    this.channels = {
      emotions: new Set<Client>(),      // Dashboard clients watching emotions
      interventions: new Map<string, Client>(), // Marketing site clients receiving interventions
      telemetry: new Map<string, Client>()      // Bundled script clients (telemetry + interventions in one)
    };
  }

  init(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const channel = url.searchParams.get('channel') || 'interventions';
      const sessionId = url.searchParams.get('session') || `ws_${Date.now()}`;
      const tenantId = url.searchParams.get('tenant_id') || url.searchParams.get('tenant') || 'unknown';

      console.log(`🔌 WebSocket connected: ${channel} channel, session: ${sessionId}`);

      // Route to appropriate channel
      switch(channel) {
        case 'emotions':
          this.handleEmotionClient(ws, sessionId, tenantId);
          break;
        case 'interventions':
          this.handleInterventionClient(ws, sessionId, tenantId);
          break;
        case 'telemetry':
          // Bundled script - handles both telemetry and interventions
          this.handleTelemetryClient(ws, sessionId, tenantId);
          break;
        default:
          ws.close(1008, 'Unknown channel');
      }
    });

    console.log('✅ Unified WebSocket server initialized on /ws');
  }

  private handleEmotionClient(ws: WebSocket, sessionId: string, tenantId: string): void {
    const client = { ws, sessionId, tenantId, type: 'emotions' };
    this.channels.emotions.add(client);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      channel: 'emotions',
      sessionId
    }));

    // Handle disconnect
    ws.on('close', () => {
      console.log(`📊 Emotion client disconnected: ${sessionId}`);
      this.channels.emotions.delete(client);
    });

    ws.on('error', (error: Error) => {
      console.error(`Emotion client error ${sessionId}:`, error);
      this.channels.emotions.delete(client);
    });

    // Keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  private handleInterventionClient(ws: WebSocket, sessionId: string, tenantId: string): void {
    const client = {
      ws,
      sessionId,
      tenantId,
      type: 'interventions',
      connectedAt: new Date()
    };

    this.channels.interventions.set(sessionId, client);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      channel: 'interventions',
      sessionId,
      message: 'Ready to receive interventions'
    }));

    // Handle messages from client
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(sessionId, data);
      } catch (error) {
        console.error('Invalid message from client:', error);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`🎯 Intervention client disconnected: ${sessionId}`);
      this.channels.interventions.delete(sessionId);
    });

    ws.on('error', (error: Error) => {
      console.error(`Intervention client error ${sessionId}:`, error);
      this.channels.interventions.delete(sessionId);
    });

    // Keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  private handleClientMessage(sessionId: string, data: any): void {
    switch(data.type) {
      case 'ping':
        // Check both intervention and telemetry channels
        const interventionClient = this.channels.interventions.get(sessionId);
        const telemetryClient = this.channels.telemetry.get(sessionId);
        const client = interventionClient || telemetryClient;

        if (client) {
          client.ws.send(JSON.stringify({ type: 'pong' }));
        }
        break;

      case 'telemetry':
        // Handle telemetry data from bundled script
        console.log(`📡 Telemetry received via WebSocket: ${data.events?.length || 0} events`);
        this.emit('telemetry_received', {
          sessionId,
          tenantId: data.tenant_id,
          events: data.events
        });
        break;

      case 'intervention_shown':
        console.log(`📊 Intervention shown: ${data.intervention} for ${sessionId}`);
        this.emit('intervention_shown', { sessionId, intervention: data.intervention });
        break;

      case 'intervention_clicked':
        console.log(`🎯 Intervention clicked: ${data.intervention} for ${sessionId}`);
        this.emit('intervention_clicked', { sessionId, intervention: data.intervention });
        break;

      default:
        console.log(`Unknown message type from ${sessionId}: ${data.type}`);
    }
  }

  private handleTelemetryClient(ws: WebSocket, sessionId: string, tenantId: string): void {
    const client = {
      ws,
      sessionId,
      tenantId,
      type: 'telemetry',
      connectedAt: new Date()
    };

    // Store by session ID for intervention delivery
    this.channels.telemetry.set(sessionId, client);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      channel: 'telemetry',
      sessionId
    }));

    // Handle messages from bundled script
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(sessionId, data);
      } catch (error) {
        console.error(`Failed to parse telemetry message from ${sessionId}:`, error);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`📉 Telemetry client disconnected: ${sessionId}`);
      this.channels.telemetry.delete(sessionId);
    });

    ws.on('error', (error: Error) => {
      console.error(`Telemetry client error ${sessionId}:`, error);
      this.channels.telemetry.delete(sessionId);
    });

    // Keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  // Broadcast emotion to all dashboard clients
  broadcastEmotion(emotionData: any): void {
    const message = JSON.stringify({
      type: 'event',
      payload: {
        id: `${emotionData.session_id}_${Date.now()}`,
        ...emotionData,
        timestamp: Date.now()
      }
    });

    let sent = 0;
    this.channels.emotions.forEach(client => {
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(message);
        sent++;
      }
    });

    console.log(`📡 Broadcasted emotion to ${sent} dashboard clients`);
  }

  // Send intervention to specific session
  sendIntervention(sessionId: string, interventionType: string): boolean {
    // Check both channels - telemetry channel handles both telemetry and interventions
    const telemetryClient = this.channels.telemetry.get(sessionId);
    const interventionClient = this.channels.interventions.get(sessionId);
    const client = telemetryClient || interventionClient;

    if (client && client.ws.readyState === client.ws.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'intervention',
        intervention_type: interventionType,
        timestamp: new Date().toISOString()
      }));
      console.log(`🎯 Sent ${interventionType} intervention to ${sessionId} (${client.type} channel)`);
      return true;
    }

    console.log(`⚠️ Client ${sessionId} not connected for intervention`);
    return false;
  }

  // Get connection stats
  getStats() {
    return {
      emotions: this.channels.emotions.size,
      interventions: this.channels.interventions.size,
      total: this.channels.emotions.size + this.channels.interventions.size
    };
  }
}

export const unifiedWS = new UnifiedWebSocketServer();