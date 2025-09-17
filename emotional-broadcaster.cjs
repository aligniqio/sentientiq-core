/**
 * SentientIQ Emotional States Broadcaster
 * Broadcast Point #1: Processor → Dashboard (/pulse)
 * Real-time emotional stream via WebSocket
 */

const Redis = require('ioredis');
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');

// Configuration
const config = {
  port: process.env.BROADCAST_PORT || 3003,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  debug: process.env.DEBUG === 'true'
};

// Initialize Redis subscriber
const redis = new Redis(config.redisUrl);
redis.on('connect', () => console.log('✅ Redis connected for subscription'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// Express app for health checks
const app = express();
app.use(cors({ origin: config.corsOrigin }));

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    connections: wss ? wss.clients.size : 0,
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server for dashboard connections
const wss = new WebSocket.Server({
  server,
  path: '/ws/emotions' // Clear path for dashboard to connect
});

// Track dashboard connections
const dashboardConnections = new Map();

// Connection handler
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  const connectionId = `dash_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  console.log(`📊 Dashboard connected: ${connectionId} from ${clientIp}`);

  // Store connection
  dashboardConnections.set(connectionId, {
    ws,
    connectedAt: Date.now(),
    tenant: null,
    filter: null
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    connectionId,
    message: 'Connected to emotional states stream',
    timestamp: Date.now()
  }));

  // Handle dashboard messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const conn = dashboardConnections.get(connectionId);

      switch(data.type) {
        case 'subscribe':
          // Dashboard can subscribe with filters
          if (data.tenant) {
            conn.tenant = data.tenant;
            console.log(`📊 Dashboard ${connectionId} subscribed to tenant: ${data.tenant}`);
          }
          if (data.filter) {
            conn.filter = data.filter; // e.g., only certain emotions
          }
          ws.send(JSON.stringify({
            type: 'subscribed',
            tenant: conn.tenant,
            filter: conn.filter
          }));
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`👋 Dashboard disconnected: ${connectionId}`);
    dashboardConnections.delete(connectionId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
  });
});

// Subscribe to Redis emotional states channel
redis.subscribe('emotional_states', (err, count) => {
  if (err) {
    console.error('Failed to subscribe:', err);
    return;
  }
  console.log(`📡 Subscribed to emotional_states channel (${count} subscriptions)`);
});

// Handle emotional state messages
redis.on('message', (channel, message) => {
  if (channel !== 'emotional_states') return;

  try {
    const emotionalState = JSON.parse(message);

    if (config.debug) {
      console.log(`🧠 Emotional State: ${emotionalState.emotion} (${emotionalState.confidence}%) - Session: ${emotionalState.sessionId}`);
    }

    // Broadcast to all connected dashboards
    broadcastToDashboards(emotionalState);

  } catch (error) {
    console.error('Failed to process emotional state:', error);
  }
});

/**
 * Broadcast emotional state to dashboard connections
 */
function broadcastToDashboards(emotionalState) {
  const message = JSON.stringify({
    type: 'emotional_state',
    data: {
      sessionId: emotionalState.sessionId,
      tenantId: emotionalState.tenantId,
      emotion: emotionalState.emotion,
      confidence: emotionalState.confidence,
      intensity: emotionalState.intensity || emotionalState.confidence,
      vectors: {
        frustration: emotionalState.frustration || 0,
        anxiety: emotionalState.anxiety || 0,
        urgency: emotionalState.urgency || 0,
        excitement: emotionalState.excitement || 0,
        trust: emotionalState.trust || 0
      },
      pageUrl: emotionalState.pageUrl,
      sessionAge: emotionalState.sessionAge,
      timestamp: emotionalState.timestamp || new Date().toISOString()
    }
  });

  let broadcasted = 0;

  // Send to each dashboard connection
  dashboardConnections.forEach((conn, id) => {
    try {
      // Apply tenant filter if set
      if (conn.tenant && conn.tenant !== emotionalState.tenantId) {
        return;
      }

      // Apply emotion filter if set
      if (conn.filter && !matchesFilter(emotionalState, conn.filter)) {
        return;
      }

      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(message);
        broadcasted++;
      }
    } catch (error) {
      console.error(`Failed to send to dashboard ${id}:`, error);
    }
  });

  if (config.debug && broadcasted > 0) {
    console.log(`📤 Broadcasted to ${broadcasted} dashboard(s)`);
  }
}

/**
 * Check if emotional state matches filter
 */
function matchesFilter(state, filter) {
  if (!filter) return true;

  // Filter can be an array of emotions or an object with criteria
  if (Array.isArray(filter)) {
    return filter.includes(state.emotion);
  }

  if (typeof filter === 'object') {
    // Check minimum confidence
    if (filter.minConfidence && state.confidence < filter.minConfidence) {
      return false;
    }

    // Check specific emotions
    if (filter.emotions && !filter.emotions.includes(state.emotion)) {
      return false;
    }

    // Check priority emotions (rage, abandonment, etc.)
    if (filter.priorityOnly) {
      const priorityEmotions = ['rage', 'abandonment_intent', 'exit_risk', 'cart_shock'];
      if (!priorityEmotions.includes(state.emotion)) {
        return false;
      }
    }
  }

  return true;
}

// Periodic stats
setInterval(() => {
  const stats = {
    dashboards: dashboardConnections.size,
    connections: Array.from(dashboardConnections.entries()).map(([id, conn]) => ({
      id,
      tenant: conn.tenant,
      connected: new Date(conn.connectedAt).toISOString(),
      alive: conn.ws.readyState === WebSocket.OPEN
    }))
  };

  if (config.debug && stats.dashboards > 0) {
    console.log('📊 Dashboard connections:', stats.dashboards);
  }
}, 30000); // Every 30 seconds

// Start server
server.listen(config.port, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   📡 EMOTIONAL BROADCASTER ACTIVE              ║
╠════════════════════════════════════════════════╣
║   Port: ${config.port}                                 ║
║   WebSocket: ws://0.0.0.0:${config.port}/ws/emotions   ║
║   Redis Channel: emotional_states              ║
║   Dashboard Path: /pulse                       ║
╚════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down emotional broadcaster...');

  // Close all dashboard connections
  dashboardConnections.forEach((conn) => {
    conn.ws.send(JSON.stringify({
      type: 'shutdown',
      message: 'Server shutting down'
    }));
    conn.ws.close();
  });

  await redis.quit();
  server.close();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});