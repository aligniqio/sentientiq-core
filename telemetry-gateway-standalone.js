/**
 * SentientIQ Telemetry Gateway - Standalone
 * Clean, production-ready telemetry ingestion
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
  corsOrigin: '*', // Allow all origins for telemetry
  debug: true
};

// Initialize Redis
const redis = new Redis(config.redisUrl);
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// Express app
const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    redis: redis.status,
    connections: wss ? wss.clients.size : 0
  });
});

// HTTP telemetry endpoint
app.post('/api/telemetry', async (req, res) => {
  try {
    const batch = req.body;

    // Add to Redis stream
    const id = await redis.xadd(
      'telemetry:raw',
      '*',
      'session', batch.session_id || 'unknown',
      'tenant', batch.tenant_id || 'unknown',
      'url', batch.url || '',
      'timestamp', Date.now().toString(),
      'events', JSON.stringify(batch.events || [])
    );

    console.log(`📊 HTTP: Queued ${batch.events?.length || 0} events`);
    res.json({ success: true, id });

  } catch (error) {
    console.error('HTTP Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({
  server,
  path: '/ws'
});

// Active sessions
const sessions = new Map();

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');
  let sessionId = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'init') {
        sessionId = data.session_id;
        sessions.set(sessionId, { ws, started: Date.now() });
        ws.send(JSON.stringify({ type: 'ack', session_id: sessionId }));
        console.log(`📱 Session initialized: ${sessionId}`);
      }

      else if (data.type === 'telemetry' || data.events) {
        const batch = data.batch || data;

        const id = await redis.xadd(
          'telemetry:raw',
          '*',
          'session', batch.session_id || sessionId || 'unknown',
          'tenant', batch.tenant_id || 'unknown',
          'url', batch.url || '',
          'timestamp', Date.now().toString(),
          'events', JSON.stringify(batch.events || [])
        );

        ws.send(JSON.stringify({ type: 'ack', id }));
        console.log(`📊 WS: Queued ${batch.events?.length || 0} events`);
      }

    } catch (error) {
      console.error('WS Error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    if (sessionId) {
      sessions.delete(sessionId);
      console.log(`👋 Session closed: ${sessionId}`);
    }
  });
});

// Start server
server.listen(config.port, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🚀 TELEMETRY GATEWAY LIVE                ║
╠════════════════════════════════════════════╣
║   HTTP:  http://0.0.0.0:${config.port}/api/telemetry  ║
║   WS:    ws://0.0.0.0:${config.port}/ws             ║
║   Redis: ${config.redisUrl}    ║
╚════════════════════════════════════════════╝
  `);
});

// Monitor Redis stream size
setInterval(async () => {
  const length = await redis.xlen('telemetry:raw');
  console.log(`📈 Queue depth: ${length} events`);
}, 30000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  server.close();
  await redis.quit();
  process.exit(0);
});