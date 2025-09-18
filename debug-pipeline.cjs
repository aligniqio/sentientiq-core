#!/usr/bin/env node
/**
 * Debug the NATS pipeline - listen to all subjects
 */

const { connect, JSONCodec } = require('nats');

const jc = JSONCodec();

async function debugPipeline() {
  console.log('🔍 Debugging NATS pipeline...');

  try {
    const nc = await connect({
      servers: 'nats://98.87.12.130:4222'
    });
    console.log('✅ Connected to NATS');

    // Subscribe to telemetry events
    const telemetrySub = nc.subscribe('TELEMETRY.events');
    console.log('👂 Listening to TELEMETRY.events');

    // Subscribe to emotion events
    const emotionSub = nc.subscribe('EMOTIONS.state');
    console.log('👂 Listening to EMOTIONS.state');

    // Handle telemetry
    (async () => {
      for await (const msg of telemetrySub) {
        const data = jc.decode(msg.data);
        console.log(`📡 TELEMETRY: Session ${data.sessionId}, ${data.events?.length || 0} events`);
        if (data.events && data.events.length > 0) {
          console.log('   Event types:', data.events.map(e => e.type).join(', '));
        }
      }
    })();

    // Handle emotions
    (async () => {
      for await (const msg of emotionSub) {
        const emotion = jc.decode(msg.data);
        console.log(`🎭 EMOTION: ${emotion.emotion} (${emotion.confidence}%) for session ${emotion.sessionId}`);
      }
    })();

    // Keep running
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugPipeline();