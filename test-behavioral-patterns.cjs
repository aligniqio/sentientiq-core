#!/usr/bin/env node
/**
 * Test Behavioral Patterns
 * Simulates realistic user journeys to test pattern detection
 */

const { connect, JSONCodec } = require('nats');

async function simulateBehavior() {
  const jc = JSONCodec();
  const nc = await connect({ servers: 'nats://98.87.12.130:4222' });
  const js = nc.jetstream();

  console.log('🎭 Testing Behavioral Pattern Recognition\n');

  const scenarios = [
    {
      name: '💸 STICKER SHOCK',
      description: 'User clicks pricing, sees high price, panics and leaves',
      events: [
        { type: 'hover', timestamp: Date.now(), metadata: { target: { text: 'View Pricing', class: 'pricing-link' }}},
        { type: 'click', timestamp: Date.now() + 500, metadata: { target: { text: 'View Pricing', class: 'pricing-link' }}},
        { type: 'scroll', timestamp: Date.now() + 1500, metadata: { velocity: 200 }},
        { type: 'scroll', timestamp: Date.now() + 2000, metadata: { velocity: 900 }}, // Fast scroll
        { type: 'erratic_movement', timestamp: Date.now() + 2500 },
        { type: 'mouse_exit', timestamp: Date.now() + 3000 },
        { type: 'exit_intent', timestamp: Date.now() + 3100 }
      ]
    },
    {
      name: '🛒 COMPARISON SHOPPING',
      description: 'User copying prices, switching tabs to compare',
      events: [
        { type: 'hover', timestamp: Date.now(), metadata: { target: { text: '$99/month' }}},
        { type: 'text_selection', timestamp: Date.now() + 1000, metadata: { text: '$99/month' }},
        { type: 'price_selection', timestamp: Date.now() + 1100 },
        { type: 'tab_switch', timestamp: Date.now() + 2000, metadata: { action: 'leave' }},
        { type: 'tab_switch', timestamp: Date.now() + 15000, metadata: { action: 'return', awayDuration: 13000 }},
        { type: 'scroll', timestamp: Date.now() + 16000, metadata: { velocity: 100 }},
        { type: 'text_selection', timestamp: Date.now() + 17000, metadata: { text: '$199/month' }},
        { type: 'price_selection', timestamp: Date.now() + 17100 },
        { type: 'tab_switch', timestamp: Date.now() + 18000, metadata: { action: 'leave' }}
      ]
    },
    {
      name: '🎯 HIGH PURCHASE INTENT',
      description: 'User methodically moving through purchase funnel',
      events: [
        { type: 'hover', timestamp: Date.now(), metadata: { target: { text: 'Features' }}},
        { type: 'click', timestamp: Date.now() + 1000, metadata: { target: { text: 'Features' }}},
        { type: 'scroll', timestamp: Date.now() + 2000, metadata: { velocity: 80 }}, // Slow, reading
        { type: 'dwell', timestamp: Date.now() + 3000, metadata: { duration: 4000 }},
        { type: 'text_selection', timestamp: Date.now() + 7000, metadata: { text: 'Unlimited users' }},
        { type: 'click', timestamp: Date.now() + 8000, metadata: { target: { text: 'View Pricing', class: 'pricing-cta' }}},
        { type: 'scroll', timestamp: Date.now() + 9000, metadata: { velocity: 60 }},
        { type: 'hover', timestamp: Date.now() + 10000, metadata: { target: { text: 'Enterprise Plan' }}},
        { type: 'click', timestamp: Date.now() + 11000, metadata: { target: { text: 'Get Started', class: 'button-primary' }}},
        { type: 'form_focus', timestamp: Date.now() + 12000, metadata: { fieldName: 'email' }},
        { type: 'viewport_boundary', timestamp: Date.now() + 13000, metadata: { boundary: 'bottom' }}
      ]
    },
    {
      name: '⚠️ ABANDONMENT RISK',
      description: 'User starts form but hesitates and stops',
      events: [
        { type: 'form_focus', timestamp: Date.now(), metadata: { fieldName: 'email' }},
        { type: 'input', timestamp: Date.now() + 2000 },
        { type: 'form_focus', timestamp: Date.now() + 3000, metadata: { fieldName: 'name' }},
        { type: 'input', timestamp: Date.now() + 4000 },
        { type: 'form_focus', timestamp: Date.now() + 5000, metadata: { fieldName: 'card' }},
        // Long pause - hesitation
        { type: 'dwell', timestamp: Date.now() + 12000, metadata: { duration: 7000 }},
        { type: 'form_blur', timestamp: Date.now() + 13000 },
        { type: 'scroll', timestamp: Date.now() + 14000, metadata: { velocity: -200 }}, // Scrolling back up
        { type: 'mouse_exit', timestamp: Date.now() + 15000 }
      ]
    },
    {
      name: '😤 FRUSTRATION SPIRAL',
      description: 'User repeatedly clicking broken element',
      events: [
        { type: 'click', timestamp: Date.now(), metadata: { target: { id: 'submit-btn' }}},
        { type: 'click', timestamp: Date.now() + 500, metadata: { target: { id: 'submit-btn' }}},
        { type: 'click', timestamp: Date.now() + 900, metadata: { target: { id: 'submit-btn' }}},
        { type: 'rapid_click', timestamp: Date.now() + 1000 },
        { type: 'rage_click', timestamp: Date.now() + 1200 },
        { type: 'erratic_movement', timestamp: Date.now() + 1500 },
        { type: 'rage_click', timestamp: Date.now() + 1700 },
        { type: 'exit_intent', timestamp: Date.now() + 2000 }
      ]
    }
  ];

  // Send each scenario
  for (const scenario of scenarios) {
    console.log(`\n📊 Testing: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log(`   Events: ${scenario.events.map(e => e.type).join(' → ')}`);

    const telemetryEvent = {
      sessionId: `behavioral-test-${Date.now()}`,
      tenantId: 'test',
      url: 'https://test.sentientiq.app',
      timestamp: Date.now(),
      events: scenario.events
    };

    await js.publish('TELEMETRY.events', jc.encode(telemetryEvent));

    // Wait to see the emotion output
    await new Promise(r => setTimeout(r, 3000));
  }

  await nc.drain();
  console.log('\n✅ Behavioral pattern test complete');
}

simulateBehavior().catch(console.error);