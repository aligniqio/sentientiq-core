/**
 * SentientIQ Intervention Processor
 * Subscribes to emotional states and makes intervention decisions
 * Bridge between Behavior Processor and Intervention Broadcaster
 */

const Redis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  debug: process.env.DEBUG === 'true'
};

// Initialize Redis connections
const subRedis = new Redis(config.redisUrl);
const pubRedis = new Redis(config.redisUrl);

// Initialize Supabase if configured
const supabase = config.supabaseUrl && config.supabaseKey ?
  createClient(config.supabaseUrl, config.supabaseKey) : null;

// Track active interventions
const activeInterventions = new Map();
const sessionCooldowns = new Map();

/**
 * Simple intervention engine logic
 * Maps emotional states to intervention decisions
 */
function processEmotionalState(state) {
  const { sessionId, emotion, confidence, frustration, anxiety, urgency } = state;

  console.log(`🧠 Processing: ${emotion} (${confidence}%) for ${sessionId}`);
  console.log(`   Vectors - F:${frustration}% A:${anxiety}% U:${urgency}%`);

  // Check cooldown
  if (isOnCooldown(sessionId)) {
    console.log(`⏸️ Session ${sessionId} on cooldown`);
    return null;
  }

  // Map emotions to interventions
  const interventionMap = getInterventionForEmotion(emotion, {
    frustration: frustration || 0,
    anxiety: anxiety || 0,
    urgency: urgency || 0,
    confidence: confidence
  });

  if (!interventionMap) {
    console.log(`   No intervention for ${emotion}`);
    return null;
  }

  // Build intervention decision
  const decision = {
    sessionId,
    interventionType: interventionMap.type,
    reason: interventionMap.reason,
    confidence: confidence * (interventionMap.multiplier || 1),
    priority: calculatePriority(state),
    timing: calculateTiming(state),
    emotion,
    timestamp: new Date().toISOString()
  };

  // Set cooldown
  setCooldown(sessionId);

  console.log(`✅ Intervention decided: ${decision.interventionType} (${decision.priority} priority)`);
  return decision;
}

/**
 * Map emotions to specific interventions
 */
function getInterventionForEmotion(emotion, vectors) {
  // Cart-specific emotions get immediate interventions
  const cartInterventions = {
    'cart_hesitation': {
      type: 'cart_save_modal',
      reason: 'Cart hesitation detected',
      multiplier: 1.2
    },
    'cart_shock': {
      type: 'discount_modal',
      reason: 'Price shock in cart',
      multiplier: 1.5
    },
    'cart_review': {
      type: 'value_popup',
      reason: 'Reviewing cart items',
      multiplier: 1.0
    },
    'abandonment_intent': {
      type: 'save_cart_urgent',
      reason: 'Abandonment signals detected',
      multiplier: 2.0
    },
    'exit_risk': {
      type: 'exit_modal',
      reason: 'Exit risk detected',
      multiplier: 1.8
    }
  };

  if (cartInterventions[emotion]) {
    return cartInterventions[emotion];
  }

  // High frustration patterns
  if (vectors.frustration > 80) {
    if (vectors.urgency > 60) {
      return {
        type: 'help_offer',
        reason: 'High frustration with urgency',
        multiplier: 1.3
      };
    }
    return {
      type: 'live_chat',
      reason: 'Frustration threshold exceeded',
      multiplier: 1.1
    };
  }

  // High anxiety patterns
  if (vectors.anxiety > 75) {
    if (emotion === 'comparison_shopping') {
      return {
        type: 'comparison_chart',
        reason: 'Anxious comparison shopping',
        multiplier: 1.2
      };
    }
    return {
      type: 'money_back_guarantee',
      reason: 'High purchase anxiety',
      multiplier: 1.0
    };
  }

  // Price-related patterns
  if (emotion === 'price_shock' || emotion === 'sticker_shock') {
    if (vectors.confidence > 70) {
      return {
        type: 'payment_plan_offer',
        reason: 'Significant price shock',
        multiplier: 1.4
      };
    }
    return {
      type: 'discount_offer',
      reason: 'Price sensitivity detected',
      multiplier: 1.2
    };
  }

  // Trust-building patterns
  if (emotion === 'skepticism' || emotion === 'evaluation') {
    return {
      type: 'success_stories',
      reason: 'Building trust during evaluation',
      multiplier: 0.9
    };
  }

  // Decision paralysis
  if (emotion === 'decision_paralysis') {
    return {
      type: 'comparison_chart',
      reason: 'Decision paralysis detected',
      multiplier: 1.1
    };
  }

  // Confusion
  if (emotion === 'confusion') {
    return {
      type: 'help_offer',
      reason: 'User confused',
      multiplier: 1.0
    };
  }

  // Positive emotions - different strategy
  if (emotion === 'purchase_intent') {
    return {
      type: 'urgency_banner',
      reason: 'Encourage purchase completion',
      multiplier: 1.3
    };
  }

  if (emotion === 'delight') {
    return {
      type: 'success_stories',
      reason: 'Reinforce positive experience',
      multiplier: 0.8
    };
  }

  return null;
}

/**
 * Calculate intervention priority
 */
function calculatePriority(state) {
  const { emotion, confidence, frustration = 0, urgency = 0, sessionAge } = state;

  // Critical conditions
  if (emotion === 'abandonment_intent' && confidence > 80) return 'critical';
  if (emotion === 'cart_shock' && frustration > 70) return 'critical';
  if (frustration > 90) return 'critical';

  // High priority
  if (emotion.startsWith('cart_') && confidence > 70) return 'high';
  if (urgency > 80 && sessionAge > 60000) return 'high';
  if (frustration > 70) return 'high';

  // Medium priority
  if (confidence > 60) return 'medium';
  if (urgency > 50) return 'medium';

  return 'low';
}

/**
 * Calculate optimal intervention timing
 */
function calculateTiming(state) {
  const { sessionAge, urgency = 0, emotion } = state;

  // Too early in session - wait
  if (sessionAge < 5000) return 'delayed';

  // Cart emotions need immediate action
  if (emotion.startsWith('cart_')) return 'immediate';
  if (emotion === 'abandonment_intent') return 'immediate';
  if (emotion === 'exit_risk') return 'immediate';

  // High urgency = immediate
  if (urgency > 80) return 'immediate';

  // Otherwise find optimal moment
  return 'optimal';
}

/**
 * Check if session is on cooldown
 */
function isOnCooldown(sessionId) {
  const lastIntervention = sessionCooldowns.get(sessionId);
  if (!lastIntervention) return false;

  const cooldownMs = 30000; // 30 second minimum between interventions
  return Date.now() - lastIntervention < cooldownMs;
}

/**
 * Set cooldown for session
 */
function setCooldown(sessionId) {
  sessionCooldowns.set(sessionId, Date.now());

  // Clean up old cooldowns after 5 minutes
  setTimeout(() => {
    sessionCooldowns.delete(sessionId);
  }, 300000);
}

/**
 * Subscribe to emotional states from Redis
 */
async function startProcessing() {
  console.log('🎯 Intervention Processor started');

  // Subscribe to emotional states channel
  await subRedis.subscribe('emotional_states');

  subRedis.on('message', async (channel, message) => {
    if (channel !== 'emotional_states') return;

    try {
      const emotionalState = JSON.parse(message);

      // Process and decide on intervention
      const decision = processEmotionalState(emotionalState);

      if (decision) {
        // Track active intervention
        activeInterventions.set(decision.sessionId, decision);

        // Publish intervention decision
        await pubRedis.publish('intervention_decisions', JSON.stringify(decision));

        // Store in Supabase if configured
        if (supabase) {
          await storeInterventionDecision(decision);
        }

        console.log(`📤 Published intervention: ${decision.interventionType} for ${decision.sessionId}`);
      }
    } catch (error) {
      console.error('Error processing emotional state:', error);
    }
  });

  console.log('📡 Subscribed to emotional_states channel');
}

/**
 * Store intervention decision in Supabase
 */
async function storeInterventionDecision(decision) {
  try {
    await supabase.from('intervention_decisions').insert({
      session_id: decision.sessionId,
      intervention_type: decision.interventionType,
      emotion: decision.emotion,
      confidence: decision.confidence,
      priority: decision.priority,
      timing: decision.timing,
      reason: decision.reason,
      timestamp: decision.timestamp
    });
  } catch (error) {
    console.error('Failed to store intervention decision:', error);
  }
}

/**
 * Health check endpoint
 */
if (process.env.HEALTH_PORT) {
  const express = require('express');
  const app = express();

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      activeInterventions: activeInterventions.size,
      cooldowns: sessionCooldowns.size,
      uptime: process.uptime()
    });
  });

  app.listen(process.env.HEALTH_PORT, () => {
    console.log(`Health check on port ${process.env.HEALTH_PORT}`);
  });
}

// Periodic stats
setInterval(() => {
  console.log(`📊 Stats - Active: ${activeInterventions.size}, Cooldowns: ${sessionCooldowns.size}`);

  // Clean up old active interventions (older than 2 minutes)
  const now = Date.now();
  for (const [sessionId, decision] of activeInterventions.entries()) {
    const age = now - new Date(decision.timestamp).getTime();
    if (age > 120000) {
      activeInterventions.delete(sessionId);
    }
  }
}, 30000);

// Start processing
startProcessing().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down intervention processor...');
  await subRedis.quit();
  await pubRedis.quit();
  process.exit(0);
});

console.log(`
╔══════════════════════════════════════════════╗
║   🎯 INTERVENTION PROCESSOR ACTIVE           ║
╠══════════════════════════════════════════════╣
║   Subscribing to: emotional_states           ║
║   Publishing to: intervention_decisions      ║
║   Cooldown: 30 seconds                       ║
║   Status: Processing...                      ║
╚══════════════════════════════════════════════╝
`);