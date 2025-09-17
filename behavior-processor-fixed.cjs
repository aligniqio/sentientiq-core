/**
 * Behavior Processor with Position Tracking
 * Prevents flooding by tracking last processed Redis stream position
 */

const Redis = require('ioredis');

// Redis connections
const streamRedis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});

const pubRedis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});

// Position tracking key
const POSITION_KEY = 'behavior:last_processed_id';

// Rate limiting
const MAX_EVENTS_PER_BATCH = 100;
const BATCH_INTERVAL_MS = 100;

// Emotion deduplication and throttling
const lastEmotionPublished = new Map(); // sessionId -> { emotion, confidence, timestamp }
const EMOTION_THROTTLE_MS = 5000; // Only publish if emotion changes or 5 seconds have passed
const SESSION_CLEANUP_MS = 30 * 60 * 1000; // Clean up old sessions after 30 minutes

// Cleanup old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of lastEmotionPublished.entries()) {
    if (now - data.timestamp > SESSION_CLEANUP_MS) {
      lastEmotionPublished.delete(sessionId);
      console.log(`Cleaned up old session: ${sessionId}`);
    }
  }
}, SESSION_CLEANUP_MS);

// Emotion calculation with proper capping
function calculateEmotionalVector(events) {
  // Initialize vectors
  let frustration = 0;
  let confusion = 0;
  let interest = 0;
  let excitement = 0;

  // Weight recent events more heavily
  const now = Date.now();
  const timeWindow = 5 * 60 * 1000; // 5 minute window

  events.forEach(event => {
    const age = now - new Date(event.timestamp).getTime();
    const weight = Math.max(0, 1 - (age / timeWindow));

    switch(event.eventType) {
      case 'rage_click':
        frustration += 30 * weight;
        break;
      case 'tremor':
        // High power tremor indicates frustration/anxiety
        if (event.power > 100) {
          frustration += 20 * weight;
          confusion += 10 * weight;
        } else if (event.power > 30) {
          frustration += 10 * weight;
          confusion += 5 * weight;
        } else if (event.power > 10) {
          confusion += 3 * weight;
        }
        break;
      case 'error':
        frustration += 20 * weight;
        confusion += 10 * weight;
        break;
      case 'form_abandon':
        frustration += 15 * weight;
        break;
      case 'scroll_speed':
      case 'scroll':
        if (event.velocity > 2000 || event.speed > 2000) {
          frustration += 10 * weight;
        } else if (event.velocity > 1000 || event.speed > 1000) {
          confusion += 5 * weight;
        }
        break;
      case 'time_on_page':
      case 'dwell':
        if (event.duration > 30000) {
          interest += 10 * weight;
        }
        break;
      case 'click':
      case 'hover':
        interest += 2 * weight;
        break;
      case 'purchase_intent':
      case 'conversion':
        excitement += 20 * weight;
        interest += 10 * weight;
        break;
      case 'idle':
        // Long idle might indicate confusion or disinterest
        if (event.duration > 10000) {
          confusion += 5 * weight;
        }
        break;
    }
  });

  // Cap values at 100%
  return {
    frustration: Math.min(100, Math.round(frustration)),
    confusion: Math.min(100, Math.round(confusion)),
    interest: Math.min(100, Math.round(interest)),
    excitement: Math.min(100, Math.round(excitement))
  };
}

// Process a batch of stream messages
async function processBatch(messages) {
  const sessionEvents = {};

  // Group events by session
  for (const [id, fields] of messages) {
    try {
      // Parse Redis stream format (key-value pairs)
      const data = {};
      for (let i = 0; i < fields.length; i += 2) {
        const key = fields[i];
        const value = fields[i + 1];

        // Parse events array if present
        if (key === 'events') {
          data[key] = JSON.parse(value);
        } else {
          data[key] = value;
        }
      }

      // Process each event in the events array
      if (data.events && Array.isArray(data.events)) {
        for (const event of data.events) {
          const sessionId = event.sessionId || data.session || 'unknown';

          if (!sessionEvents[sessionId]) {
            sessionEvents[sessionId] = [];
          }

          sessionEvents[sessionId].push({
            eventType: event.type,
            ...event.data,
            sessionId,
            timestamp: event.timestamp,
            streamId: id
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  }

  // Calculate emotional states and publish
  for (const [sessionId, events] of Object.entries(sessionEvents)) {
    const emotional = calculateEmotionalVector(events);

    // Determine dominant emotion
    const emotions = Object.entries(emotional);
    const dominant = emotions.reduce((a, b) => a[1] > b[1] ? a : b);

    if (dominant[1] > 20) { // Only publish if emotion is significant
      const now = Date.now();
      const lastPublished = lastEmotionPublished.get(sessionId);

      // Check if we should publish (emotion changed, confidence changed significantly, or throttle time passed)
      const shouldPublish = !lastPublished ||
        lastPublished.emotion !== dominant[0] ||
        Math.abs(lastPublished.confidence - dominant[1]) > 10 ||
        (now - lastPublished.timestamp) > EMOTION_THROTTLE_MS;

      if (shouldPublish) {
        const event = {
          sessionId,
          emotion: dominant[0],
          confidence: dominant[1],
          vectors: emotional,
          timestamp: new Date().toISOString(),
          eventCount: events.length
        };

        // Publish to Redis for NATS bridge
        await pubRedis.publish('emotional_events', JSON.stringify(event));

        // Update last published tracking
        lastEmotionPublished.set(sessionId, {
          emotion: dominant[0],
          confidence: dominant[1],
          timestamp: now
        });

        console.log(`✅ Published emotion for session ${sessionId}:`, dominant[0], dominant[1]);
      } else {
        console.log(`⏭️  Skipping duplicate: ${sessionId} still ${dominant[0]} (${dominant[1]}%)`);
      }
    }
  }

  // Return the last processed ID
  return messages.length > 0 ? messages[messages.length - 1][0] : null;
}

// Main processing loop
async function startProcessor() {
  console.log('Starting behavior processor with position tracking...');

  // Get last processed position
  let lastId = await streamRedis.get(POSITION_KEY);

  if (!lastId) {
    // First run - start from current time to avoid processing history
    console.log('No previous position found, starting from $');
    lastId = '$';
  } else {
    console.log(`Resuming from position: ${lastId}`);
  }

  while (true) {
    try {
      // Read new messages with position tracking and rate limiting
      const result = await streamRedis.xread(
        'COUNT', MAX_EVENTS_PER_BATCH,
        'BLOCK', BATCH_INTERVAL_MS,
        'STREAMS', 'telemetry:raw',
        lastId
      );

      if (result && result.length > 0) {
        const messages = result[0][1]; // [['telemetry:raw', messages]]

        if (messages.length > 0) {
          console.log(`Processing ${messages.length} events...`);

          // Process the batch
          const processedId = await processBatch(messages);

          if (processedId) {
            // Update position
            lastId = processedId;
            await streamRedis.set(POSITION_KEY, lastId);
            console.log(`Updated position to: ${lastId}`);
          }
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
      // Don't crash - just continue
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await streamRedis.quit();
  await pubRedis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await streamRedis.quit();
  await pubRedis.quit();
  process.exit(0);
});

// Start processing
startProcessor().catch(console.error);