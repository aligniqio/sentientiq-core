#!/usr/bin/env node
/**
 * Sophisticated Behavioral Emotion Processor
 * Tracks session state and recognizes complex behavioral patterns
 * "The precision of a polygraph and the empathy of a psychologist"
 */

const { connect, JSONCodec, consumerOpts } = require('nats');

const jc = JSONCodec();

// Session state tracking
const sessions = new Map();

class SessionState {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.history = [];
    this.context = {
      lastElement: null,
      currentPage: null,
      inPricingFlow: false,
      inFormFlow: false,
      inCheckoutFlow: false,
      tabSwitches: 0,
      priceSelections: [],
      formFields: new Set(),
      lastEmotions: [],
      emotionalJourney: []
    };
    this.patterns = {
      stickerShock: false,
      comparisonShopping: false,
      purchaseFunnel: false,
      abandonmentRisk: false,
      deepEngagement: false,
      frustrationSpiral: false
    };
  }

  addEvent(event) {
    this.history.push({
      ...event,
      timestamp: event.timestamp || Date.now()
    });

    // Keep only last 50 events for performance
    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  getRecentEvents(count = 5) {
    return this.history.slice(-count);
  }

  getTimeSinceLastEvent() {
    if (this.history.length < 2) return 0;
    const last = this.history[this.history.length - 1];
    const previous = this.history[this.history.length - 2];
    return last.timestamp - previous.timestamp;
  }
}

/**
 * Pattern Detection Functions
 */

function detectStickerShock(session, events) {
  // Pattern: pricing interaction → rapid/erratic movement → exit intent
  const recent = session.getRecentEvents(10);

  let pricingInteraction = false;
  let erraticBehavior = false;
  let exitSignal = false;

  for (let i = 0; i < recent.length; i++) {
    const event = recent[i];

    // Check for pricing interaction
    if (event.type === 'click' || event.type === 'hover') {
      const target = event.metadata?.target || {};
      if (target.text?.toLowerCase().includes('pric') ||
          target.class?.toLowerCase().includes('pric') ||
          target.id?.toLowerCase().includes('pric')) {
        pricingInteraction = true;
        session.context.inPricingFlow = true;
      }
    }

    // After pricing, look for shock indicators
    if (pricingInteraction) {
      if (event.type === 'erratic_movement' ||
          event.type === 'rapid_scroll' ||
          (event.type === 'scroll' && event.metadata?.velocity > 500)) {
        erraticBehavior = true;
      }

      if (event.type === 'exit_intent' ||
          event.type === 'mouse_exit' ||
          event.type === 'tab_blur') {
        exitSignal = true;
      }
    }
  }

  return pricingInteraction && erraticBehavior && exitSignal;
}

function detectComparisonShopping(session, events) {
  // Pattern: price selection → tab switch → return → repeat
  const hasMultiplePriceSelections = session.context.priceSelections.length > 1;
  const hasTabSwitching = session.context.tabSwitches > 2;

  // Check for text selection on pricing elements
  const priceTextSelection = events.some(e =>
    e.type === 'text_selection' && session.context.inPricingFlow
  );

  return (hasMultiplePriceSelections || priceTextSelection) && hasTabSwitching;
}

function detectPurchaseFunnel(session, events) {
  // Strong purchase intent pattern
  const steps = {
    browsing: false,
    pricingView: false,
    detailReading: false,
    formInteraction: false,
    cartAction: false
  };

  for (const event of session.history) {
    // Browsing/Interest
    if (event.type === 'hover' || event.type === 'scroll') {
      steps.browsing = true;
    }

    // Pricing engagement
    if (event.type === 'price_selection' ||
        (event.type === 'click' && session.context.inPricingFlow)) {
      steps.pricingView = true;
    }

    // Deep reading
    if (event.type === 'text_selection' ||
        event.type === 'dwell' ||
        (event.type === 'viewport_boundary' && event.metadata?.boundary === 'bottom')) {
      steps.detailReading = true;
    }

    // Form/checkout engagement
    if (event.type === 'form_focus' || event.type === 'form_submit') {
      steps.formInteraction = true;
    }

    // Cart/purchase actions
    if (event.type === 'click') {
      const target = event.metadata?.target || {};
      const text = (target.text || '').toLowerCase();
      if (text.includes('cart') || text.includes('buy') ||
          text.includes('checkout') || text.includes('purchase')) {
        steps.cartAction = true;
      }
    }
  }

  // Count completed steps
  const completedSteps = Object.values(steps).filter(v => v).length;
  return completedSteps >= 3;
}

function detectAbandonmentRisk(session, events) {
  // Pattern: form interaction → long pause → no progress
  let formStarted = false;
  let longPause = false;
  let noProgress = true;

  const recent = session.getRecentEvents(10);

  for (let i = 0; i < recent.length; i++) {
    const event = recent[i];

    if (event.type === 'form_focus') {
      formStarted = true;
      session.context.inFormFlow = true;
    }

    if (formStarted && i > 0) {
      const timeSince = event.timestamp - recent[i-1].timestamp;
      if (timeSince > 5000) {
        longPause = true;
      }

      if (event.type === 'form_submit' ||
          event.type === 'form_focus' ||
          event.type === 'input') {
        noProgress = false;
      }
    }
  }

  return formStarted && longPause && noProgress;
}

function detectFrustrationSpiral(session, events) {
  // Pattern: multiple rage clicks, rapid movements, repeated actions
  const frustrationEvents = events.filter(e =>
    e.type === 'rage_click' ||
    e.type === 'rapid_click' ||
    e.type === 'erratic_movement'
  );

  // Check for repeated clicks on same element (indicates broken UI)
  const clickTargets = events
    .filter(e => e.type === 'click')
    .map(e => e.metadata?.target?.id || e.metadata?.target?.class);

  const duplicateClicks = clickTargets.length !== new Set(clickTargets).size;

  return frustrationEvents.length >= 3 ||
         (frustrationEvents.length >= 2 && duplicateClicks);
}

/**
 * Sophisticated Emotion Calculation
 */
function calculateBehavioralEmotion(session, events) {
  if (!events || events.length === 0) return null;

  // Update session state
  for (const event of events) {
    session.addEvent(event);

    // Track special events
    if (event.type === 'price_selection') {
      session.context.priceSelections.push(event);
    }
    if (event.type === 'tab_switch') {
      session.context.tabSwitches++;
    }
    if (event.type === 'form_focus') {
      session.context.formFields.add(event.metadata?.fieldName || 'unknown');
    }
  }

  // Detect behavioral patterns
  session.patterns.stickerShock = detectStickerShock(session, events);
  session.patterns.comparisonShopping = detectComparisonShopping(session, events);
  session.patterns.purchaseFunnel = detectPurchaseFunnel(session, events);
  session.patterns.abandonmentRisk = detectAbandonmentRisk(session, events);
  session.patterns.frustrationSpiral = detectFrustrationSpiral(session, events);

  // Calculate emotion scores based on patterns AND individual events
  let scores = {
    frustration: 0,
    confusion: 0,
    interest: 0,
    excitement: 0,
    intention: 0,
    hesitation: 0,
    trust: 0
  };

  // PATTERN-BASED SCORING (stronger signals)
  if (session.patterns.stickerShock) {
    scores.frustration += 80;
    scores.hesitation += 60;
    console.log('   🎯 Pattern: STICKER SHOCK detected');
  }

  if (session.patterns.comparisonShopping) {
    scores.intention += 70;
    scores.interest += 50;
    scores.hesitation += 30;
    console.log('   🎯 Pattern: COMPARISON SHOPPING detected');
  }

  if (session.patterns.purchaseFunnel) {
    scores.intention += 90;
    scores.excitement += 40;
    scores.trust += 30;
    console.log('   🎯 Pattern: PURCHASE FUNNEL detected');
  }

  if (session.patterns.abandonmentRisk) {
    scores.hesitation += 70;
    scores.confusion += 40;
    scores.frustration += 20;
    console.log('   🎯 Pattern: ABANDONMENT RISK detected');
  }

  if (session.patterns.frustrationSpiral) {
    scores.frustration += 100;
    scores.confusion += 30;
    console.log('   🎯 Pattern: FRUSTRATION SPIRAL detected');
  }

  // EVENT-BASED SCORING (individual signals)
  for (const event of events) {
    const type = event.type;
    const metadata = event.metadata || {};

    // Context-aware scoring based on current flow
    let contextMultiplier = 1;
    if (session.context.inPricingFlow && type === 'click') {
      contextMultiplier = 1.5; // Clicks in pricing flow are more significant
    }
    if (session.context.inFormFlow && type === 'mouse_exit') {
      contextMultiplier = 2; // Leaving during form is very significant
    }

    // Individual event scoring (reduced from simple processor)
    if (type === 'rage_click') {
      scores.frustration += 40 * contextMultiplier;
    }
    else if (type === 'text_selection' && session.context.inPricingFlow) {
      scores.intention += 30; // Copying prices = high intent
      scores.interest += 20;
    }
    else if (type === 'dwell') {
      const duration = metadata.duration || 1000;
      if (duration > 3000) {
        scores.interest += 25; // Long dwell = reading
      } else {
        scores.confusion += 10; // Short dwell = hesitation
      }
    }
    else if (type === 'scroll') {
      const velocity = Math.abs(metadata.velocity || 0);
      if (velocity < 100) {
        scores.interest += 8;
      } else if (velocity > 800) {
        scores.confusion += 10;
        if (session.context.inPricingFlow) {
          scores.frustration += 15; // Fast scroll after pricing = sticker shock
        }
      }
    }
  }

  // Normalize scores and find dominant
  let dominant = 'neutral';
  let maxScore = 20; // Minimum threshold

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominant = emotion;
    }
  }

  // Secondary emotion (for nuanced understanding)
  let secondary = null;
  let secondScore = 0;
  for (const [emotion, score] of Object.entries(scores)) {
    if (emotion !== dominant && score > secondScore && score > maxScore * 0.5) {
      secondary = emotion;
      secondScore = score;
    }
  }

  // Build emotion object
  const result = {
    emotion: dominant,
    confidence: Math.min(100, maxScore),
    scores,
    patterns: Object.entries(session.patterns)
      .filter(([_, detected]) => detected)
      .map(([pattern]) => pattern),
    context: {
      inPricingFlow: session.context.inPricingFlow,
      inFormFlow: session.context.inFormFlow,
      sessionLength: session.history.length
    },
    timestamp: new Date().toISOString()
  };

  if (secondary) {
    result.secondary = secondary;
    result.secondaryConfidence = Math.min(100, secondScore);
  }

  return result;
}

async function startProcessor() {
  console.log('🧠 Starting Behavioral Emotion Processor...');
  console.log('   "The precision of a polygraph and the empathy of a psychologist"\n');

  try {
    const nc = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      reconnect: true,
      maxReconnectAttempts: -1
    });
    console.log('✅ Connected to NATS');

    const js = nc.jetstream();
    const jsm = await nc.jetstreamManager();

    // Ensure consumer exists
    const streamName = 'TELEMETRY';
    const consumerName = 'behavioral-processor';

    try {
      await jsm.consumers.info(streamName, consumerName);
      console.log(`✅ Consumer ${consumerName} exists`);
    } catch {
      console.log(`📦 Creating consumer ${consumerName}...`);
      await jsm.consumers.add(streamName, {
        name: consumerName,
        durable_name: consumerName,
        deliver_subject: 'behavioral-processor-deliver',
        ack_policy: 'explicit',
        max_deliver: 3
      });
    }

    // Subscribe to JetStream
    const opts = consumerOpts()
      .durable(consumerName)
      .manualAck()
      .ackExplicit()
      .deliverNew()
      .deliverTo('behavioral-processor-deliver');

    const sub = await js.subscribe('TELEMETRY.events', opts);
    console.log('📡 Listening for telemetry events...\n');

    let eventCount = 0;
    let emotionCount = 0;

    // Process messages
    for await (const msg of sub) {
      try {
        const data = jc.decode(msg.data);
        eventCount++;

        if (!data.sessionId || data.sessionId === 'unknown') {
          msg.ack();
          continue;
        }

        // Get or create session state
        if (!sessions.has(data.sessionId)) {
          sessions.set(data.sessionId, new SessionState(data.sessionId));
          console.log(`🆕 New session: ${data.sessionId}`);
        }
        const session = sessions.get(data.sessionId);

        console.log(`\n📦 Processing: ${data.sessionId}`);
        console.log(`   Events: ${data.events?.map(e => e.type).join(', ')}`);

        const emotion = calculateBehavioralEmotion(session, data.events);

        if (emotion && emotion.confidence > 20) {
          // Publish emotion
          await nc.publish('EMOTIONS.state', jc.encode({
            sessionId: data.sessionId,
            tenantId: data.tenantId,
            url: data.url,
            ...emotion,
            processor: 'behavioral',
            eventCount: data.events?.length || 0
          }));

          emotionCount++;

          // Log with rich context
          console.log(`\n🎭 EMOTION: ${emotion.emotion.toUpperCase()} @ ${emotion.confidence}%`);
          if (emotion.secondary) {
            console.log(`   Secondary: ${emotion.secondary} @ ${emotion.secondaryConfidence}%`);
          }
          if (emotion.patterns.length > 0) {
            console.log(`   Patterns: ${emotion.patterns.join(', ')}`);
          }
          console.log(`   Stats: ${eventCount} events → ${emotionCount} emotions`);
        }

        msg.ack();

      } catch (error) {
        console.error('❌ Error:', error.message);
        msg.nak();
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    setTimeout(() => startProcessor(), 5000);
  }
}

// Session cleanup (remove stale sessions after 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [sessionId, session] of sessions) {
    const lastEvent = session.history[session.history.length - 1];
    if (!lastEvent || lastEvent.timestamp < oneHourAgo) {
      sessions.delete(sessionId);
      console.log(`🧹 Cleaned stale session: ${sessionId}`);
    }
  }
}, 600000); // Every 10 minutes

// Start processor
startProcessor();

// Status report
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`\n📊 Status: ${sessions.size} active sessions, Memory ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
}, 30000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down...');
  process.exit(0);
});