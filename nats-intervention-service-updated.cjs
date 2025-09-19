/**
 * NATS-Based Intervention Service
 * Monitors emotional states and triggers interventions via WebSocket and NATS
 */

const WebSocket = require('ws');
const { connect, JSONCodec } = require('nats');
const http = require('http');

const jc = JSONCodec();

// Configuration
const config = {
  natsUrl: process.env.NATS_URL || 'localhost:4222',
  wsPort: process.env.WS_PORT || 3004,
  debug: process.env.DEBUG === 'true'
};

// Store active sessions
const sessions = new Map();
const monitorSessions = new Set();

// Intervention timing tracker
const interventionHistory = new Map();

// Intervention Rules Engine
const INTERVENTION_RULES = {
  chat: {
    triggers: ['confusion', 'frustration', 'skeptical', 'trust_hesitation'],
    threshold: 60,
    cooldown: 30000, // 30 seconds
    intervention: {
      type: 'chat',
      message: 'Need help? Chat with our team',
      position: 'bottom-right',
      style: 'proactive'
    }
  },
  discount: {
    triggers: ['price_shock', 'sticker_shock', 'price_hesitation'],
    threshold: 70,
    cooldown: 60000, // 1 minute
    intervention: {
      type: 'discount',
      message: 'Special offer just for you - 15% off',
      position: 'top-center',
      style: 'urgent'
    }
  },
  guide: {
    triggers: ['lost', 'searching', 'exploration'],
    threshold: 50,
    cooldown: 45000,
    intervention: {
      type: 'guide',
      message: 'Let me show you around',
      position: 'center',
      style: 'helpful'
    }
  },
  trust: {
    triggers: ['skeptical', 'trust_hesitation', 'credibility_check'],
    threshold: 40,
    cooldown: 60000,
    intervention: {
      type: 'trust',
      message: '30-day money back guarantee',
      position: 'top-center',
      style: 'reassuring'
    }
  },
  urgency: {
    triggers: ['comparison_shopping', 'evaluation', 'cart_hesitation'],
    threshold: 60,
    cooldown: 90000,
    intervention: {
      type: 'urgency',
      message: 'Limited stock - only 3 left',
      position: 'bottom-center',
      style: 'warning'
    }
  },
  abandonment: {
    triggers: ['abandonment_intent', 'exit_risk', 'cart_abandonment'],
    threshold: 50,
    cooldown: 120000,
    intervention: {
      type: 'abandonment',
      message: "Wait! Here's a special offer",
      position: 'center',
      style: 'blocking'
    }
  }
};

// Map emotions to intervention triggers
const EMOTION_TO_TRIGGER = {
  // Price-related
  price_shock: ['discount', 'chat'],
  sticker_shock: ['discount', 'urgency'],
  price_hesitation: ['discount', 'trust'],

  // Trust-related
  skeptical: ['trust', 'chat'],
  trust_hesitation: ['trust', 'chat'],
  credibility_check: ['trust'],

  // Navigation/Confusion
  confusion: ['chat', 'guide'],
  frustration: ['chat'],
  lost: ['guide', 'chat'],
  searching: ['guide'],

  // Purchase journey
  comparison_shopping: ['urgency', 'discount'],
  evaluation: ['urgency', 'trust'],
  cart_hesitation: ['urgency', 'discount'],
  cart_abandonment: ['abandonment', 'discount'],

  // Exit risks
  abandonment_intent: ['abandonment', 'chat'],
  exit_risk: ['abandonment', 'discount']
};

// Check if intervention should trigger
function shouldTriggerIntervention(sessionId, interventionType) {
  const key = `${sessionId}:${interventionType}`;
  const lastTriggered = interventionHistory.get(key);

  if (!lastTriggered) {
    interventionHistory.set(key, Date.now());
    return true;
  }

  const rule = INTERVENTION_RULES[interventionType];
  if (!rule) return false;

  const timeSince = Date.now() - lastTriggered;
  if (timeSince > rule.cooldown) {
    interventionHistory.set(key, Date.now());
    return true;
  }

  return false;
}

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({
  server,
  path: '/ws/interventions'
});

wss.on('connection', (ws, req) => {
  console.log('🔌 Browser connected for interventions');

  // Extract session ID from query params
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('session');
  const tenantId = url.searchParams.get('tenant');
  const isMonitor = url.searchParams.get('monitor') === 'true';

  if (!sessionId) {
    ws.close(1002, 'Session ID required');
    return;
  }

  // Handle monitor connections differently
  if (isMonitor || sessionId === 'dashboard-monitor') {
    monitorSessions.add(ws);
    console.log(`📊 Monitor session connected: ${sessionId}`);

    // Send acknowledgment
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      monitor: true,
      timestamp: Date.now()
    }));

    // Send periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds

    // Handle monitor messages (like subscribe)
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe') {
          // Send subscription confirmation
          ws.send(JSON.stringify({
            type: 'subscribed',
            subject: msg.subject,
            timestamp: Date.now()
          }));
          console.log(`📊 Monitor subscribed to: ${msg.subject}`);
        }
      } catch (error) {
        console.error('Error handling monitor message:', error);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      clearInterval(pingInterval);
      monitorSessions.delete(ws);
      console.log(`📊 Monitor session disconnected: ${sessionId}`);
    });

    ws.on('error', (error) => {
      console.error(`❌ Monitor WebSocket error:`, error.message);
      monitorSessions.delete(ws);
    });

    return;
  }

  // Store regular session connection
  sessions.set(sessionId, {
    ws,
    tenantId,
    connected: Date.now()
  });

  console.log(`📱 Session registered: ${sessionId} (${tenantId})`);

  // Send acknowledgment
  ws.send(JSON.stringify({
    type: 'connected',
    sessionId,
    timestamp: Date.now()
  }));

  // Handle disconnect
  ws.on('close', () => {
    sessions.delete(sessionId);
    console.log(`👋 Session disconnected: ${sessionId}`);
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${sessionId}:`, error.message);
  });
});

// Start WebSocket server
server.listen(config.wsPort, () => {
  console.log(`🚀 Intervention WebSocket server on port ${config.wsPort}`);
});

// Broadcast to monitor sessions
function broadcastToMonitors(data) {
  const message = JSON.stringify(data);
  for (const ws of monitorSessions) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch (error) {
        console.error('Error broadcasting to monitor:', error);
        monitorSessions.delete(ws);
      }
    }
  }
}

// Connect to NATS and monitor emotions
async function startMonitoring() {
  console.log('🎯 Starting intervention monitor...');

  const nc = await connect({ servers: config.natsUrl });
  console.log(`✅ Connected to NATS at ${config.natsUrl}`);

  // Subscribe to emotion stream
  const sub = nc.subscribe('EMOTIONS.state');
  console.log('📡 Monitoring emotional states...');

  // Also subscribe to intervention events for monitors
  const interventionSub = nc.subscribe('interventions.events');

  // Forward intervention events to monitors
  (async () => {
    for await (const msg of interventionSub) {
      try {
        const event = jc.decode(msg.data);
        broadcastToMonitors({
          type: 'intervention',
          data: event
        });
        console.log('📡 Forwarded intervention to monitors:', event.interventionType);
      } catch (error) {
        console.error('Error forwarding intervention:', error);
      }
    }
  })();

  // Process emotional events
  for await (const msg of sub) {
    try {
      const event = jc.decode(msg.data);
      const { sessionId, emotion, confidence, frustration, anxiety, interest, excitement, intention } = event;

      // Check if this session has an active WebSocket
      const session = sessions.get(sessionId);
      if (!session) continue;

      // Determine which interventions to trigger
      const interventionsToSend = [];

      // Check primary emotion
      if (emotion && confidence > 30) {
        const triggers = EMOTION_TO_TRIGGER[emotion];
        if (triggers) {
          for (const triggerType of triggers) {
            // Find matching intervention rule
            for (const [name, rule] of Object.entries(INTERVENTION_RULES)) {
              if (rule.triggers.includes(emotion) && shouldTriggerIntervention(sessionId, name)) {
                interventionsToSend.push({
                  ...rule.intervention,
                  reason: emotion,
                  confidence
                });
                break;
              }
            }
          }
        }
      }

      // Send interventions
      if (interventionsToSend.length > 0) {
        // Send to the specific session
        for (const intervention of interventionsToSend) {
          const message = {
            type: 'intervention',
            sessionId,
            timestamp: Date.now(),
            ...intervention
          };

          session.ws.send(JSON.stringify(message));

          // Also publish to NATS for dashboard monitoring
          const interventionEvent = {
            id: `int_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            sessionId,
            interventionType: intervention.type,
            emotion: intervention.reason,
            confidence: intervention.confidence,
            priority: 'high',
            timing: 'immediate',
            reason: intervention.reason,
            timestamp: new Date().toISOString()
          };

          await nc.publish('interventions.events', jc.encode(interventionEvent));

          if (config.debug) {
            console.log(`🎯 Sent ${intervention.type} to ${sessionId}: ${intervention.message}`);
            console.log(`📡 Published to NATS: interventions.events`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error processing emotion:', error);
    }
  }
}

// Start monitoring
startMonitoring().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down intervention service...');
  wss.close();
  server.close();
  process.exit(0);
});