#!/usr/bin/env node
/**
 * Test the NATS pipeline directly
 */

const { connect, JSONCodec } = require('nats');

const jc = JSONCodec();

async function testPipeline() {
  console.log('🚀 Testing NATS pipeline...');

  try {
    const nc = await connect({
      servers: 'nats://98.87.12.130:4222'
    });
    console.log('✅ Connected to NATS');

    // Create test telemetry event
    const telemetryEvent = {
      sessionId: 'test-session-' + Date.now(),
      tenantId: 'test',
      url: 'https://test.com',
      timestamp: Date.now(),
      events: [
        { type: 'click', x: 100, y: 200, timestamp: Date.now() },
        { type: 'click', x: 100, y: 200, timestamp: Date.now() + 100 },
        { type: 'click', x: 100, y: 200, timestamp: Date.now() + 200 },
        { type: 'click', x: 100, y: 200, timestamp: Date.now() + 300 },
        { type: 'click', x: 100, y: 200, timestamp: Date.now() + 400 }
      ]
    };

    console.log('📡 Publishing to TELEMETRY.events...');
    await nc.publish('TELEMETRY.events', jc.encode(telemetryEvent));
    console.log('✅ Published telemetry event');

    // Also listen for emotions
    const sub = nc.subscribe('EMOTIONS.state');
    console.log('👂 Listening for emotions...');

    setTimeout(async () => {
      console.log('✅ Test complete');
      sub.unsubscribe();
      await nc.drain();
      process.exit(0);
    }, 5000);

    for await (const msg of sub) {
      const emotion = jc.decode(msg.data);
      console.log('🎭 Emotion received:', emotion);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPipeline();