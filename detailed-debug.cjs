#!/usr/bin/env node
/**
 * Detailed debugging of the NATS pipeline
 */

const { connect, JSONCodec } = require('nats');

const jc = JSONCodec();

async function detailedDebug() {
  console.log('🔍 Starting detailed NATS pipeline debug...');

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

    // Track event type statistics
    const eventTypeStats = {};
    let totalBatches = 0;
    let emotionsGenerated = 0;

    // Handle telemetry
    (async () => {
      for await (const msg of telemetrySub) {
        const data = jc.decode(msg.data);
        totalBatches++;

        console.log(`\n📡 TELEMETRY BATCH #${totalBatches}`);
        console.log(`   Session: ${data.sessionId}`);
        console.log(`   Events: ${data.events?.length || 0}`);

        if (data.events && data.events.length > 0) {
          // Count event types
          const typesInBatch = {};
          data.events.forEach(e => {
            const type = e.type || 'undefined';
            typesInBatch[type] = (typesInBatch[type] || 0) + 1;
            eventTypeStats[type] = (eventTypeStats[type] || 0) + 1;
          });

          console.log('   Event types in batch:');
          Object.entries(typesInBatch).forEach(([type, count]) => {
            console.log(`     - ${type}: ${count}`);
          });

          // Show first event details as sample
          console.log('   Sample event:', JSON.stringify(data.events[0], null, 2));
        }

        // Every 10 batches, show statistics
        if (totalBatches % 10 === 0) {
          console.log('\n📊 STATISTICS after', totalBatches, 'batches:');
          console.log('   Total event types seen:');
          Object.entries(eventTypeStats).forEach(([type, count]) => {
            console.log(`     - ${type}: ${count} events`);
          });
          console.log(`   Emotions generated: ${emotionsGenerated}`);
        }
      }
    })();

    // Handle emotions
    (async () => {
      for await (const msg of emotionSub) {
        const emotion = jc.decode(msg.data);
        emotionsGenerated++;
        console.log(`\n🎭 EMOTION GENERATED:`);
        console.log(`   Session: ${emotion.sessionId}`);
        console.log(`   Emotion: ${emotion.emotion} (${emotion.confidence}%)`);
        console.log(`   Event count: ${emotion.eventCount}`);
        console.log(`   Scores:`, emotion.scores);
      }
    })();

    // Keep running
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

detailedDebug();