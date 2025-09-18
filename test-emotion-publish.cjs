#!/usr/bin/env node

const { connect, JSONCodec } = require('nats');

async function testEmotionPublish() {
  const jc = JSONCodec();
  const nc = await connect({ servers: 'nats://98.87.12.130:4222' });

  console.log('Connected to NATS');

  const emotion = {
    sessionId: 'test-dashboard-' + Date.now(),
    tenantId: 'test',
    url: 'https://test.com',
    emotion: 'frustration',
    confidence: 85,
    scores: {
      frustration: 85,
      confusion: 20,
      interest: 10,
      excitement: 0,
      intention: 15
    },
    timestamp: new Date().toISOString(),
    eventCount: 25
  };

  console.log('Publishing emotion:', emotion);
  await nc.publish('EMOTIONS.state', jc.encode(emotion));

  console.log('Emotion published to EMOTIONS.state');

  await nc.drain();
  process.exit(0);
}

testEmotionPublish().catch(console.error);