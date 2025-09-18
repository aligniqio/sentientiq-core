/**
 * NATS Intervention Service
 * Monitors emotions and triggers interventions based on rules
 */

const { connect, JSONCodec } = require('nats');
const WebSocket = require('ws');
const http = require('http');

const jc = JSONCodec();

// Configuration
const config = {
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  wsPort: process.env.WS_PORT || 3004,
  debug: true
};

// Active WebSocket sessions (browser connections waiting for interventions)
const sessions = new Map();

// Intervention rules based on your configuration
const INTERVENTION_RULES = {
  // Discount Modal - for price sensitivity
  discount: {
    triggers: ['price_shock', 'sticker_shock'],
    intervention: {
      type: 'modal',
      template: 'discount',
      title: '🎁 Special Offer Just for You!',
      message: 'Get 15% off your first order',
      cta: 'Claim Discount',
      delay: 1000
    }
  },

  // Trust Badges - for skepticism
  trust: {
    triggers: ['skeptical', 'evaluation'],
    intervention: {
      type: 'badge',
      template: 'trust',
      message: '🔒 256-bit SSL Secured • 30-Day Money Back',
      position: 'bottom-right',
      delay: 500
    }
  },

  // Urgency Banner - for hesitation
  urgency: {
    triggers: ['hesitation', 'cart_review'],
    intervention: {
      type: 'banner',
      template: 'urgency',
      message: '⏰ Limited time: Free shipping ends in 2 hours',
      position: 'top',
      delay: 2000
    }
  },

  // Social Proof Toast
  social: {
    triggers: ['evaluation', 'comparison_shopping'],
    intervention: {
      type: 'toast',
      template: 'social',
      message: '🔥 23 people are viewing this right now',
      position: 'bottom-left',
      delay: 1500
    }
  },

  // Help Chat - for confusion/frustration
  help: {
    triggers: ['confusion', 'frustration'],
    intervention: {
      type: 'chat',
      template: 'help',
      message: '💬 Need help? Our team is here',
      position: 'bottom-right',
      delay: 3000
    }
  },

  // Value Highlight
  value: {
    triggers: ['cart_hesitation', 'interest'],
    intervention: {
      type: 'highlight',
      template: 'value',
      message: '✨ Free returns • Lifetime warranty',
      delay: 1000
    }
  },

  // Exit Intent
  exit: {
    triggers: ['abandonment_intent', 'exit_risk'],
    intervention: {
      type: 'modal',
      template: 'exit',
      title: '🚪 Wait! Don\'t miss out',
      message: 'Complete your order in the next 10 minutes and get free shipping',
      cta: 'Complete Order',
      delay: 0
    }
  }
};

// Map emotions to intervention triggers
const EMOTION_TO_TRIGGER = {
  frustration: ['frustration', 'help'],
  confusion: ['confusion', 'help'],
  hesitation: ['hesitation', 'urgency'],
  anxiety: ['trust', 'help'],
  skeptical: ['trust'],
  interest: ['value', 'social'],
  excitement: ['social'],
  intention: ['value', 'urgency']
};

// Track recently sent interventions to avoid spamming
const recentInterventions = new Map(); // sessionId -> { type, timestamp }
const INTERVENTION_COOLDOWN = 30000; // 30 seconds between same intervention

function shouldTriggerIntervention(sessionId, type) {
  const recent = recentInterventions.get(sessionId);
  if (!recent) return true;

  const lastSent = recent[type];
  if (!lastSent) return true;

  return Date.now() - lastSent > INTERVENTION_COOLDOWN;
}

function markInterventionSent(sessionId, type) {
  const recent = recentInterventions.get(sessionId) || {};
  recent[type] = Date.now();
  recentInterventions.set(sessionId, recent);
}

// Create WebSocket server for browser connections
const server = http.createServer();
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

  if (!sessionId) {
    ws.close(1002, 'Session ID required');
    return;
  }

  // Store connection
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

// Connect to NATS and monitor emotions
async function startMonitoring() {
  console.log('🎯 Starting intervention monitor...');

  const nc = await connect({ servers: config.natsUrl });
  console.log(`✅ Connected to NATS at ${config.natsUrl}`);

  // Subscribe to emotion stream
  const sub = nc.subscribe('EMOTIONS.state');
  console.log('📡 Monitoring emotional states...');

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
                markInterventionSent(sessionId, name);
                break;
              }
            }
          }
        }
      }

      // Check specific emotion scores
      if (frustration > 50 && shouldTriggerIntervention(sessionId, 'help')) {
        interventionsToSend.push({
          ...INTERVENTION_RULES.help.intervention,
          reason: 'high_frustration',
          confidence: frustration
        });
        markInterventionSent(sessionId, 'help');
      }

      if (anxiety > 40 && shouldTriggerIntervention(sessionId, 'trust')) {
        interventionsToSend.push({
          ...INTERVENTION_RULES.trust.intervention,
          reason: 'anxiety',
          confidence: anxiety
        });
        markInterventionSent(sessionId, 'trust');
      }

      // Send interventions to browser
      if (interventionsToSend.length > 0 && session.ws.readyState === WebSocket.OPEN) {
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

// Start the service
startMonitoring().catch(console.error);

// Cleanup old intervention tracking
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, recent] of recentInterventions.entries()) {
    // Remove sessions older than 1 hour
    const hasRecent = Object.values(recent).some(t => now - t < 3600000);
    if (!hasRecent) {
      recentInterventions.delete(sessionId);
    }
  }
}, 60000); // Every minute

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 Shutting down...');
  wss.close();
  server.close();
  process.exit(0);
});