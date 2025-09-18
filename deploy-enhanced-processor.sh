#!/bin/bash

# Enhanced Processor Deployment Script
echo "🚀 Deploying Enhanced Behavioral Processor with Intervention Mapping"

# Server details
SERVER="100.29.168.194"
USER="ec2-user"

# Create the enhanced processor file locally
cat > /tmp/deploy-processor.cjs << 'EOF'
#!/usr/bin/env node
/**
 * Enhanced Behavioral Emotion Processor
 * Maps behaviors to intervention-ready emotions
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
 * Map generic emotions to intervention-specific emotions
 */
function mapToInterventionEmotion(dominant, scores, patterns, events, session) {
  // Price-related emotions
  if (patterns.stickerShock) {
    return 'sticker_shock';
  }

  // Check recent events for price interactions
  const hasRecentPrice = events.some(e =>
    e.type === 'price_proximity' ||
    e.type === 'text_selection_with_price' ||
    e.type === 'click' && e.data?.target?.text?.toLowerCase().includes('pric')
  );

  if (hasRecentPrice || session.context.inPricingFlow) {
    if (dominant === 'frustration' || scores.frustration > 60) return 'price_shock';
    if (dominant === 'hesitation' || scores.hesitation > 40) return 'price_hesitation';
  }

  // Cart/checkout context
  const inCart = events.some(e =>
    e.url?.includes('cart') ||
    e.url?.includes('checkout') ||
    session.context.currentPage?.includes('cart')
  );

  if (inCart) {
    if (dominant === 'hesitation') return 'cart_hesitation';
    if (patterns.abandonmentRisk) return 'cart_review';
  }

  // Form interactions
  const hasFormInteraction = events.some(e =>
    e.type === 'form_focus' ||
    e.type === 'form_blur'
  );

  if (hasFormInteraction || session.context.inFormFlow) {
    if (dominant === 'hesitation') return 'trust_hesitation';
    if (patterns.abandonmentRisk) return 'skeptical';
    if (scores.trust < 30) return 'skeptical';
  }

  // Comparison shopping
  if (patterns.comparisonShopping) {
    return 'comparison_shopping';
  }

  // Exit patterns
  const hasExitSignal = events.some(e =>
    (e.type === 'viewport_approach' && e.data?.velocity > 200) ||
    e.type === 'mouse_exit'
  );

  if (hasExitSignal) {
    if (dominant === 'frustration') return 'exit_risk';
    return 'abandonment_intent';
  }

  // Confusion patterns
  const hasConfusion = events.some(e => e.type === 'circular_motion');
  if (hasConfusion || dominant === 'confusion') {
    return 'confusion';
  }

  // Evaluation pattern
  if (dominant === 'interest' && scores.interest > 40) {
    return 'evaluation';
  }

  // Anxiety from erratic movement
  if (dominant === 'frustration' && !patterns.frustrationSpiral) {
    return 'anxiety';
  }

  // Direct rage click frustration
  if (patterns.frustrationSpiral) {
    return 'frustration';
  }

  // Default mappings
  const emotionMap = {
    'hesitation': 'hesitation',
    'trust': 'trust_building',
    'excitement': 'engagement',
    'intention': 'evaluation'
  };

  return emotionMap[dominant] || dominant;
}

// Pattern detection functions
function detectStickerShock(session, events) {
  const recent = session.getRecentEvents(10);
  let pricingInteraction = false;
  let erraticBehavior = false;
  let exitSignal = false;

  for (let i = 0; i < recent.length; i++) {
    const event = recent[i];

    // Check for pricing interaction
    if (event.type === 'price_proximity' ||
        event.type === 'text_selection_with_price' ||
        (event.type === 'click' && event.data?.target?.text?.toLowerCase().includes('pric'))) {
      pricingInteraction = true;
      session.context.inPricingFlow = true;
    }

    // After pricing, look for shock indicators
    if (pricingInteraction) {
      if (event.type === 'viewport_approach' ||
          event.type === 'rapid_scroll' ||
          event.type === 'direction_changes') {
        erraticBehavior = true;
      }

      if (event.type === 'mouse_exit' ||
          event.type === 'tab_switch') {
        exitSignal = true;
      }
    }
  }

  return pricingInteraction && erraticBehavior && exitSignal;
}

function detectComparisonShopping(session, events) {
  const recent = session.getRecentEvents(20);
  let tabSwitches = 0;
  let priceChecks = 0;

  for (const event of recent) {
    if (event.type === 'tab_switch' || event.type === 'long_tab_return') {
      tabSwitches++;
    }

    if (event.type === 'price_proximity' ||
        event.type === 'text_selection_with_price') {
      priceChecks++;
    }
  }

  return tabSwitches >= 2 && priceChecks > 0;
}

function detectPurchaseFunnel(session, events) {
  const recent = session.getRecentEvents(15);
  let formInteractions = 0;
  let fieldsCompleted = 0;

  for (const event of recent) {
    if (event.type === 'form_focus') {
      formInteractions++;
      session.context.inFormFlow = true;
    }

    if (event.type === 'form_blur' && event.data?.hasValue) {
      fieldsCompleted++;
    }
  }

  return formInteractions >= 2 && fieldsCompleted >= 1;
}

function detectAbandonmentRisk(session, events) {
  const recent = session.getRecentEvents(10);
  let formAbandoned = false;
  let exitSignals = 0;

  for (const event of recent) {
    if (event.type === 'form_blur' && !event.data?.hasValue) {
      formAbandoned = true;
    }

    if (event.type === 'viewport_approach' ||
        event.type === 'mouse_exit') {
      exitSignals++;
    }
  }

  return formAbandoned || exitSignals > 2;
}

function detectFrustrationSpiral(session, events) {
  const recent = session.getRecentEvents(8);
  let rageClicks = 0;
  let frustrationSignals = 0;

  for (const event of recent) {
    if (event.type === 'rage_click') {
      rageClicks++;
    }

    if (event.type === 'direction_changes' ||
        event.type === 'circular_motion') {
      frustrationSignals++;
    }
  }

  return rageClicks >= 2 || frustrationSignals >= 3;
}

function detectDeepEngagement(session, events) {
  const recent = session.getRecentEvents(20);
  let scrollDepth = 0;
  let timeOnPage = 0;
  let contentInteractions = 0;

  for (const event of recent) {
    if (event.type === 'scroll') {
      scrollDepth = Math.max(scrollDepth, event.data?.depth || 0);
    }

    if (event.type === 'text_selection') {
      contentInteractions++;
    }
  }

  if (recent.length > 1) {
    timeOnPage = recent[recent.length - 1].timestamp - recent[0].timestamp;
  }

  return scrollDepth > 75 && timeOnPage > 30000 && contentInteractions > 1;
}

/**
 * Calculate emotion scores from events
 */
function calculateEmotionScores(session, events) {
  const scores = {
    frustration: 0,
    confusion: 0,
    interest: 0,
    intention: 0,
    hesitation: 0,
    trust: 0,
    excitement: 0
  };

  // Pattern-based scoring
  if (session.patterns.stickerShock) {
    scores.frustration += 80;
    scores.hesitation += 60;
  }

  if (session.patterns.comparisonShopping) {
    scores.intention += 70;
    scores.interest += 50;
  }

  if (session.patterns.purchaseFunnel) {
    scores.intention += 90;
    scores.trust += 60;
  }

  if (session.patterns.abandonmentRisk) {
    scores.hesitation += 70;
    scores.frustration += 30;
  }

  if (session.patterns.frustrationSpiral) {
    scores.frustration += 100;
    scores.confusion += 30;
  }

  if (session.patterns.deepEngagement) {
    scores.interest += 80;
    scores.trust += 40;
  }

  // Event-based scoring
  for (const event of events) {
    switch (event.type) {
      case 'rage_click':
        scores.frustration += 40;
        break;
      case 'circular_motion':
        scores.confusion += 30;
        break;
      case 'price_proximity':
        scores.interest += 20;
        if (session.context.inPricingFlow) {
          scores.hesitation += 15;
        }
        break;
      case 'cta_proximity':
        scores.intention += 15;
        break;
      case 'mouse_pause':
        const duration = event.data?.duration || 0;
        if (duration > 3000) {
          scores.hesitation += 25;
        } else if (duration > 1000) {
          scores.interest += 10;
        }
        break;
      case 'scroll':
        if (event.data?.depth > 50) {
          scores.interest += 15;
        }
        break;
      case 'form_focus':
        scores.intention += 20;
        scores.trust += 10;
        break;
      case 'form_blur':
        if (!event.data?.hasValue) {
          scores.hesitation += 20;
          scores.trust -= 10;
        }
        break;
      case 'text_selection':
      case 'text_selection_with_price':
        scores.interest += 15;
        break;
      case 'viewport_approach':
        if (event.data?.velocity > 200) {
          scores.frustration += 20;
        }
        break;
    }
  }

  return scores;
}

/**
 * Main processing function
 */
async function processEvents(batch) {
  const { sessionId, events } = batch;

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    session = new SessionState(sessionId);
    sessions.set(sessionId, session);
    console.log(\`🆕 New session: \${sessionId}\`);
  }

  // Add all events to session history
  for (const event of events) {
    session.addEvent(event);

    // Update context based on URL
    if (event.url) {
      session.context.currentPage = event.url;
      if (event.url.includes('cart')) session.context.inCheckoutFlow = true;
      if (event.url.includes('pric')) session.context.inPricingFlow = true;
    }
  }

  // Detect patterns
  session.patterns.stickerShock = detectStickerShock(session, events);
  session.patterns.comparisonShopping = detectComparisonShopping(session, events);
  session.patterns.purchaseFunnel = detectPurchaseFunnel(session, events);
  session.patterns.abandonmentRisk = detectAbandonmentRisk(session, events);
  session.patterns.frustrationSpiral = detectFrustrationSpiral(session, events);
  session.patterns.deepEngagement = detectDeepEngagement(session, events);

  // Calculate emotion scores
  const scores = calculateEmotionScores(session, events);

  // Find dominant emotion
  let dominant = 'neutral';
  let maxScore = 20;

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominant = emotion;
    }
  }

  // Map to intervention emotion
  const interventionEmotion = mapToInterventionEmotion(
    dominant,
    scores,
    session.patterns,
    events,
    session
  );

  // Build result
  const result = {
    emotion: interventionEmotion,  // Use intervention-specific emotion
    confidence: Math.min(100, maxScore),
    scores,
    patterns: Object.entries(session.patterns)
      .filter(([_, detected]) => detected)
      .map(([pattern]) => pattern),
    trigger: \`\${dominant}_to_\${interventionEmotion}\`,
    sessionId: sessionId
  };

  // Update session emotional journey
  if (result.emotion !== 'neutral') {
    session.context.lastEmotions = [result.emotion];
    session.context.emotionalJourney.push({
      timestamp: Date.now(),
      emotion: result.emotion,
      confidence: result.confidence
    });
  }

  return result;
}

/**
 * NATS Connection and Stream Processing
 */
async function start() {
  console.log('🚀 Starting Enhanced Behavioral Processor v2.0');
  console.log('   With Intervention-Ready Emotion Mapping');
  console.log('   Maps behaviors → specific intervention triggers\n');

  try {
    const nc = await connect({
      servers: 'nats://localhost:4222',
      reconnect: true,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 2000
    });
    console.log('✅ Connected to NATS');

    const js = nc.jetstream();

    // Subscribe to telemetry stream
    const opts = consumerOpts()
      .durable('emotion-processor')
      .ackExplicit()
      .deliverAll();

    const sub = await js.subscribe('TELEMETRY.events', opts);
    console.log('📡 Listening for telemetry events...\n');

    let eventCount = 0;
    let emotionCount = 0;

    // Process messages
    for await (const msg of sub) {
      try {
        const data = jc.decode(msg.data);
        eventCount++;

        console.log(\`\n📦 Processing: \${data.sessionId}\`);
        console.log(\`   Events: \${data.events.map(e => e.type).join(', ')}\`);

        const result = await processEvents(data);

        // Log patterns detected
        if (result.patterns.length > 0) {
          console.log(\`   Patterns: \${result.patterns.join(', ')}\`);
        }

        // Publish emotion if detected
        if (result.emotion !== 'neutral') {
          emotionCount++;

          console.log(\`\n🎭 INTERVENTION EMOTION: \${result.emotion.toUpperCase()} @ \${result.confidence}%\`);
          console.log(\`   Trigger: \${result.trigger}\`);

          // Publish to EMOTIONS.state for interventions
          await nc.publish('EMOTIONS.state', jc.encode({
            sessionId: result.sessionId,
            emotion: result.emotion,
            confidence: result.confidence,
            patterns: result.patterns,
            trigger: result.trigger,
            timestamp: Date.now(),
            processor: 'enhanced-behavioral-v2'
          }));

          console.log(\`   Stats: \${eventCount} events → \${emotionCount} emotions\`);
        }

        msg.ack();
      } catch (err) {
        console.error('Error processing:', err);
        msg.nak();
      }
    }

  } catch (err) {
    console.error('Fatal error:', err);
    console.log('Restarting in 5 seconds...');
    setTimeout(() => start(), 5000);
  }
}

// Session cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessions.entries()) {
    const lastEvent = session.history[session.history.length - 1];
    if (lastEvent && now - lastEvent.timestamp > 1800000) { // 30 min inactive
      sessions.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(\`\n🧹 Cleaned \${cleaned} inactive sessions\`);
  }

  console.log(\`\n📊 Active sessions: \${sessions.size}\`);
}, 300000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Shutting down gracefully...');
  process.exit(0);
});

// Start processor
start();
EOF

echo "📝 Enhanced processor created locally"

# Use base64 encoding to transfer the file
echo "📤 Encoding file for transfer..."
base64 /tmp/deploy-processor.cjs > /tmp/processor-encoded.txt

# Create deployment commands
cat > /tmp/deploy-commands.sh << 'DEPLOY_EOF'
# Decode the processor file
echo "📥 Receiving enhanced processor..."
base64 -d > /home/ec2-user/behavioral-processor-enhanced.cjs

# Make it executable
chmod +x /home/ec2-user/behavioral-processor-enhanced.cjs

# Backup current processor
echo "💾 Backing up current processor..."
cp /home/ec2-user/behavioral-processor.cjs /home/ec2-user/behavioral-processor.backup.cjs 2>/dev/null || true

# Stop current processor
echo "⏹️ Stopping current processor..."
pm2 stop behavioral-processor 2>/dev/null || true

# Replace with enhanced version
echo "🔄 Installing enhanced processor..."
cp /home/ec2-user/behavioral-processor-enhanced.cjs /home/ec2-user/behavioral-processor.cjs

# Restart processor with PM2
echo "🚀 Starting enhanced processor..."
pm2 start /home/ec2-user/behavioral-processor.cjs --name behavioral-processor --log-date-format "YYYY-MM-DD HH:mm:ss"

# Show status
echo "📊 Processor status:"
pm2 list
pm2 logs behavioral-processor --lines 10 --nostream

echo "✅ Enhanced processor deployed successfully!"
DEPLOY_EOF

echo "🚀 Deploying to EC2 server..."
echo "Please run these commands on your EC2 instance:"
echo ""
echo "1. First, copy the encoded processor:"
echo "   cat > /tmp/processor.b64 << 'EOF'"
head -20 /tmp/processor-encoded.txt
echo "   ... (content truncated for display)"
echo "   EOF"
echo ""
echo "2. Then run the deployment:"
echo "   base64 -d /tmp/processor.b64 > /home/ec2-user/behavioral-processor-enhanced.cjs"
echo "   chmod +x /home/ec2-user/behavioral-processor-enhanced.cjs"
echo "   pm2 stop behavioral-processor"
echo "   cp /home/ec2-user/behavioral-processor-enhanced.cjs /home/ec2-user/behavioral-processor.cjs"
echo "   pm2 restart behavioral-processor"
echo ""
echo "The enhanced processor will output intervention-specific emotions like:"
echo "  - price_shock, sticker_shock, price_hesitation"
echo "  - cart_hesitation, cart_review"
echo "  - trust_hesitation, skeptical"
echo "  - comparison_shopping, evaluation"
echo "  - abandonment_intent, exit_risk"
echo ""
echo "These map directly to your intervention triggers! 🎯"