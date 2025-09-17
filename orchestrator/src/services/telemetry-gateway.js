/**
 * SentientIQ Telemetry Gateway Service
 * Receives telemetry, queues to Redis, no processing
 */

const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const WebSocket = require('ws');
const http = require('http');

class TelemetryGateway {
  constructor(config = {}) {
    this.config = {
      port: process.env.GATEWAY_PORT || 3002,
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      debug: process.env.DEBUG === 'true',
      ...config
    };

    this.redis = new Redis(this.config.redisUrl);
    this.sessions = new Map();
    this.app = express();
    this.setupExpress();
  }

  setupExpress() {
    this.app.use(cors({ origin: this.config.corsOrigin }));
    this.app.use(express.json({ limit: '10mb' }));

    // Health endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: Date.now(),
        connections: this.wss ? this.wss.clients.size : 0
      });
    });

    // Stats endpoint
    this.app.get('/stats', async (req, res) => {
      try {
        const streamLength = await this.redis.xlen('telemetry:raw');
        res.json({
          queue_length: streamLength,
          active_connections: this.wss ? this.wss.clients.size : 0,
          uptime: process.uptime()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // HTTP telemetry endpoint (fallback)
    this.app.post('/api/telemetry', async (req, res) => {
      try {
        const batch = req.body;

        if (!batch.session_id || !batch.events) {
          return res.status(400).json({ error: 'Invalid batch format' });
        }

        const id = await this.queueBatch(batch);
        res.json({ success: true, id: id });
      } catch (error) {
        console.error('[HTTP] Error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  async queueBatch(batch) {
    const id = await this.redis.xadd(
      'telemetry:raw',
      '*',
      'session', batch.session_id,
      'tenant', batch.tenant_id || 'unknown',
      'timestamp', Date.now().toString(),
      'events', JSON.stringify(batch.events)
    );

    if (this.config.debug) {
      console.log(`[Gateway] Queued batch ${id} - ${batch.events.length} events`);
    }

    return id;
  }

  start() {
    // Create HTTP server
    this.server = http.createServer(this.app);

    // Setup WebSocket
    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      let sessionId = null;

      console.log(`[WS] New connection from ${clientIp}`);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          switch(data.type) {
            case 'init':
              sessionId = data.session_id;
              this.sessions.set(sessionId, {
                ws: ws,
                tenant: data.tenant_id,
                started: Date.now(),
                events: 0
              });
              ws.send(JSON.stringify({ type: 'init_ack', session_id: sessionId }));
              break;

            case 'telemetry':
              const batch = data.batch || data;
              if (!batch.events) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid batch' }));
                return;
              }

              const id = await this.queueBatch(batch);

              // Update session stats
              if (sessionId && this.sessions.has(sessionId)) {
                const session = this.sessions.get(sessionId);
                session.events += batch.events.length;
              }

              ws.send(JSON.stringify({
                type: 'ack',
                id: id,
                processed: batch.events.length
              }));
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
        if (sessionId && this.sessions.has(sessionId)) {
          const session = this.sessions.get(sessionId);
          console.log(`[WS] Session ${sessionId} closed - ${session.events} events`);
          this.sessions.delete(sessionId);
        }
      });
    });

    // Start listening
    this.server.listen(this.config.port, () => {
      console.log(`
╔══════════════════════════════════════╗
║   Telemetry Gateway Active           ║
╠══════════════════════════════════════╣
║   Port: ${this.config.port}                      ║
║   Redis: Connected                   ║
║   WebSocket: Ready                   ║
╚══════════════════════════════════════╝
      `);
    });
  }

  async shutdown() {
    console.log('Shutting down gateway...');
    this.wss.clients.forEach(ws => ws.close());
    await this.redis.quit();
    this.server.close();
  }
}

module.exports = TelemetryGateway;