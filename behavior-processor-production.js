/**
 * SentientIQ Behavior Processor - Production
 * Maps raw telemetry patterns to intervention triggers
 * Outputs emotions that match intervention-engine.ts configuration
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

// Initialize connections
const redis = new Redis(config.redisUrl);
const pubRedis = new Redis(config.redisUrl);
const supabase = config.supabaseUrl && config.supabaseKey ?
  createClient(config.supabaseUrl, config.supabaseKey) : null;

// Session state tracking
const sessions = new Map();

/**
 * Core emotion patterns that map to intervention-engine.ts triggers
 * These are the EXACT emotions the UI expects
 */
const INTERVENTION_EMOTIONS = {
  // High-value/rage interventions
  'rage': { minConfidence: 85, triggers: ['high_value_rage'] },

  // Confusion interventions
  'confusion': { minConfidence: 75, triggers: ['enterprise_confusion'] },

  // Abandonment interventions
  'abandonment': { minConfidence: 80, triggers: ['abandonment_prevention'] },
  'abandonment_intent': { minConfidence: 80, triggers: ['abandonment_prevention'] },
  'exit_risk': { minConfidence: 85, triggers: ['exit_risk'] },

  // Price shock interventions
  'sticker_shock': { minConfidence: 75, triggers: ['sticker_shock'] },
  'price_shock': { minConfidence: 75, triggers: ['sticker_shock'] },

  // Decision paralysis interventions
  'decision_paralysis': { minConfidence: 70, triggers: ['decision_paralysis'] },

  // Delight interventions
  'delight': { minConfidence: 85, triggers: ['delight_amplification'] },

  // Purchase intent interventions
  'purchase_intent': { minConfidence: 80, triggers: ['purchase_intent'] },

  // Skepticism interventions
  'skepticism': { minConfidence: 70, triggers: ['skepticism_handler'] },
  'evaluation': { minConfidence: 70, triggers: ['skepticism_handler'] },

  // Cart-specific emotions (from intervention-engine getInterventionForEmotion)
  'cart_hesitation': { minConfidence: 70, triggers: ['cart_save_modal'] },
  'cart_shock': { minConfidence: 75, triggers: ['discount_modal'] },
  'cart_review': { minConfidence: 65, triggers: ['value_popup'] },

  // Additional patterns
  'hesitation': { minConfidence: 65, triggers: ['urgency_banner'] },
  'frustration': { minConfidence: 70, triggers: ['help_chat'] },
  'comparison_shopping': { minConfidence: 60, triggers: ['comparison_chart'] }
};

/**
 * Analyze telemetry batch and determine emotional state
 */
function analyzeEmotionalState(batch) {
  const events = JSON.parse(batch.events || '[]');
  if (!events.length) return null;

  const sessionId = batch.session;
  const tenantId = batch.tenant;

  // Get or create session state
  let sessionState = sessions.get(sessionId);
  if (!sessionState) {
    sessionState = {
      sessionId,
      tenantId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageUrl: '',
      mousePatterns: {
        totalDistance: 0,
        velocities: [],
        accelerations: [],
        jerks: [],
        dwellTimes: [],
        microMovements: 0,
        scrollEvents: [],
        rageClicks: 0,
        exitVectors: []
      },
      interactions: {
        textSelections: [],
        priceViews: 0,
        cartViews: 0,
        comparisons: 0,
        tabSwitches: 0
      },
      emotionalVectors: {
        frustration: 0,
        anxiety: 0,
        urgency: 0,
        excitement: 0,
        trust: 0
      }
    };
    sessions.set(sessionId, sessionState);
  }

  // Process events
  for (const event of events) {
    processEvent(sessionState, event);
  }

  // Update session timestamp
  sessionState.lastActivity = Date.now();
  const sessionAge = Date.now() - sessionState.startTime;

  // Determine primary emotion based on patterns
  const emotion = detectEmotion(sessionState, sessionAge);

  if (!emotion) return null;

  // Calculate confidence based on signal strength
  const confidence = calculateConfidence(sessionState, emotion);

  // Check if confidence meets threshold
  const emotionConfig = INTERVENTION_EMOTIONS[emotion];
  if (!emotionConfig || confidence < emotionConfig.minConfidence) {
    return null;
  }

  return {
    sessionId,
    tenantId,
    emotion,
    confidence,
    intensity: confidence,
    ...sessionState.emotionalVectors,
    sessionAge,
    pageUrl: sessionState.pageUrl,
    timestamp: new Date().toISOString()
  };
}

/**
 * Process individual telemetry event
 */
function processEvent(sessionState, event) {
  const { type, data } = event;

  switch (type) {
    case 'mousemove':
      processMouseMove(sessionState, data);
      break;

    case 'rage_click':
      sessionState.mousePatterns.rageClicks++;
      sessionState.emotionalVectors.frustration = Math.min(100,
        sessionState.emotionalVectors.frustration + 25);
      break;

    case 'viewport_exit':
      sessionState.mousePatterns.exitVectors.push(data);
      if (data.velocity > 500) {
        sessionState.emotionalVectors.urgency = Math.min(100,
          sessionState.emotionalVectors.urgency + 20);
      }
      break;

    case 'text_selection':
      sessionState.interactions.textSelections.push(data);
      if (data.contains_price) {
        sessionState.interactions.priceViews++;
        sessionState.interactions.comparisons++;
      }
      break;

    case 'scroll':
      processScroll(sessionState, data);
      break;

    case 'visibility_change':
      if (data.hidden) {
        sessionState.interactions.tabSwitches++;
        sessionState.emotionalVectors.anxiety = Math.min(100,
          sessionState.emotionalVectors.anxiety + 10);
      }
      break;

    case 'page_view':
      sessionState.pageUrl = data.url || '';
      if (data.url && data.url.includes('/cart')) {
        sessionState.interactions.cartViews++;
      }
      break;
  }
}

/**
 * Process mouse movement patterns
 */
function processMouseMove(sessionState, data) {
  if (data.velocity !== undefined) {
    sessionState.mousePatterns.velocities.push(data.velocity);

    // High velocity = urgency/frustration
    if (data.velocity > 1000) {
      sessionState.emotionalVectors.urgency += 5;
    }
  }

  if (data.acceleration !== undefined) {
    sessionState.mousePatterns.accelerations.push(data.acceleration);

    // Erratic acceleration = anxiety
    if (Math.abs(data.acceleration) > 1500) {
      sessionState.emotionalVectors.anxiety += 3;
    }
  }

  if (data.jerk !== undefined) {
    sessionState.mousePatterns.jerks.push(data.jerk);

    // High jerk = uncertainty/confusion
    if (Math.abs(data.jerk) > 5000) {
      sessionState.emotionalVectors.anxiety += 5;
      sessionState.emotionalVectors.trust = Math.max(0,
        sessionState.emotionalVectors.trust - 2);
    }
  }

  // Track micro-movements (tremor)
  if (data.is_micro) {
    sessionState.mousePatterns.microMovements++;
  }

  // Normalize vectors to 0-100
  for (const key in sessionState.emotionalVectors) {
    sessionState.emotionalVectors[key] = Math.min(100,
      Math.max(0, sessionState.emotionalVectors[key]));
  }
}

/**
 * Process scroll patterns
 */
function processScroll(sessionState, data) {
  sessionState.mousePatterns.scrollEvents.push(data);

  // Rapid scrolling = searching/frustration
  if (data.velocity && Math.abs(data.velocity) > 2000) {
    sessionState.emotionalVectors.frustration += 10;
  }

  // Bottom dwelling = price shock/hesitation
  if (data.at_bottom && data.dwell_time > 2000) {
    sessionState.emotionalVectors.anxiety += 15;
  }
}

/**
 * Detect primary emotion from patterns
 */
function detectEmotion(sessionState, sessionAge) {
  const { mousePatterns, interactions, emotionalVectors } = sessionState;
  const { frustration, anxiety, urgency, trust } = emotionalVectors;
  const pageUrl = sessionState.pageUrl || '';

  // RAGE - Multiple rage clicks with high frustration
  if (mousePatterns.rageClicks >= 3 && frustration > 80) {
    return 'rage';
  }

  // EXIT RISK - Exit vectors with urgency
  if (mousePatterns.exitVectors.length > 2 && urgency > 70) {
    return 'exit_risk';
  }

  // CART-SPECIFIC EMOTIONS
  if (pageUrl.includes('/cart')) {
    if (interactions.cartViews > 1 && anxiety > 60) {
      return 'cart_hesitation';
    }
    if (interactions.priceViews > 2 && anxiety > 70) {
      return 'cart_shock';
    }
    if (sessionAge > 30000 && interactions.cartViews > 0) {
      return 'cart_review';
    }
  }

  // PRICE SHOCK - Price views with anxiety spike
  if (pageUrl.includes('/pricing') || pageUrl.includes('/plans')) {
    if (interactions.priceViews > 1 && anxiety > 65) {
      return 'sticker_shock';
    }
    if (interactions.tabSwitches > 2 && interactions.comparisons > 0) {
      return 'comparison_shopping';
    }
  }

  // ABANDONMENT INTENT - Long dwell with exit patterns
  if (sessionAge > 60000 && mousePatterns.exitVectors.length > 0 && urgency > 60) {
    return 'abandonment_intent';
  }

  // DECISION PARALYSIS - Lots of micro-movements, high dwell
  const avgVelocity = mousePatterns.velocities.length > 0 ?
    mousePatterns.velocities.reduce((a, b) => a + b, 0) / mousePatterns.velocities.length : 0;

  if (mousePatterns.microMovements > 50 && avgVelocity < 100 && sessionAge > 45000) {
    return 'decision_paralysis';
  }

  // CONFUSION - Erratic patterns with low confidence
  const jerkVariance = calculateVariance(mousePatterns.jerks);
  if (jerkVariance > 10000 && frustration > 40) {
    return 'confusion';
  }

  // SKEPTICISM/EVALUATION - Text selections, comparisons
  if (interactions.textSelections.length > 2 && interactions.comparisons > 1) {
    return trust < 50 ? 'skepticism' : 'evaluation';
  }

  // FRUSTRATION - High frustration without rage
  if (frustration > 70) {
    return 'frustration';
  }

  // HESITATION - Moderate anxiety with low activity
  if (anxiety > 50 && avgVelocity < 200) {
    return 'hesitation';
  }

  // PURCHASE INTENT - Positive patterns on pricing
  if (pageUrl.includes('/pricing') && trust > 60 && anxiety < 40) {
    return 'purchase_intent';
  }

  // DELIGHT - Smooth movements, high trust, low anxiety
  if (trust > 80 && anxiety < 20 && frustration < 20) {
    return 'delight';
  }

  return null;
}

/**
 * Calculate confidence score for detected emotion
 */
function calculateConfidence(sessionState, emotion) {
  let confidence = 50; // Base confidence

  const { mousePatterns, interactions, emotionalVectors } = sessionState;

  // Emotion-specific confidence boosters
  switch (emotion) {
    case 'rage':
      confidence += mousePatterns.rageClicks * 10;
      confidence += emotionalVectors.frustration * 0.3;
      break;

    case 'exit_risk':
    case 'abandonment_intent':
      confidence += mousePatterns.exitVectors.length * 15;
      confidence += emotionalVectors.urgency * 0.4;
      break;

    case 'cart_hesitation':
    case 'cart_shock':
      confidence += interactions.cartViews * 10;
      confidence += interactions.priceViews * 5;
      confidence += emotionalVectors.anxiety * 0.3;
      break;

    case 'sticker_shock':
    case 'price_shock':
      confidence += interactions.priceViews * 15;
      confidence += emotionalVectors.anxiety * 0.5;
      break;

    case 'confusion':
      const jerkVariance = calculateVariance(mousePatterns.jerks);
      confidence += Math.min(30, jerkVariance / 1000);
      confidence += emotionalVectors.frustration * 0.2;
      break;

    case 'decision_paralysis':
      confidence += Math.min(20, mousePatterns.microMovements / 5);
      confidence += emotionalVectors.anxiety * 0.3;
      break;

    case 'skepticism':
    case 'evaluation':
      confidence += interactions.textSelections.length * 10;
      confidence += interactions.comparisons * 10;
      break;

    case 'frustration':
      confidence = emotionalVectors.frustration;
      break;

    case 'hesitation':
      confidence = (emotionalVectors.anxiety + (100 - emotionalVectors.urgency)) / 2;
      break;

    case 'purchase_intent':
      confidence = emotionalVectors.trust * 0.8 + (100 - emotionalVectors.anxiety) * 0.2;
      break;

    case 'delight':
      confidence = emotionalVectors.trust * 0.6 + (100 - emotionalVectors.anxiety) * 0.4;
      break;
  }

  // Cap at 100
  return Math.min(100, Math.round(confidence));
}

/**
 * Calculate variance for pattern analysis
 */
function calculateVariance(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Process telemetry stream
 */
async function processTelemetryStream() {
  console.log('🧠 Behavior Processor started - reading from telemetry:raw');

  while (true) {
    try {
      // Read from Redis stream
      const results = await redis.xread(
        'BLOCK', 1000,
        'STREAMS', 'telemetry:raw',
        '$' // Read only new messages
      );

      if (!results || results.length === 0) continue;

      const [stream, messages] = results[0];

      for (const [id, fields] of messages) {
        // Convert field array to object
        const batch = {};
        for (let i = 0; i < fields.length; i += 2) {
          batch[fields[i]] = fields[i + 1];
        }

        // Analyze emotional state
        const emotionalState = analyzeEmotionalState(batch);

        if (emotionalState) {
          console.log(`🎯 Detected: ${emotionalState.emotion} (${emotionalState.confidence}%) for session ${emotionalState.sessionId}`);
          console.log(`   Vectors - Frustration: ${emotionalState.frustration}%, Anxiety: ${emotionalState.anxiety}%, Urgency: ${emotionalState.urgency}%`);

          // Publish to Redis for orchestrator to consume
          await pubRedis.publish('emotional_states', JSON.stringify(emotionalState));

          // Store in Supabase if configured
          if (supabase) {
            await storeEmotionalState(emotionalState);
          }
        }

        // Remove processed message (optional - keep for replay)
        // await redis.xdel('telemetry:raw', id);
      }
    } catch (error) {
      console.error('Processing error:', error);
      // Continue processing despite errors
    }
  }
}

/**
 * Store emotional state in Supabase
 */
async function storeEmotionalState(state) {
  try {
    await supabase.from('emotional_states').insert({
      session_id: state.sessionId,
      tenant_id: state.tenantId,
      emotion: state.emotion,
      confidence: state.confidence,
      intensity: state.intensity,
      frustration: state.frustration,
      anxiety: state.anxiety,
      urgency: state.urgency,
      excitement: state.excitement,
      trust: state.trust,
      page_url: state.pageUrl,
      session_age: state.sessionAge,
      timestamp: state.timestamp
    });
  } catch (error) {
    console.error('Failed to store emotional state:', error);
  }
}

/**
 * Clean up old sessions periodically
 */
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes

  for (const [sessionId, state] of sessions.entries()) {
    if (now - state.lastActivity > timeout) {
      sessions.delete(sessionId);
      console.log(`🧹 Cleaned up inactive session: ${sessionId}`);
    }
  }
}, 60000); // Check every minute

// Health check endpoint
if (process.env.HEALTH_PORT) {
  const express = require('express');
  const app = express();

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      activeSessions: sessions.size,
      uptime: process.uptime()
    });
  });

  app.listen(process.env.HEALTH_PORT, () => {
    console.log(`Health check on port ${process.env.HEALTH_PORT}`);
  });
}

// Start processing
processTelemetryStream().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down behavior processor...');
  await redis.quit();
  await pubRedis.quit();
  process.exit(0);
});

console.log(`
╔══════════════════════════════════════════════╗
║   🧠 BEHAVIOR PROCESSOR ACTIVE               ║
╠══════════════════════════════════════════════╣
║   Reading from: telemetry:raw                ║
║   Publishing to: emotional_states            ║
║   Tracking: ${Object.keys(INTERVENTION_EMOTIONS).length} emotion patterns          ║
║   Status: Processing...                      ║
╚══════════════════════════════════════════════╝
`);