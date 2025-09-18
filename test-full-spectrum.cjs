#!/usr/bin/env node
// Test full emotional spectrum with real-time monitoring

const { connect, JSONCodec } = require('nats');

async function testSpectrum() {
  const jc = JSONCodec();
  const nc = await connect({ servers: 'nats://98.87.12.130:4222' });
  const js = nc.jetstream();
  
  console.log('🌈 Testing Full Emotional Spectrum\n');
  
  // First, subscribe to emotions to see what comes back
  const emotionSub = nc.subscribe('EMOTIONS.state');
  const receivedEmotions = [];
  
  (async () => {
    for await (const msg of emotionSub) {
      const emotion = jc.decode(msg.data);
      if (emotion.sessionId.includes('spectrum-test')) {
        receivedEmotions.push(emotion);
        const patterns = emotion.patterns?.length > 0 ? ` [${emotion.patterns.join(', ')}]` : '';
        console.log(`   ✅ ${emotion.emotion.toUpperCase()} @ ${emotion.confidence}%${patterns}`);
      }
    }
  })();
  
  const scenarios = [
    { 
      emotion: 'FRUSTRATION',
      events: [
        { type: 'rage_click', timestamp: Date.now() },
        { type: 'rage_click', timestamp: Date.now() + 100 },
        { type: 'erratic_movement', timestamp: Date.now() + 200 }
      ]
    },
    {
      emotion: 'CONFUSION',
      events: [
        { type: 'micro_gesture', metadata: { type: 'circle' }, timestamp: Date.now() },
        { type: 'micro_gesture', metadata: { type: 'zigzag' }, timestamp: Date.now() + 100 },
        { type: 'dwell', metadata: { duration: 1000 }, timestamp: Date.now() + 200 },
        { type: 'mouse_exit', timestamp: Date.now() + 300 }
      ]
    },
    {
      emotion: 'INTEREST',
      events: [
        { type: 'text_selection', timestamp: Date.now() },
        { type: 'dwell', metadata: { duration: 5000 }, timestamp: Date.now() + 100 },
        { type: 'scroll', metadata: { velocity: 50 }, timestamp: Date.now() + 200 },
        { type: 'viewport_boundary', metadata: { boundary: 'bottom' }, timestamp: Date.now() + 300 }
      ]
    },
    {
      emotion: 'INTENTION',
      events: [
        { type: 'price_selection', timestamp: Date.now() },
        { type: 'form_focus', metadata: { fieldName: 'email' }, timestamp: Date.now() + 100 },
        { type: 'click', metadata: { target: { text: 'Buy Now' }}, timestamp: Date.now() + 200 }
      ]
    },
    {
      emotion: 'HESITATION',
      events: [
        { type: 'form_focus', metadata: { fieldName: 'card' }, timestamp: Date.now() },
        { type: 'dwell', metadata: { duration: 8000 }, timestamp: Date.now() + 8000 },
        { type: 'form_blur', timestamp: Date.now() + 9000 },
        { type: 'scroll', metadata: { velocity: -100 }, timestamp: Date.now() + 10000 }
      ]
    }
  ];
  
  // Send test events
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`\n📤 Sending ${scenario.emotion} pattern...`);
    
    await js.publish('TELEMETRY.events', jc.encode({
      sessionId: `spectrum-test-${i}`,
      tenantId: 'test',
      url: 'https://test.com',
      timestamp: Date.now(),
      events: scenario.events
    }));
    
    await new Promise(r => setTimeout(r, 1500));
  }
  
  // Wait a bit more for processing
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('\n📊 RESULTS:');
  console.log(`Emotions detected: ${receivedEmotions.length}`);
  
  const emotionTypes = {};
  receivedEmotions.forEach(e => {
    emotionTypes[e.emotion] = (emotionTypes[e.emotion] || 0) + 1;
  });
  
  console.log('Distribution:', emotionTypes);
  console.log('✅ Test complete!');
  
  emotionSub.unsubscribe();
  await nc.drain();
}

testSpectrum().catch(console.error);
