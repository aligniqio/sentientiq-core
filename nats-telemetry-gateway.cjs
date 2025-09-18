/**
 * NATS Telemetry Gateway
 * Receives telemetry and writes directly to NATS JetStream
 */

const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const { connect, JSONCodec } = require('nats');

const jc = JSONCodec();

// Configuration
const config = {
  port: process.env.PORT || 3002,
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  streamName: 'TELEMETRY',
  debug: true
};

let nc, js;

// Initialize NATS connection
async function initNATS() {
  nc = await connect({ servers: config.natsUrl });
  console.log(`✅ Connected to NATS at ${config.natsUrl}`);

  js = nc.jetstream();
  const jsm = await nc.jetstreamManager();

  // Ensure stream exists
  try {
    await jsm.streams.info(config.streamName);
    console.log(`✅ Stream ${config.streamName} exists`);
  } catch {
    console.log(`📦 Creating stream ${config.streamName}...`);
    await jsm.streams.add({
      name: config.streamName,
      subjects: [`${config.streamName}.*`],
      retention: 'limits',
      max_msgs: 1000000,
      max_age: 24 * 60 * 60 * 1000000000 // 24 hours
    });
  }
}

// Express app
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    nats: nc ? nc.protocol.connected : false,
    websockets: wss ? wss.clients.size : 0
  });
});

// HTTP telemetry endpoint
app.post('/api/telemetry', async (req, res) => {
  try {
    const batch = req.body;

    if (!js) {
      throw new Error('NATS not connected');
    }

    // Publish to NATS stream
    const ack = await js.publish(`${config.streamName}.events`, jc.encode({
      sessionId: batch.session_id || batch.sessionId || 'unknown',
      tenantId: batch.tenant_id || batch.tenantId || 'unknown',
      url: batch.url || '',
      timestamp: Date.now(),
      events: batch.events || []
    }));

    if (config.debug) {
      console.log(`📊 HTTP: Queued ${batch.events?.length || 0} events to NATS`);
    }

    res.json({
      success: true,
      stream: ack.stream,
      seq: ack.seq
    });

  } catch (error) {
    console.error('❌ HTTP Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({
  server,
  path: '/ws'
});

// Active WebSocket sessions
const sessions = new Map();

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');
  let sessionId = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'init') {
        sessionId = data.session_id || data.sessionId;
        sessions.set(sessionId, {
          ws,
          started: Date.now(),
          eventCount: 0
        });
        ws.send(JSON.stringify({
          type: 'ack',
          session_id: sessionId
        }));
        console.log(`📱 Session initialized: ${sessionId}`);
      }

      else if (data.type === 'telemetry' || data.type === 'telemetry_batch' || data.events) {
        const batch = data.batch || data;

        if (!js) {
          throw new Error('NATS not connected');
        }

        // Extract sessionId from all possible locations
        const extractedSessionId = batch.session_id || batch.sessionId || data.sessionId || sessionId || 'unknown';

        // Publish to NATS stream
        const ack = await js.publish(`${config.streamName}.events`, jc.encode({
          sessionId: extractedSessionId,
          tenantId: batch.tenant_id || batch.tenantId || batch.tenant_id || 'unknown',
          url: batch.url || '',
          timestamp: Date.now(),
          events: batch.events || []
        }));

        const session = sessions.get(sessionId);
        if (session) {
          session.eventCount += (batch.events?.length || 0);
        }

        // Send acknowledgment
        ws.send(JSON.stringify({
          type: 'ack',
          seq: ack.seq
        }));

        if (config.debug && batch.events?.length > 0) {
          console.log(`📡 WS ${extractedSessionId}: ${batch.events.length} events → NATS`);
        }
      }

    } catch (error) {
      console.error('❌ WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        console.log(`👋 Session closed: ${sessionId} (${session.eventCount} events)`);
        sessions.delete(sessionId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Start server
async function start() {
  try {
    await initNATS();

    server.listen(config.port, () => {
      console.log(`🚀 NATS Telemetry Gateway running on port ${config.port}`);
      console.log(`   HTTP: http://localhost:${config.port}/api/telemetry`);
      console.log(`   WebSocket: ws://localhost:${config.port}/ws`);
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 Shutting down...');
  if (nc) await nc.close();
  server.close();
  process.exit(0);
});