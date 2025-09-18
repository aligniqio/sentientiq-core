#!/usr/bin/env node
// Send rage clicks directly to test the pipeline

const { connect, JSONCodec } = require('nats');

async function test() {
  const jc = JSONCodec();
  const nc = await connect({ servers: 'nats://98.87.12.130:4222' });
  const js = nc.jetstream();
  
  console.log('Sending rage click pattern directly...');
  
  const events = [
    { type: 'rage_click', timestamp: Date.now() },
    { type: 'rage_click', timestamp: Date.now() + 100 },
    { type: 'click', timestamp: Date.now() + 200 },
    { type: 'click', timestamp: Date.now() + 300 },
    { type: 'erratic_movement', timestamp: Date.now() + 400 },
    { type: 'rapid_click', timestamp: Date.now() + 500 }
  ];
  
  await js.publish('TELEMETRY.events', jc.encode({
    sessionId: 'direct-test-' + Date.now(),
    tenantId: 'test',
    url: 'https://test.com',
    timestamp: Date.now(),
    events: events
  }));
  
  console.log('✅ Sent:', events.map(e => e.type).join(', '));
  
  await nc.drain();
}

test().catch(console.error);
