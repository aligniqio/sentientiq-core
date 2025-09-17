/**
 * SentientIQ Intervention Broadcaster
 * Broadcast Point #2: Processor → Dashboard (/pulse)
 * Real-time intervention decisions via WebSocket
 */

const Redis = require('ioredis');
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');

// Configuration
const config = {
  port: process.env.INTERVENTION_PORT || 3004,
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
  path: '/ws/interventions'
});

// Track dashboard connections
const dashboardConnections = new Map();

// Track intervention statistics
const stats = {
  totalShown: 0,
  totalConverted: 0,
  activeInterventions: new Map(),
  successRate: 0
};

// Connection handler
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  const connectionId = `int_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  console.log(`🎯 Dashboard connected: ${connectionId} from ${clientIp}`);

  // Store connection
  dashboardConnections.set(connectionId, {
    ws,
    connectedAt: Date.now(),
    tenant: null
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    connectionId,
    message: 'Connected to intervention stream',
    timestamp: Date.now()
  }));

  // Send current stats
  ws.send(JSON.stringify({
    type: 'stats',
    stats: {
      totalShown: stats.totalShown,
      totalConverted: stats.totalConverted,
      activeInterventions: stats.activeInterventions.size,
      successRate: stats.successRate
    }
  }));

  // Handle dashboard messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const conn = dashboardConnections.get(connectionId);

      switch(data.type) {
        case 'subscribe':
          // Dashboard can subscribe to specific channel
          if (data.channel === 'interventions') {
            console.log(`🎯 Dashboard ${connectionId} subscribed to interventions`);
          }
          ws.send(JSON.stringify({
            type: 'subscribed',
            channel: 'interventions'
          }));
          break;

        case 'intervention_result':
          // Dashboard reports intervention result (clicked, dismissed, converted)
          handleInterventionResult(data);
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

// Subscribe to Redis intervention decisions channel
redis.subscribe('intervention_decisions', (err, count) => {
  if (err) {
    console.error('Failed to subscribe:', err);
    return;
  }
  console.log(`📡 Subscribed to intervention_decisions channel (${count} subscriptions)`);
});

// Handle intervention decision messages
redis.on('message', (channel, message) => {
  if (channel !== 'intervention_decisions') return;

  try {
    const decision = JSON.parse(message);

    if (config.debug) {
      console.log(`🎯 Intervention Decision: ${decision.interventionType} for ${decision.sessionId}`);
    }

    // Track active intervention
    stats.activeInterventions.set(decision.sessionId, decision);
    stats.totalShown++;

    // Broadcast to all connected dashboards
    broadcastToDashboards({
      type: 'intervention_triggered',
      ...decision
    });

  } catch (error) {
    console.error('Failed to process intervention decision:', error);
  }
});

/**
 * Broadcast intervention to dashboard connections
 */
function broadcastToDashboards(intervention) {
  const message = JSON.stringify(intervention);

  let broadcasted = 0;

  // Send to each dashboard connection
  dashboardConnections.forEach((conn, id) => {
    try {
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
 * Handle intervention result from dashboard or client
 */
function handleInterventionResult(data) {
  const { sessionId, result } = data;

  // Remove from active interventions
  if (stats.activeInterventions.has(sessionId)) {
    stats.activeInterventions.delete(sessionId);

    // Update stats based on result
    if (result === 'converted') {
      stats.totalConverted++;
    }

    // Calculate success rate
    if (stats.totalShown > 0) {
      stats.successRate = (stats.totalConverted / stats.totalShown) * 100;
    }

    // Broadcast updated stats
    broadcastToDashboards({
      type: 'intervention_completed',
      sessionId,
      result,
      stats: {
        totalShown: stats.totalShown,
        totalConverted: stats.totalConverted,
        activeInterventions: stats.activeInterventions.size,
        successRate: stats.successRate
      }
    });

    console.log(`✅ Intervention result: ${result} for ${sessionId}`);
  }
}

// Periodic stats broadcast
setInterval(() => {
  if (dashboardConnections.size > 0) {
    broadcastToDashboards({
      type: 'stats',
      stats: {
        totalShown: stats.totalShown,
        totalConverted: stats.totalConverted,
        activeInterventions: stats.activeInterventions.size,
        successRate: stats.successRate
      }
    });
  }

  if (config.debug) {
    console.log(`📊 Stats - Shown: ${stats.totalShown}, Converted: ${stats.totalConverted}, Active: ${stats.activeInterventions.size}`);
  }
}, 30000); // Every 30 seconds

// Start server
server.listen(config.port, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🎯 INTERVENTION BROADCASTER ACTIVE           ║
╠════════════════════════════════════════════════╣
║   Port: ${config.port}                                 ║
║   WebSocket: ws://0.0.0.0:${config.port}/ws/interventions ║
║   Redis Channel: intervention_decisions       ║
║   Broadcast Point: #2                         ║
╚════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down intervention broadcaster...');

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