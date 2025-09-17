/**
 * SentientIQ Telemetry Gateway
 * Purpose: Receive telemetry, queue it, move on
 * Zero processing - just fast ingestion
 */

const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const WebSocket = require('ws');
const http = require('http');

// Configuration
const config = {
  port: process.env.GATEWAY_PORT || 3002,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  debug: process.env.DEBUG === 'true'
};

// Redis client
const redis = new Redis(config.redisUrl);

// Express app
const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    connections: wss.clients.size
  });
});

// Stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const streamLength = await redis.xlen('telemetry:raw');
    res.json({
      queue_length: streamLength,
      active_connections: wss.clients.size,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HTTP endpoint for telemetry (fallback)
app.post('/api/telemetry', async (req, res) => {
  try {
    const batch = req.body;

    if (!batch.session_id || !batch.events) {
      return res.status(400).json({ error: 'Invalid batch format' });
    }

    // Add to Redis stream
    const id = await redis.xadd(
      'telemetry:raw',
      '*',
      'session', batch.session_id,
      'tenant', batch.tenant_id || 'unknown',
      'timestamp', Date.now().toString(),
      'events', JSON.stringify(batch.events)
    );

    if (config.debug) {
      console.log(`[HTTP] Queued batch ${id} - ${batch.events.length} events`);
    }

    res.json({ success: true, id: id });
  } catch (error) {
    console.error('[HTTP] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Track active sessions
const sessions = new Map();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  let sessionId = null;

  console.log(`[WS] New connection from ${clientIp}`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // Handle different message types
      switch(data.type) {
        case 'init':
          sessionId = data.session_id;
          sessions.set(sessionId, {
            ws: ws,
            tenant: data.tenant_id,
            started: Date.now(),
            events: 0
          });
          ws.send(JSON.stringify({ type: 'init_ack', session_id: sessionId }));
          break;

        case 'telemetry':
          const batch = data.batch || data; // Handle both formats
          if (!batch.events) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid batch' }));
            return;
          }

          // Add to Redis stream
          const id = await redis.xadd(
            'telemetry:raw',
            '*',
            'session', batch.session_id || sessionId || 'unknown',
            'tenant', batch.tenant_id || 'unknown',
            'timestamp', Date.now().toString(),
            'events', JSON.stringify(batch.events)
          );

          // Update session stats
          if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            session.events += batch.events.length;
          }

          // Acknowledge
          ws.send(JSON.stringify({
            type: 'ack',
            id: id,
            processed: batch.events.length
          }));

          if (config.debug) {
            console.log(`[WS] Queued batch ${id} - ${batch.events.length} events`);
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (error) {
      console.error('[WS] Error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      console.log(`[WS] Session ${sessionId} closed - ${session.events} events processed`);
      sessions.delete(sessionId);
    }
  });

  ws.on('error', (error) => {
    console.error(`[WS] WebSocket error:`, error);
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════╗
║   SentientIQ Telemetry Gateway      ║
║   Ready for production!              ║
╠══════════════════════════════════════╣
║   HTTP:  http://0.0.0.0:${config.port}       ║
║   WS:    ws://0.0.0.0:${config.port}         ║
║   Redis: ${config.redisUrl}          ║
╚══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  wss.clients.forEach(ws => ws.close());
  await redis.quit();
  server.close(() => {
    console.log('Gateway shutdown complete');
    process.exit(0);
  });
});