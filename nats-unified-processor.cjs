/**
 * NATS-Only Unified Processor
 * Simplifies the entire pipeline using only NATS JetStream
 */

const { connect, StringCodec, JSONCodec } = require('nats');

const sc = StringCodec();
const jc = JSONCodec();

// Configuration
const config = {
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  telemetryStream: 'TELEMETRY',
  emotionsStream: 'EMOTIONS',
  consumerName: 'behavior-processor',
  debug: true
};

// Emotion state tracking per session
const sessionStates = new Map();
const EMOTION_THROTTLE_MS = 3000;
const SESSION_CLEANUP_MS = 30 * 60 * 1000;

// Clean up old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, state] of sessionStates.entries()) {
    if (now - state.lastSeen > SESSION_CLEANUP_MS) {
      sessionStates.delete(sessionId);
      console.log(`🧹 Cleaned up session: ${sessionId}`);
    }
  }
}, SESSION_CLEANUP_MS);

// Calculate emotional vector from events
function calculateEmotions(events) {
  let frustration = 0;
  let confusion = 0;
  let interest = 0;
  let excitement = 0;
  let intention = 0;

  for (const event of events) {
    const { type, data = {} } = event;

    switch (type) {
      case 'rage_click':
        frustration += 30;
        break;

      case 'erratic_movement':
        confusion += 20;
        frustration += 10;
        break;

      case 'smooth_navigation':
        interest += 15;
        intention += 10;
        break;

      case 'hover':
        if (data.duration > 500) {
          interest += 10;
          intention += 5;
        }
        break;

      case 'scroll':
        if (data.velocity > 5) {
          excitement += 5;
        } else {
          interest += 5;
        }
        break;

      case 'form_interaction':
        intention += 20;
        interest += 10;
        break;
    }
  }

  // Normalize and cap at 100
  const total = frustration + confusion + interest + excitement + intention;
  if (total > 0) {
    const scale = Math.min(1, 100 / total);
    frustration = Math.round(frustration * scale);
    confusion = Math.round(confusion * scale);
    interest = Math.round(interest * scale);
    excitement = Math.round(excitement * scale);
    intention = Math.round(intention * scale);
  }

  // Determine dominant emotion
  const emotions = { frustration, confusion, interest, excitement, intention };
  const dominant = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    emotions,
    dominant: dominant[0],
    confidence: dominant[1],
    timestamp: Date.now()
  };
}

async function startProcessor() {
  console.log('🚀 Starting NATS-only unified processor...');

  const nc = await connect({ servers: config.natsUrl });
  console.log(`✅ Connected to NATS at ${config.natsUrl}`);

  const jsm = await nc.jetstreamManager();
  const js = nc.jetstream();

  try {
    // Ensure telemetry stream exists
    try {
      await jsm.streams.info(config.telemetryStream);
      console.log(`✅ Stream ${config.telemetryStream} exists`);
    } catch {
      console.log(`📦 Creating stream ${config.telemetryStream}...`);
      await jsm.streams.add({
        name: config.telemetryStream,
        subjects: [`${config.telemetryStream}.*`],
        retention: 'limits',
        max_msgs: 1000000,
        max_age: 24 * 60 * 60 * 1000000000 // 24 hours in nanoseconds
      });
    }

    // Ensure emotions stream exists
    try {
      await jsm.streams.info(config.emotionsStream);
      console.log(`✅ Stream ${config.emotionsStream} exists`);
    } catch {
      console.log(`📦 Creating stream ${config.emotionsStream}...`);
      await jsm.streams.add({
        name: config.emotionsStream,
        subjects: [`${config.emotionsStream}.*`],
        retention: 'limits',
        max_msgs: 100000,
        max_age: 60 * 60 * 1000000000 // 1 hour in nanoseconds
      });
    }

    // Create or get durable consumer
    let consumer;
    try {
      // Try to get existing consumer
      consumer = await js.consumers.get(config.telemetryStream, config.consumerName);
      console.log(`✅ Using existing consumer ${config.consumerName}`);
    } catch {
      // Create new consumer using JetStream manager
      console.log(`📦 Creating consumer ${config.consumerName}...`);
      await jsm.consumers.add(config.telemetryStream, {
        durable_name: config.consumerName,
        ack_policy: 'explicit',
        deliver_policy: 'all',
        filter_subject: `${config.telemetryStream}.events`
      });
      consumer = await js.consumers.get(config.telemetryStream, config.consumerName);
    }

    console.log('🎯 Starting to consume telemetry events...');

    // Process messages
    const messages = await consumer.consume();
    for await (const msg of messages) {
      try {
        const data = jc.decode(msg.data);
        const { sessionId, events, url, timestamp } = data;

        if (!events || events.length === 0) {
          msg.ack();
          continue;
        }

        // Get or create session state
        let sessionState = sessionStates.get(sessionId) || {
          lastEmotion: null,
          lastPublished: 0,
          lastSeen: Date.now(),
          eventBuffer: []
        };

        // Add events to buffer
        sessionState.eventBuffer.push(...events);
        sessionState.lastSeen = Date.now();

        // Keep only last 30 seconds of events
        const cutoff = Date.now() - 30000;
        sessionState.eventBuffer = sessionState.eventBuffer
          .filter(e => (e.timestamp || cutoff + 1) > cutoff);

        // Calculate emotions
        const emotional = calculateEmotions(sessionState.eventBuffer);

        // Check if we should publish
        const shouldPublish =
          emotional.confidence > 20 && (
            emotional.dominant !== sessionState.lastEmotion ||
            Date.now() - sessionState.lastPublished > EMOTION_THROTTLE_MS
          );

        if (shouldPublish) {
          // Publish to emotions stream
          await js.publish(`${config.emotionsStream}.state`, jc.encode({
            sessionId,
            url,
            ...emotional,
            eventCount: sessionState.eventBuffer.length
          }));

          if (config.debug) {
            console.log(`🎭 ${sessionId}: ${emotional.dominant} (${emotional.confidence}%)`);
          }

          sessionState.lastEmotion = emotional.dominant;
          sessionState.lastPublished = Date.now();
        }

        // Update session state
        sessionStates.set(sessionId, sessionState);

        msg.ack();
      } catch (error) {
        console.error('❌ Error processing message:', error);
        msg.nak();
      }
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Start the processor
startProcessor().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 Shutting down gracefully...');
  process.exit(0);
});