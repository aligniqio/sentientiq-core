/**
 * Unified WebSocket Server
 * Single server, multiple channels for different client types
 */

import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

class UnifiedWebSocketServer extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.channels = {
      emotions: new Set(),      // Dashboard clients watching emotions
      interventions: new Map()  // Marketing site clients receiving interventions
    };
  }

  init(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const channel = url.searchParams.get('channel') || 'interventions';
      const sessionId = url.searchParams.get('session') || `ws_${Date.now()}`;
      const tenantId = url.searchParams.get('tenant') || 'unknown';

      console.log(`🔌 WebSocket connected: ${channel} channel, session: ${sessionId}`);

      // Route to appropriate channel
      switch(channel) {
        case 'emotions':
          this.handleEmotionClient(ws, sessionId, tenantId);
          break;
        case 'interventions':
          this.handleInterventionClient(ws, sessionId, tenantId);
          break;
        default:
          ws.close(1008, 'Unknown channel');
      }
    });

    console.log('✅ Unified WebSocket server initialized on /ws');
  }

  handleEmotionClient(ws, sessionId, tenantId) {
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

    ws.on('error', (error) => {
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

  handleInterventionClient(ws, sessionId, tenantId) {
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
    ws.on('message', (message) => {
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

    ws.on('error', (error) => {
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

  handleClientMessage(sessionId, data) {
    switch(data.type) {
      case 'ping':
        const client = this.channels.interventions.get(sessionId);
        if (client) {
          client.ws.send(JSON.stringify({ type: 'pong' }));
        }
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

  // Broadcast emotion to all dashboard clients
  broadcastEmotion(emotionData) {
    const message = JSON.stringify({
      type: 'emotion',
      ...emotionData,
      timestamp: new Date().toISOString()
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
  sendIntervention(sessionId, interventionType) {
    const client = this.channels.interventions.get(sessionId);

    if (client && client.ws.readyState === client.ws.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'intervention',
        intervention: interventionType,
        timestamp: new Date().toISOString()
      }));
      console.log(`🎯 Sent ${interventionType} intervention to ${sessionId}`);
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