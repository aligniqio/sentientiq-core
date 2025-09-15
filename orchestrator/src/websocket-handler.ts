// WebSocket handler for real-time emotion streaming
import { WebSocketServer } from 'ws';
import { Server } from 'http';

interface WSClient {
  ws: any;
  tenant: string;
  connected: number;
}

const wsClients = new Map<string, WSClient>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/emotions'
  });

  console.log('WebSocket server initialized on /ws/emotions');

  wss.on('connection', (ws, req) => {
    const clientId = Date.now().toString();
    const tenant = req.url?.split('?tenant_id=')[1] || 'demo';

    console.log(`WebSocket connected: ${clientId} for tenant: ${tenant}`);

    wsClients.set(clientId, {
      ws,
      tenant,
      connected: Date.now()
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message:', data);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket disconnected: ${clientId}`);
      wsClients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
      wsClients.delete(clientId);
    });
  });

  return wss;
}

// Broadcast emotion to all connected clients
export function broadcastEmotion(emotion: any) {
  const message = JSON.stringify({
    type: 'emotion',
    data: emotion,
    timestamp: new Date().toISOString()
  });

  wsClients.forEach((client, id) => {
    try {
      if (client.ws.readyState === 1) { // WebSocket.OPEN
        client.ws.send(message);
      }
    } catch (error) {
      console.error(`Failed to send to client ${id}:`, error);
      wsClients.delete(id);
    }
  });
}

// Get connected clients count
export function getConnectedClients(): number {
  return wsClients.size;
}

// Broadcast to specific tenant
export function broadcastToTenant(tenant: string, data: any) {
  const message = JSON.stringify({
    type: 'tenant_update',
    data,
    timestamp: new Date().toISOString()
  });

  wsClients.forEach((client, id) => {
    if (client.tenant === tenant) {
      try {
        if (client.ws.readyState === 1) {
          client.ws.send(message);
        }
      } catch (error) {
        console.error(`Failed to send to client ${id}:`, error);
        wsClients.delete(id);
      }
    }
  });
}