#!/usr/bin/env node
// Test full behavioral spectrum to verify emotion detection

const { connect, JSONCodec } = require('nats');

async function test() {
  const jc = JSONCodec();
  const nc = await connect({ servers: 'nats://98.87.12.130:4222' });
  const js = nc.jetstream();

  const sessionId = 'full-test-' + Date.now();

  console.log('🚀 Starting full behavioral spectrum test...');
  console.log('Session:', sessionId);
  console.log('');

  // Test 1: Sticker Shock Pattern
  console.log('📊 Test 1: Sticker Shock Pattern');
  await js.publish('TELEMETRY.events', jc.encode({
    sessionId: sessionId,
    tenantId: 'test',
    url: 'https://sentientiq.app/pricing',
    timestamp: Date.now(),
    events: [
      { type: 'price_selection', timestamp: Date.now() },
      { type: 'mouse_exit', timestamp: Date.now() + 100 },
      { type: 'rapid_scroll', timestamp: Date.now() + 200 },
      { type: 'tab_switch', timestamp: Date.now() + 300, data: { action: 'away' } }
    ]
  }));
  console.log('✅ Sent: price_selection → mouse_exit → rapid_scroll → tab_switch');

  await sleep(2000);

  // Test 2: Rage Click Pattern
  console.log('\n📊 Test 2: Rage Click Pattern');
  await js.publish('TELEMETRY.events', jc.encode({
    sessionId: sessionId,
    tenantId: 'test',
    url: 'https://sentientiq.app/dashboard',
    timestamp: Date.now(),
    events: [
      { type: 'rage_click', timestamp: Date.now() },
      { type: 'rage_click', timestamp: Date.now() + 50 },
      { type: 'rage_click', timestamp: Date.now() + 100 },
      { type: 'erratic_movement', timestamp: Date.now() + 150 },
      { type: 'rapid_click', timestamp: Date.now() + 200 }
    ]
  }));
  console.log('✅ Sent: rage_click x3 → erratic_movement → rapid_click');

  await sleep(2000);

  // Test 3: Purchase Funnel Pattern
  console.log('\n📊 Test 3: Purchase Funnel Pattern');
  await js.publish('TELEMETRY.events', jc.encode({
    sessionId: sessionId,
    tenantId: 'test',
    url: 'https://sentientiq.app/checkout',
    timestamp: Date.now(),
    events: [
      { type: 'form_focus', timestamp: Date.now(), data: { field: 'email' } },
      { type: 'form_blur', timestamp: Date.now() + 1000, data: { field: 'email', hasValue: true } },
      { type: 'form_focus', timestamp: Date.now() + 1500, data: { field: 'card' } },
      { type: 'dwell', timestamp: Date.now() + 2000, data: { duration: 3000 } },
      { type: 'form_submit', timestamp: Date.now() + 5000 }
    ]
  }));
  console.log('✅ Sent: form_focus → form_blur → form_focus → dwell → form_submit');

  await sleep(2000);

  // Test 4: Comparison Shopping Pattern
  console.log('\n📊 Test 4: Comparison Shopping Pattern');
  await js.publish('TELEMETRY.events', jc.encode({
    sessionId: sessionId,
    tenantId: 'test',
    url: 'https://sentientiq.app/features',
    timestamp: Date.now(),
    events: [
      { type: 'tab_switch', timestamp: Date.now(), data: { action: 'away' } },
      { type: 'tab_switch', timestamp: Date.now() + 30000, data: { action: 'return', awayDuration: 30000 } },
      { type: 'price_selection', timestamp: Date.now() + 31000 },
      { type: 'scroll', timestamp: Date.now() + 32000, data: { depth: 100 } }
    ]
  }));
  console.log('✅ Sent: tab_switch(away) → tab_switch(return) → price_selection → scroll');

  await sleep(2000);

  // Test 5: Abandonment Risk Pattern
  console.log('\n📊 Test 5: Abandonment Risk Pattern');
  await js.publish('TELEMETRY.events', jc.encode({
    sessionId: sessionId,
    tenantId: 'test',
    url: 'https://sentientiq.app/signup',
    timestamp: Date.now(),
    events: [
      { type: 'form_focus', timestamp: Date.now(), data: { field: 'email' } },
      { type: 'form_blur', timestamp: Date.now() + 500, data: { field: 'email', hasValue: false } },
      { type: 'exit_intent', timestamp: Date.now() + 1000 },
      { type: 'mouse_exit', timestamp: Date.now() + 1100, data: { edge: 'top' } }
    ]
  }));
  console.log('✅ Sent: form_focus → form_blur(empty) → exit_intent → mouse_exit');

  console.log('\n✨ All test patterns sent!');
  console.log('Check the emotion processor logs to verify detection.');

  await nc.drain();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test().catch(console.error);