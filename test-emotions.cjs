#!/usr/bin/env node
/**
 * Test emotion publishing directly to NATS
 * Simulates emotions to verify the pipeline
 */

const { connect, JSONCodec } = require('nats');

const jc = JSONCodec();

async function testEmotions() {
  console.log('🚀 Starting emotion test publisher...');

  try {
    const nc = await connect({
      servers: 'nats://localhost:4222'
    });
    console.log('✅ Connected to NATS');

    const emotions = [
      { emotion: 'frustration', confidence: 85, frustration: 85, anxiety: 60 },
      { emotion: 'confidence', confidence: 70, trust: 80, excitement: 60 },
      { emotion: 'rage', confidence: 95, frustration: 95, anxiety: 90 },
      { emotion: 'delight', confidence: 80, excitement: 85, trust: 70 },
      { emotion: 'purchase_intent', confidence: 75, trust: 90, excitement: 70 }
    ];

    console.log('📡 Publishing test emotions...');

    let index = 0;
    const interval = setInterval(async () => {
      const emotion = emotions[index % emotions.length];
      const event = {
        sessionId: `test-${Date.now()}`,
        tenantId: 'test',
        ...emotion,
        timestamp: new Date().toISOString()
      };

      await nc.publish('EMOTIONS.state', jc.encode(event));
      console.log(`🎭 Published: ${emotion.emotion} (${emotion.confidence}%)`);

      index++;

      // Stop after 10 emotions
      if (index >= 10) {
        clearInterval(interval);
        console.log('✅ Test complete - published 10 emotions');
        await nc.drain();
        process.exit(0);
      }
    }, 2000); // Every 2 seconds

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testEmotions();