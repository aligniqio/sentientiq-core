/**
 * Enhanced Emotion Processor with Intelligent Entry Mapping
 * Maps behavioral patterns to intervention-ready emotional states
 * NOW WITH: Proper viewport entry emotions and engagement progression
 */

const { connect, JSONCodec, StringCodec } = require('nats');

const jc = JSONCodec();
const sc = StringCodec();

// Configuration
const config = {
  natsUrl: process.env.NATS_URL || 'localhost:4222',
  debug: process.env.DEBUG === 'true'
};

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
      scrollDepth: 0,
      timeOnPage: 0,
      entryTime: Date.now(),
      readingSections: new Map(), // Track re-reading
      hasEnteredViewport: false
    };
    this.patterns = [];
    this.emotionalState = {
      current: 'neutral',
      confidence: 0,
      history: []
    };
  }

  addEvent(event) {
    this.history.push(event);
    // Keep last 100 events
    if (this.history.length > 100) {
      this.history.shift();
    }

    // Update context based on event
    if (event.url) {
      this.context.currentPage = event.url;

      // Track pricing flow
      if (event.url.includes('pric') || event.url.includes('plan')) {
        this.context.inPricingFlow = true;
      }

      // Track checkout flow
      if (event.url.includes('cart') || event.url.includes('checkout')) {
        this.context.inCheckoutFlow = true;
      }
    }

    // Track form interactions
    if (event.type === 'field_interaction') {
      this.context.inFormFlow = true;
      this.context.formFields.add(event.data?.field);
    }

    // Track tab switches
    if (event.type === 'tab_switch') {
      this.context.tabSwitches++;
    }

    // Track price selections
    if (event.type === 'text_selection_with_price') {
      this.context.priceSelections.push(event.data);
    }

    // Track scroll depth
    if (event.type === 'scroll' && event.data?.scrollPercentage) {
      this.context.scrollDepth = Math.max(this.context.scrollDepth, event.data.scrollPercentage);
    }

    // Track reading sections for re-read detection
    if (event.type === 'scroll' && event.data?.viewportTop) {
      const section = Math.floor(event.data.viewportTop / 500); // 500px sections
      const readCount = this.context.readingSections.get(section) || 0;
      this.context.readingSections.set(section, readCount + 1);
    }

    // Update time on page
    this.context.timeOnPage = Date.now() - this.context.entryTime;

    // Mark viewport entry
    if (!this.context.hasEnteredViewport &&
        (event.type === 'mouse_movement' || event.type === 'scroll')) {
      this.context.hasEnteredViewport = true;
    }
  }

  getRecentEvents(count = 10) {
    return this.history.slice(-count);
  }
}

// Enhanced pattern detection
function detectBehavioralPattern(events) {
  const patterns = [];

  // Movement patterns
  const movements = events.filter(e => e.type === 'mouse_movement');
  if (movements.length >= 3) {
    const avgVelocity = movements.reduce((sum, e) => sum + (e.data?.velocity || 0), 0) / movements.length;
    const avgAcceleration = movements.reduce((sum, e) => sum + (e.data?.acceleration || 0), 0) / movements.length;

    // Erratic movement
    if (avgVelocity > 800 && avgAcceleration > 500) {
      patterns.push({ type: 'erratic_movement', confidence: 90 });
    }
    // Hesitant movement
    else if (avgVelocity < 200 && movements.length > 5) {
      patterns.push({ type: 'hesitant_movement', confidence: 70 });
    }
    // Confident movement
    else if (avgVelocity > 300 && avgVelocity < 600 && avgAcceleration < 300) {
      patterns.push({ type: 'confident_movement', confidence: 80 });
    }
  }

  // Click patterns
  const clicks = events.filter(e => e.type === 'click');
  if (clicks.length >= 3) {
    const timeDiffs = [];
    for (let i = 1; i < clicks.length; i++) {
      timeDiffs.push(new Date(clicks[i].timestamp) - new Date(clicks[i-1].timestamp));
    }
    const avgTimeBetween = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;

    if (avgTimeBetween < 500) {
      patterns.push({ type: 'rage_clicking', confidence: 95 });
    }
  }

  // Form patterns
  const formEvents = events.filter(e => e.type === 'field_interaction');
  if (formEvents.length > 0) {
    const fieldTypes = formEvents.map(e => e.data?.field);
    if (fieldTypes.includes('email') || fieldTypes.includes('name')) {
      patterns.push({ type: 'form_engagement', confidence: 85 });
    }
    if (fieldTypes.includes('credit_card') || fieldTypes.includes('payment')) {
      patterns.push({ type: 'checkout_engagement', confidence: 90 });
    }
  }

  // Tab switching
  const tabSwitches = events.filter(e => e.type === 'tab_switch');
  if (tabSwitches.length >= 2) {
    patterns.push({ type: 'comparison_behavior', confidence: 80 });
  }

  // Scroll patterns
  const scrollEvents = events.filter(e => e.type === 'scroll');
  if (scrollEvents.length >= 3) {
    const scrollSpeeds = scrollEvents.map(e => e.data?.scrollSpeed || 0);
    const avgScrollSpeed = scrollSpeeds.reduce((a, b) => a + b, 0) / scrollSpeeds.length;

    if (avgScrollSpeed > 50) {
      patterns.push({ type: 'fast_scanning', confidence: 70 });
    } else if (avgScrollSpeed < 10) {
      patterns.push({ type: 'deep_reading', confidence: 85 });
    }
  }

  return patterns;
}

// Calculate emotional scores from patterns
function calculateEmotionalScores(patterns, context) {
  const scores = {
    frustration: 0,
    confusion: 0,
    interest: 0,
    excitement: 0,
    anxiety: 0,
    confidence: 0,
    hesitation: 0,
    trust: 0,
    curiosity: 0,
    engagement: 0,
    skepticism: 0
  };

  // Pattern-based scoring
  patterns.forEach(pattern => {
    switch(pattern.type) {
      case 'rage_clicking':
        scores.frustration += pattern.confidence;
        scores.anxiety += pattern.confidence * 0.5;
        break;
      case 'erratic_movement':
        scores.anxiety += pattern.confidence * 0.8;
        scores.confusion += pattern.confidence * 0.6;
        break;
      case 'hesitant_movement':
        scores.hesitation += pattern.confidence;
        scores.anxiety += pattern.confidence * 0.3;
        break;
      case 'confident_movement':
        scores.confidence += pattern.confidence;
        scores.engagement += pattern.confidence * 0.7;
        break;
      case 'form_engagement':
        scores.interest += pattern.confidence;
        scores.trust += pattern.confidence * 0.5;
        break;
      case 'checkout_engagement':
        scores.confidence += pattern.confidence * 0.8;
        scores.trust += pattern.confidence * 0.7;
        break;
      case 'comparison_behavior':
        scores.interest += pattern.confidence * 0.6;
        scores.hesitation += pattern.confidence * 0.4;
        break;
      case 'fast_scanning':
        scores.interest += pattern.confidence * 0.5;
        scores.curiosity += pattern.confidence * 0.8;
        break;
      case 'deep_reading':
        scores.engagement += pattern.confidence;
        scores.interest += pattern.confidence * 0.8;
        break;
    }
  });

  // Context-based adjustments
  if (context.tabSwitches > 3) {
    scores.hesitation += 30;
    scores.anxiety += 20;
  }

  if (context.scrollDepth > 75) {
    scores.engagement += 40;
    scores.interest += 30;
  }

  if (context.timeOnPage < 5000 && !context.hasEnteredViewport) {
    // Just entered - default to curiosity
    scores.curiosity = 80;
  }

  // Check for re-reading (skepticism indicator)
  let reReadCount = 0;
  context.readingSections.forEach(count => {
    if (count > 2) reReadCount++;
  });
  if (reReadCount > 0) {
    scores.skepticism += reReadCount * 20;
  }

  // Normalize scores
  Object.keys(scores).forEach(key => {
    scores[key] = Math.min(100, scores[key]);
  });

  return scores;
}

// Map to intervention-ready emotions
function mapToInterventionEmotion(scores, patterns, events, session) {
  // Find dominant emotion
  let maxScore = 0;
  let dominant = 'neutral';

  Object.entries(scores).forEach(([emotion, score]) => {
    if (score > maxScore) {
      maxScore = score;
      dominant = emotion;
    }
  });

  // ENTRY STATE - First interaction
  if (session.context.timeOnPage < 3000 && !session.context.scrollDepth) {
    return 'curiosity';
  }

  // ENGAGEMENT PROGRESSION
  if (dominant === 'curiosity' && session.context.scrollDepth > 20) {
    return 'interest';
  }

  if (dominant === 'interest' && session.context.scrollDepth > 50) {
    return 'engagement';
  }

  if (dominant === 'engagement' && session.context.timeOnPage > 30000) {
    return 'deep_engagement';
  }

  // RE-READING = SKEPTICISM
  if (scores.skepticism > 40) {
    return 'skeptical';
  }

  // Exit intent patterns
  const hasExitSignal = patterns.some(p =>
    p.type === 'erratic_movement' && scores.frustration > 40
  );

  if (hasExitSignal) {
    const recentExit = events.some(e =>
      e.type === 'exit_intent' ||
      (e.type === 'mouse_movement' && e.data?.y < 50)
    );

    if (recentExit) {
      return scores.frustration > 60 ? 'abandonment_intent' : 'exit_risk';
    }
  }

  // PRICE INTERACTIONS - Must have ACTUAL price interaction
  const hasActualPriceInteraction = events.some(e =>
    e.type === 'price_proximity' && e.data?.isOver === true ||
    e.type === 'text_selection_with_price' ||
    e.type === 'click' && e.data?.target?.text?.match(/\$\d+/)
  );

  // Only trigger price emotions with REAL price interaction
  if (hasActualPriceInteraction && session.context.inPricingFlow) {
    if (patterns.some(p => p.type === 'erratic_movement')) {
      return 'sticker_shock';
    }
    if (scores.frustration > 60 || scores.anxiety > 60) {
      return 'price_shock';
    }
    if (scores.hesitation > 40) {
      return 'price_hesitation';
    }
  }

  // Cart/checkout context
  const inCart = events.some(e =>
    e.url?.includes('cart') ||
    e.url?.includes('checkout') ||
    session.context.currentPage?.includes('cart')
  );

  if (inCart) {
    if (dominant === 'hesitation' || scores.hesitation > 50) return 'cart_hesitation';
    if (scores.anxiety > 40) return 'cart_review';
    if (hasExitSignal) return 'cart_abandonment';
  }

  // Trust/credibility patterns
  if (dominant === 'hesitation' && scores.trust < 30) {
    return 'trust_hesitation';
  }

  // Confusion patterns
  if (dominant === 'confusion' || scores.confusion > 60) {
    return 'confusion';
  }

  // Frustration patterns
  if (dominant === 'frustration' || scores.frustration > 70) {
    return 'frustration';
  }

  // Search/exploration patterns
  if (patterns.some(p => p.type === 'fast_scanning')) {
    if (scores.confusion > 40) return 'lost';
    return 'searching';
  }

  // Form engagement
  if (session.context.inFormFlow) {
    if (scores.hesitation > 50) return 'trust_hesitation';
    if (scores.confidence > 60) return 'trust_building';
    return 'evaluation';
  }

  // Comparison shopping
  if (session.context.tabSwitches > 2 || patterns.some(p => p.type === 'comparison_behavior')) {
    return 'comparison_shopping';
  }

  // Purchase intent signals
  if (session.context.inCheckoutFlow && scores.confidence > 60) {
    return 'purchase_intent';
  }

  // Default to dominant emotion or current engagement level
  if (scores.engagement > 60) return 'deep_engagement';
  if (scores.interest > 50) return 'interest';
  if (scores.curiosity > 40) return 'curiosity';

  return dominant;
}

// Connect to NATS and process events
async function startProcessor() {
  console.log('🧠 Enhanced Emotion Processor starting...');

  const nc = await connect({ servers: config.natsUrl });
  console.log(`✅ Connected to NATS at ${config.natsUrl}`);

  // Subscribe to behavioral events
  const sub = nc.subscribe('BEHAVIORAL.raw');

  console.log('📡 Processing behavioral patterns...');

  // Process events
  for await (const msg of sub) {
    try {
      const event = jc.decode(msg.data);
      const { sessionId, tenantId } = event;

      // Get or create session
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, new SessionState(sessionId));
        if (config.debug) {
          console.log(`🆕 New session: ${sessionId}`);
        }
      }

      const session = sessions.get(sessionId);
      session.addEvent(event);

      // Get recent events for analysis
      const recentEvents = session.getRecentEvents(20);

      // Detect patterns
      const patterns = detectBehavioralPattern(recentEvents);

      // Calculate emotional scores
      const scores = calculateEmotionalScores(patterns, session.context);

      // Map to intervention emotion
      const emotion = mapToInterventionEmotion(scores, patterns, recentEvents, session);

      // Get confidence (highest score)
      const confidence = Math.max(...Object.values(scores));

      // Only emit if emotion changed or confidence increased significantly
      const lastEmotion = session.emotionalState.current;
      const lastConfidence = session.emotionalState.confidence;

      if (emotion !== lastEmotion || Math.abs(confidence - lastConfidence) > 20) {
        // Update session state
        session.emotionalState.current = emotion;
        session.emotionalState.confidence = confidence;
        session.emotionalState.history.push({
          emotion,
          confidence,
          timestamp: Date.now()
        });

        // Prepare emotion event
        const emotionEvent = {
          sessionId,
          tenantId,
          emotion,
          confidence: Math.round(confidence),
          patterns,
          context: {
            pageUrl: session.context.currentPage,
            timeOnPage: session.context.timeOnPage,
            scrollDepth: session.context.scrollDepth,
            inPricingFlow: session.context.inPricingFlow,
            inCheckoutFlow: session.context.inCheckoutFlow
          },
          // Include all scores for intervention logic
          scores: {
            frustration: Math.round(scores.frustration),
            anxiety: Math.round(scores.anxiety),
            interest: Math.round(scores.interest),
            excitement: Math.round(scores.excitement),
            hesitation: Math.round(scores.hesitation),
            trust: Math.round(scores.trust),
            engagement: Math.round(scores.engagement)
          },
          timestamp: new Date().toISOString()
        };

        // Publish to emotion stream
        await nc.publish('EMOTIONS.state', jc.encode(emotionEvent));

        if (config.debug) {
          console.log(`🎭 ${sessionId}: ${emotion} (${confidence}%)`);
        }
      }

    } catch (error) {
      console.error('❌ Processing error:', error);
    }
  }
}

// Start the processor
startProcessor().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down emotion processor...');
  process.exit(0);
});