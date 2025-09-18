#!/usr/bin/env node
/**
 * NATS WebSocket Bridge for Dashboard
 * Properly handles NATS subscriptions over WebSocket
 */

const WebSocket = require('ws');
const { connect, JSONCodec, StringCodec } = require('nats');

const jc = JSONCodec();
const sc = StringCodec();

const WS_PORT = process.env.WS_PORT || 9222;
const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';

console.log(`🚀 Starting NATS WebSocket Bridge on port ${WS_PORT}...`);

// Create WebSocket server
const wss = new WebSocket.Server({
  port: WS_PORT,
  perMessageDeflate: false
});

wss.on('listening', () => {
  console.log(`✅ WebSocket server listening on port ${WS_PORT}`);
});

wss.on('connection', async (ws, req) => {
  console.log('🔌 New dashboard connection from:', req.socket.remoteAddress);

  let nc;
  let subscriptions = new Map();
  let heartbeatInterval;

  try {
    // Connect to NATS
    nc = await connect({
      servers: NATS_URL,
      reconnect: true,
      maxReconnectAttempts: -1
    });
    console.log('✅ Connected to NATS for dashboard');

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now()
    }));

    // Set up heartbeat to keep connection alive
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
      }
    }, 30000); // Every 30 seconds

    // Handle pong responses
    ws.on('pong', () => {
      console.log('💓 Heartbeat acknowledged');
    });

    // Handle incoming WebSocket messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle subscription requests
        if (data.type === 'subscribe') {
          const subject = data.subject || 'EMOTIONS.state';
          console.log(`📡 Dashboard subscribing to: ${subject}`);

          // Create NATS subscription
          const sub = nc.subscribe(subject);
          subscriptions.set(subject, sub);

          // Forward NATS messages to WebSocket
          (async () => {
            for await (const msg of sub) {
              try {
                // Decode the message
                let payload;
                try {
                  payload = jc.decode(msg.data);
                } catch {
                  payload = sc.decode(msg.data);
                }

                // Send to dashboard
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'message',
                    subject: msg.subject,
                    data: payload,
                    timestamp: Date.now()
                  }));

                  console.log(`📤 Sent emotion to dashboard:`, payload.emotion || 'unknown');
                }
              } catch (error) {
                console.error('Error processing NATS message:', error);
              }
            }
          })();

          // Send subscription confirmation
          ws.send(JSON.stringify({
            type: 'subscribed',
            subject,
            timestamp: Date.now()
          }));
        }

        // Handle unsubscribe
        if (data.type === 'unsubscribe') {
          const subject = data.subject;
          const sub = subscriptions.get(subject);
          if (sub) {
            sub.unsubscribe();
            subscriptions.delete(subject);
            console.log(`🔕 Dashboard unsubscribed from: ${subject}`);
          }
        }

        // Handle publish (if dashboard wants to send something)
        if (data.type === 'publish') {
          const subject = data.subject;
          const payload = data.data;
          await nc.publish(subject, jc.encode(payload));
          console.log(`📨 Dashboard published to: ${subject}`);
        }

      } catch (error) {
        console.error('❌ WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error.message
        }));
      }
    });

  } catch (error) {
    console.error('❌ NATS connection error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      error: 'Failed to connect to NATS'
    }));
    ws.close();
    return;
  }

  // Handle disconnection
  ws.on('close', () => {
    console.log('👋 Dashboard disconnected');

    // Clear heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    // Unsubscribe all
    for (const sub of subscriptions.values()) {
      sub.unsubscribe();
    }
    subscriptions.clear();

    // Close NATS connection
    if (nc) {
      nc.close();
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

wss.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📛 Shutting down...');
  wss.close();
  process.exit(0);
});

console.log('🎯 NATS WebSocket Bridge ready for dashboard connections');