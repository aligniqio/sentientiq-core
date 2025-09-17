/**
 * Test Emotion Injector
 * Simulates emotional states for testing the broadcaster
 */

const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Test emotional states matching intervention triggers
const testEmotions = [
  {
    sessionId: 'test_session_001',
    tenantId: 'test_tenant',
    emotion: 'cart_shock',
    confidence: 85,
    intensity: 85,
    frustration: 20,
    anxiety: 75,
    urgency: 60,
    excitement: 10,
    trust: 40,
    pageUrl: '/cart',
    sessionAge: 45000,
    timestamp: new Date().toISOString()
  },
  {
    sessionId: 'test_session_002',
    tenantId: 'test_tenant',
    emotion: 'sticker_shock',
    confidence: 78,
    intensity: 78,
    frustration: 15,
    anxiety: 80,
    urgency: 30,
    excitement: 5,
    trust: 35,
    pageUrl: '/pricing',
    sessionAge: 30000,
    timestamp: new Date().toISOString()
  },
  {
    sessionId: 'test_session_003',
    tenantId: 'test_tenant',
    emotion: 'abandonment_intent',
    confidence: 92,
    intensity: 92,
    frustration: 45,
    anxiety: 60,
    urgency: 85,
    excitement: 0,
    trust: 20,
    pageUrl: '/checkout',
    sessionAge: 120000,
    timestamp: new Date().toISOString()
  },
  {
    sessionId: 'test_session_004',
    tenantId: 'test_tenant',
    emotion: 'confusion',
    confidence: 77,
    intensity: 77,
    frustration: 65,
    anxiety: 55,
    urgency: 40,
    excitement: 10,
    trust: 45,
    pageUrl: '/features',
    sessionAge: 60000,
    timestamp: new Date().toISOString()
  },
  {
    sessionId: 'test_session_005',
    tenantId: 'test_tenant',
    emotion: 'purchase_intent',
    confidence: 82,
    intensity: 82,
    frustration: 10,
    anxiety: 25,
    urgency: 70,
    excitement: 75,
    trust: 80,
    pageUrl: '/pricing',
    sessionAge: 90000,
    timestamp: new Date().toISOString()
  }
];

async function injectEmotions() {
  console.log('💉 Injecting test emotional states...\n');

  let index = 0;

  const interval = setInterval(async () => {
    const emotion = testEmotions[index % testEmotions.length];

    // Update timestamp
    emotion.timestamp = new Date().toISOString();

    // Publish to Redis
    await redis.publish('emotional_states', JSON.stringify(emotion));

    console.log(`✅ Injected: ${emotion.emotion} (${emotion.confidence}%) for ${emotion.sessionId}`);

    index++;

    // Stop after 2 cycles
    if (index >= testEmotions.length * 2) {
      clearInterval(interval);
      console.log('\n✨ Test injection complete!');
      setTimeout(() => {
        redis.quit();
        process.exit(0);
      }, 1000);
    }
  }, 2000); // Every 2 seconds
}

// Start injection
redis.on('connect', () => {
  console.log('✅ Redis connected\n');
  injectEmotions();
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
  process.exit(1);
});