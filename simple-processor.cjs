#!/usr/bin/env node
/**
 * Simple, Reliable Emotion Processor - JetStream Version
 * Properly consumes from JetStream instead of core NATS
 */

const { connect, JSONCodec, consumerOpts } = require('nats');

const jc = JSONCodec();

// Simple emotion calculation
function calculateEmotion(events) {
  if (!events || events.length === 0) return null;

  // Check if this is a tremor-only batch (likely system noise, not user activity)
  const eventTypes = new Set(events.map(e => e.type));
  if (eventTypes.size === 1 && eventTypes.has('tremor')) {
    // Tremor-only batch = phantom signal when mouse is idle
    console.log('   ⚠️  Ignoring tremor-only batch (no real activity)');
    return null;
  }

  let scores = {
    frustration: 0,
    confusion: 0,
    interest: 0,
    excitement: 0,
    intention: 0
  };

  for (const event of events) {
    const type = event.type;
    const metadata = event.metadata || event.data || {};

    // === FRUSTRATION SIGNALS ===
    if (type === 'rage_click') {
      scores.frustration += 60;  // Very strong frustration signal
      scores.confusion += 10;
    }
    else if (type === 'rapid_click') {
      scores.frustration += 45;
    }
    else if (type === 'erratic_movement') {
      scores.confusion += 30;
      scores.frustration += 20;
    }
    else if (type === 'exit_intent') {
      scores.frustration += 25;  // Leaving in frustration
      scores.confusion += 15;
    }
    else if (type === 'memory_pressure') {
      scores.frustration += 15;  // Technical frustration
    }

    // === CONFUSION/UNCERTAINTY SIGNALS ===
    else if (type === 'tremor') {
      scores.confusion += 3;  // Reduced from 10 - tremors are too frequent
      scores.interest += 1;  // Reduced from 3
    }
    else if (type === 'micro_gesture' && metadata.type === 'circle') {
      scores.confusion += 15;  // Circular movements = searching
      scores.interest += 5;
    }
    else if (type === 'micro_gesture' && metadata.type === 'zigzag') {
      scores.confusion += 12;  // Zigzag = uncertainty
    }
    else if (type === 'dwell') {
      scores.confusion += 8;  // Hesitation
      scores.interest += 12;  // But also reading
    }
    else if (type === 'mouse_exit') {
      scores.confusion += 8;
    }

    // === INTENTION/PURCHASE SIGNALS ===
    else if (type === 'price_selection') {
      scores.intention += 45;  // VERY strong purchase signal - copying prices
      scores.interest += 20;
    }
    else if (type === 'comparison_shopping') {
      scores.intention += 35;  // Tab switching for comparison
      scores.interest += 25;
    }
    else if (type === 'form_focus') {
      scores.intention += 40;  // High intent
      scores.interest += 15;
    }
    else if (type === 'form_submit') {
      scores.intention += 50;  // Highest intent
      scores.excitement += 20;
    }
    else if (type === 'click') {
      // Check context for purchase-related clicks
      const target = metadata.target || {};
      const text = (target.text || '').toLowerCase();
      const className = (target.class || '').toLowerCase();
      const id = (target.id || '').toLowerCase();

      if (text.includes('price') || text.includes('buy') || text.includes('purchase') ||
          className.includes('cta') || className.includes('button') ||
          id.includes('pricing')) {
        scores.intention += 35;
        scores.interest += 15;
      } else {
        scores.intention += 20;
        scores.interest += 10;
      }
    }

    // === INTEREST/ENGAGEMENT SIGNALS ===
    else if (type === 'text_selection') {
      scores.interest += 25;  // Reading carefully
      scores.intention += 10;
    }
    else if (type === 'hover') {
      scores.interest += 15;
      // Additional context checking could be done here
    }
    else if (type === 'scroll') {
      const velocity = Math.abs(metadata.velocity || 0);
      if (velocity < 100) {
        scores.interest += 12;  // Slow scroll = reading
      } else if (velocity > 500) {
        scores.confusion += 5;  // Fast scroll = searching
      } else {
        scores.interest += 8;
      }
    }
    else if (type === 'viewport_boundary') {
      if (metadata.boundary === 'bottom') {
        scores.interest += 15;  // Read to the end
        scores.intention += 5;
      }
    }
    else if (type === 'tab_switch') {
      if (metadata.action === 'return') {
        scores.interest += 10;  // Came back
        if (metadata.awayDuration > 30000) {
          scores.intention += 15;  // Comparison shopping
        }
      } else {
        scores.confusion += 3;  // Left the tab
      }
    }

    // === NEUTRAL/TRACKING EVENTS ===
    else if (type === 'mouse' || type === 'mousemove') {
      scores.interest += 2;  // Minimal signal
    }
    else if (type === 'connection' || type === 'viewport_resize') {
      // No emotional signal
    }
    else if (type === 'form_blur') {
      scores.confusion += 5;  // Abandoned form field
    }
  }

  // Find dominant emotion
  let dominant = 'neutral';
  let maxScore = 0;

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominant = emotion;
    }
  }

  return {
    emotion: dominant,
    confidence: Math.min(100, maxScore),
    scores,
    timestamp: new Date().toISOString()
  };
}

async function startProcessor() {
  console.log('🚀 Starting JetStream emotion processor...');

  try {
    // Connect to NATS
    const nc = await connect({
      servers: 'nats://localhost:4222',
      reconnect: true,
      maxReconnectAttempts: -1
    });
    console.log('✅ Connected to NATS');

    // Get JetStream context
    const js = nc.jetstream();
    const jsm = await nc.jetstreamManager();

    // Ensure consumer exists
    const streamName = 'TELEMETRY';
    const consumerName = 'emotion-processor';

    try {
      await jsm.consumers.info(streamName, consumerName);
      console.log(`✅ Consumer ${consumerName} exists`);
    } catch {
      console.log(`📦 Creating consumer ${consumerName}...`);
      await jsm.consumers.add(streamName, {
        name: consumerName,
        durable_name: consumerName,
        deliver_subject: 'emotion-processor-deliver',
        ack_policy: 'explicit',
        max_deliver: 3
      });
    }

    // Subscribe to JetStream - start from new messages only
    const opts = consumerOpts()
      .durable(consumerName)
      .manualAck()
      .ackExplicit()
      .deliverNew()  // Only process new messages
      .deliverTo('emotion-processor-deliver');

    const sub = await js.subscribe('TELEMETRY.events', opts);
    console.log('📡 Listening for JetStream telemetry events...');

    let eventCount = 0;
    let emotionCount = 0;

    // Process messages
    for await (const msg of sub) {
      try {
        const data = jc.decode(msg.data);
        eventCount++;

        console.log(`📦 Received batch: ${data.sessionId}, ${data.events?.length || 0} events`);
        if (data.events && data.events.length > 0) {
          console.log('   Event types:', data.events.map(e => e.type).join(', '));
        }

        if (!data.sessionId || data.sessionId === 'unknown') {
          console.log(`⚠️  Skipping event without sessionId`);
          msg.ack();
          continue;
        }

        const emotion = calculateEmotion(data.events);

        if (emotion && emotion.confidence > 5) {  // Lowered threshold to 5 for better sensitivity
          // Publish emotion to core NATS (not JetStream)
          await nc.publish('EMOTIONS.state', jc.encode({
            sessionId: data.sessionId,
            tenantId: data.tenantId,
            url: data.url,
            ...emotion,
            eventCount: data.events?.length || 0
          }));

          emotionCount++;
          console.log(`🎭 [${data.sessionId}] ${emotion.emotion} (${emotion.confidence}%) - Total: ${eventCount} events, ${emotionCount} emotions`);
        } else if (emotion) {
          console.log(`📊 [${data.sessionId}] Below threshold: ${emotion.emotion} at ${emotion.confidence}% (needs > 5%)`);
        }

        // Acknowledge message
        msg.ack();

      } catch (error) {
        console.error('❌ Error processing:', error.message);
        // NAK the message so it can be redelivered
        msg.nak();
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    setTimeout(() => startProcessor(), 5000); // Restart after 5 seconds
  }
}

// Start the processor
startProcessor();

// Status report every 30 seconds
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`📊 Status: Memory ${Math.round(mem.heapUsed / 1024 / 1024)}MB, Uptime ${Math.round(process.uptime())}s`);
}, 30000);

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('👋 Shutting down...');
  process.exit(0);
});