/**
 * WebSocket Manager
 * Handles real-time intervention delivery to connected clients
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

interface WSClient {
  ws: WebSocket;
  sessionId: string;
  tenantId: string;
  connectedAt: Date;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();

  /**
   * Initialize WebSocket server
   */
  init(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('🔌 New WebSocket connection');

      // Get session ID from query params
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('session') || `ws_${Date.now()}`;
      const tenantId = url.searchParams.get('tenant') || 'unknown';

      // Store client
      const client: WSClient = {
        ws,
        sessionId,
        tenantId,
        connectedAt: new Date()
      };

      this.clients.set(sessionId, client);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        message: 'SentientIQ WebSocket connected'
      }));

      // Handle messages from client
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(sessionId, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        console.log(`🔌 WebSocket disconnected: ${sessionId}`);
        this.clients.delete(sessionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for ${sessionId}:`, error);
        this.clients.delete(sessionId);
      });

      // Ping to keep alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    });

    console.log('✅ WebSocket server initialized');
  }

  /**
   * Handle messages from client
   */
  private handleClientMessage(sessionId: string, data: any) {
    switch (data.type) {
      case 'ping':
        this.sendToSession(sessionId, { type: 'pong' });
        break;

      case 'intervention_shown':
        console.log(`📊 Intervention shown: ${data.intervention} for ${sessionId}`);
        break;

      case 'intervention_clicked':
        console.log(`🎯 Intervention clicked: ${data.intervention} for ${sessionId}`);
        break;

      default:
        console.log(`Unknown message type: ${data.type}`);
    }
  }

  /**
   * Send message to specific session
   */
  sendToSession(sessionId: string, data: any): boolean {
    const client = this.clients.get(sessionId);

    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
      return true;
    }

    return false;
  }

  /**
   * Send to all clients of a tenant
   */
  broadcastToTenant(tenantId: string, data: any) {
    let sent = 0;

    for (const client of this.clients.values()) {
      if (client.tenantId === tenantId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
        sent++;
      }
    }

    return sent;
  }

  /**
   * Get connected clients count
   */
  getStats() {
    const tenantCounts: Record<string, number> = {};

    for (const client of this.clients.values()) {
      tenantCounts[client.tenantId] = (tenantCounts[client.tenantId] || 0) + 1;
    }

    return {
      total: this.clients.size,
      byTenant: tenantCounts
    };
  }

  /**
   * Clean up old connections
   */
  cleanup() {
    const now = Date.now();

    for (const [sessionId, client] of this.clients.entries()) {
      // Remove dead connections
      if (client.ws.readyState !== WebSocket.OPEN) {
        this.clients.delete(sessionId);
        continue;
      }

      // Close connections older than 1 hour
      const age = now - client.connectedAt.getTime();
      if (age > 3600000) {
        client.ws.close(1000, 'Connection timeout');
        this.clients.delete(sessionId);
      }
    }
  }
}

// Export singleton
export const wsManager = new WebSocketManager();

// Cleanup every 5 minutes
setInterval(() => {
  wsManager.cleanup();
}, 300000);