#!/usr/bin/env node

const { connect, JSONCodec } = require('nats');

async function testVariedEvents() {
  const jc = JSONCodec();
  const nc = await connect({ servers: 'nats://98.87.12.130:4222' });

  console.log('Connected to NATS');

  const sessionId = 'test-varied-' + Date.now();

  // Test different event combinations
  const testBatches = [
    {
      name: 'Rage clicks',
      events: [
        { type: 'rage_click', timestamp: Date.now() },
        { type: 'click', timestamp: Date.now() + 100 },
        { type: 'click', timestamp: Date.now() + 200 }
      ]
    },
    {
      name: 'Text selection',
      events: [
        { type: 'text_selection', timestamp: Date.now() },
        { type: 'price_selection', timestamp: Date.now() + 100 }
      ]
    },
    {
      name: 'Mixed interaction',
      events: [
        { type: 'hover', timestamp: Date.now() },
        { type: 'click', timestamp: Date.now() + 100 },
        { type: 'scroll', timestamp: Date.now() + 200, velocity: 50 },
        { type: 'form_focus', timestamp: Date.now() + 300 }
      ]
    }
  ];

  for (const batch of testBatches) {
    const telemetryEvent = {
      sessionId,
      tenantId: 'test',
      url: 'https://test.com',
      timestamp: Date.now(),
      events: batch.events
    };

    console.log(`\n📡 Publishing ${batch.name}:`, batch.events.map(e => e.type).join(', '));
    await nc.publish('TELEMETRY.events', jc.encode(telemetryEvent));

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Test complete');
  await nc.drain();
  process.exit(0);
}

testVariedEvents().catch(console.error);