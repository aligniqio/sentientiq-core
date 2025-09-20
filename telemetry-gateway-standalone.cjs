/**
 * SentientIQ Telemetry Gateway - Direct to NATS
 * Clean, production-ready telemetry ingestion
 */

const express = require('express');
const cors = require('cors');
const { connect, StringCodec } = require('nats');
const WebSocket = require('ws');
const http = require('http');

// Configuration
const config = {
  port: process.env.GATEWAY_PORT || 3002,
  natsUrl: process.env.NATS_URL || 'localhost:4222',
  corsOrigin: '*', // Allow all origins for telemetry
  debug: true
};

// NATS connection
let nc = null;
let sc = StringCodec();

// Connect to NATS
(async () => {
  try {
    nc = await connect({ servers: config.natsUrl });
    console.log('✅ Connected to NATS');
  } catch (err) {
    console.error('❌ NATS connection error:', err);
    process.exit(1);
  }
})();

// Express app
const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    nats: nc ? 'connected' : 'disconnected',
    connections: wss ? wss.clients.size : 0
  });
});

// HTTP telemetry endpoint
app.post('/api/telemetry', async (req, res) => {
  try {
    const batch = req.body;

    if (!nc) {
      throw new Error('NATS not connected');
    }

    // Publish each event to NATS
    const events = batch.events || [];
    for (const event of events) {
      const message = {
        sessionId: batch.sessionId || 'unknown',
        tenantId: batch.tenantId || 'test',
        timestamp: event.timestamp || new Date().toISOString(),
        type: event.type,
        data: event.data || {}
      };

      nc.publish('TELEMETRY.events', sc.encode(JSON.stringify(message)));
    }

    console.log(`📊 HTTP: Published ${events.length} events to NATS`);
    res.json({ success: true, published: events.length });

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

        if (!nc) {
          throw new Error('NATS not connected');
        }

        // Publish each event to NATS
        const events = batch.events || [];
        for (const event of events) {
          const message = {
            sessionId: batch.sessionId || sessionId || 'unknown',
            tenantId: batch.tenantId || 'test',
            timestamp: event.timestamp || new Date().toISOString(),
            type: event.type,
            data: event.data || {}
          };

          nc.publish('TELEMETRY.events', sc.encode(JSON.stringify(message)));
        }

        console.log(`📈 WS: Published ${events.length} events to NATS`);
        ws.send(JSON.stringify({ type: 'ack', received: events.length }));
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
║   NATS:  nats://${config.natsUrl}         ║
╚════════════════════════════════════════════╝
  `);
});

// Connection monitoring
setInterval(() => {
  if (!config.debug) return;

  if (nc && nc.isClosed()) {
    console.log('⚠️  NATS connection lost, reconnecting...');
    (async () => {
      try {
        nc = await connect({ servers: config.natsUrl });
        console.log('✅ Reconnected to NATS');
      } catch (err) {
        console.error('❌ NATS reconnection failed:', err);
      }
    })();
  }
}, 5000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  server.close();
  if (nc) {
    await nc.drain();
    await nc.close();
  }
  process.exit(0);
});