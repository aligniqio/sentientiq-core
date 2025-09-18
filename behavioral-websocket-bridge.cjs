#!/usr/bin/env node
/**
 * Behavioral WebSocket Bridge
 * Provides both raw behavioral events and emotional interpretations
 * Shows the full story: actions → patterns → emotions
 */

const WebSocket = require('ws');
const { connect, JSONCodec, createInbox } = require('nats');

const jc = JSONCodec();

async function startBridge() {
  console.log('🌉 Starting Behavioral WebSocket Bridge...');

  // Connect to NATS
  const nc = await connect({
    servers: process.env.NATS_URL || 'nats://localhost:4222',
    reconnect: true,
    maxReconnectAttempts: -1
  });
  console.log('✅ Connected to NATS');

  // Create WebSocket server on port 9223
  const wss = new WebSocket.Server({
    port: 9223,
    perMessageDeflate: false
  });

  console.log('🌐 WebSocket server listening on port 9223');

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`👤 New connection from ${clientIp}`);

    const subscriptions = new Map();

    // Handle client messages
    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message.toString());

        if (msg.type === 'subscribe' && msg.subjects) {
          // Subscribe to multiple subjects
          for (const subject of msg.subjects) {
            if (!subscriptions.has(subject)) {
              console.log(`📡 Subscribing client to ${subject}`);

              const sub = nc.subscribe(subject);
              subscriptions.set(subject, sub);

              // Forward messages to WebSocket
              (async () => {
                for await (const natsMsg of sub) {
                  try {
                    const data = jc.decode(natsMsg.data);

                    // For telemetry events, send individual behavioral events
                    if (subject === 'TELEMETRY.events' && data.events) {
                      // Send each behavioral event separately for real-time feel
                      for (const event of data.events) {
                        if (ws.readyState === WebSocket.OPEN) {
                          ws.send(JSON.stringify({
                            type: 'message',
                            subject: subject,
                            data: {
                              ...event,
                              sessionId: data.sessionId
                            }
                          }));
                        }
                      }
                    } else {
                      // For emotions, send the full object
                      if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                          type: 'message',
                          subject: subject,
                          data: data
                        }));
                      }
                    }
                  } catch (err) {
                    console.error('Error forwarding message:', err);
                  }
                }
              })();
            }
          }

          // Confirm subscription
          ws.send(JSON.stringify({
            type: 'subscribed',
            subjects: msg.subjects
          }));
        }

        // Handle ping/pong for keepalive
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }

      } catch (err) {
        console.error('Error handling message:', err);
      }
    });

    // Cleanup on disconnect
    ws.on('close', () => {
      console.log(`👋 Client disconnected: ${clientIp}`);

      // Unsubscribe from all NATS subjects
      for (const [subject, sub] of subscriptions) {
        console.log(`🔌 Unsubscribing from ${subject}`);
        sub.unsubscribe();
      }
      subscriptions.clear();
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Behavioral WebSocket Bridge',
      timestamp: Date.now()
    }));
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down...');
    wss.close();
    await nc.drain();
    process.exit(0);
  });

  // Status heartbeat
  setInterval(() => {
    console.log(`💓 Clients connected: ${wss.clients.size}`);
  }, 30000);
}

startBridge().catch(console.error);