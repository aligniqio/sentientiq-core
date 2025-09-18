#!/usr/bin/env node

/**
 * Data Flow Diagnostic Tool
 * Traces telemetry data from script to dashboard
 */

const axios = require('axios');
const Redis = require('ioredis');
const { connect } = require('nats');

async function runDiagnostics() {
  console.log('🔍 SentientIQ Data Flow Diagnostics\n');
  console.log('=' .repeat(50));

  const results = {
    telemetryGateway: false,
    redisStream: false,
    behaviorProcessor: false,
    natsPublisher: false,
    natsProxy: false,
    dashboard: false
  };

  // 1. Check Telemetry Gateway
  console.log('\n1️⃣  TELEMETRY GATEWAY (Port 3011)');
  try {
    const response = await axios.get('http://98.87.12.130:3011/health', { timeout: 2000 });
    console.log('   ✅ Gateway is responding');
    results.telemetryGateway = true;

    // Send test event
    const testEvent = {
      type: 'diagnostic',
      timestamp: Date.now(),
      sessionId: 'test-' + Date.now(),
      data: { test: true }
    };

    await axios.post('http://98.87.12.130:3011/events', testEvent);
    console.log('   ✅ Test event sent successfully');
  } catch (error) {
    console.log('   ❌ Gateway error:', error.message);
  }

  // 2. Check Redis Stream
  console.log('\n2️⃣  REDIS STREAM');
  const redis = new Redis({ host: '98.87.12.130', port: 6379 });

  try {
    const streamLength = await redis.xlen('behavior:stream');
    console.log(`   📊 Stream length: ${streamLength} events`);

    if (streamLength > 0) {
      results.redisStream = true;

      // Get last entry
      const lastEntries = await redis.xrevrange('behavior:stream', '+', '-', 'COUNT', 1);
      if (lastEntries.length > 0) {
        const [id, fields] = lastEntries[0];
        console.log(`   📍 Last entry ID: ${id}`);
        console.log(`   ⏰ Last entry time: ${new Date(parseInt(id.split('-')[0]))} ago`);
      }
    } else {
      console.log('   ⚠️  Stream is empty');
    }

    // Check if processor is tracking position
    const lastProcessed = await redis.get('behavior:last_processed_id');
    if (lastProcessed) {
      console.log(`   🔖 Last processed: ${lastProcessed}`);

      // Calculate lag
      if (streamLength > 0) {
        const pending = await redis.xpending('behavior:stream', 'processors');
        console.log(`   ⏳ Pending messages: ${pending ? pending[0] : 0}`);
      }
    }
  } catch (error) {
    console.log('   ❌ Redis error:', error.message);
  }

  // 3. Check Behavior Processor
  console.log('\n3️⃣  BEHAVIOR PROCESSOR');
  try {
    // Check if emotions are being published
    const emotionsKey = 'emotional:state:*';
    const keys = await redis.keys(emotionsKey);
    console.log(`   🎭 Active emotion states: ${keys.length}`);

    if (keys.length > 0) {
      results.behaviorProcessor = true;
      const sample = await redis.get(keys[0]);
      if (sample) {
        const emotion = JSON.parse(sample);
        console.log(`   📊 Sample emotion: ${emotion.emotion || 'unknown'} (${emotion.confidence || 0}%)`);
      }
    }

    // Check publish channel
    const pubsub = new Redis({ host: '98.87.12.130', port: 6379 });
    let messageReceived = false;

    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        pubsub.unsubscribe();
        resolve();
      }, 2000);

      pubsub.subscribe('emotional:updates', (err) => {
        if (!err) {
          console.log('   📡 Subscribed to emotional:updates channel');
        }
      });

      pubsub.on('message', (channel, message) => {
        console.log(`   ✅ Received update on ${channel}`);
        messageReceived = true;
        clearTimeout(timeout);
        pubsub.unsubscribe();
        resolve();
      });
    });

    if (!messageReceived) {
      console.log('   ⚠️  No messages received in 2 seconds');
    }

    pubsub.disconnect();
  } catch (error) {
    console.log('   ❌ Processor error:', error.message);
  }

  // 4. Check NATS
  console.log('\n4️⃣  NATS JETSTREAM');
  try {
    const nc = await connect({ servers: '98.87.12.130:4222' });
    console.log('   ✅ Connected to NATS');
    results.natsPublisher = true;

    const jsm = await nc.jetstreamManager();
    const streams = await jsm.streams.list().next();
    console.log(`   📊 Streams: ${streams.length || 0}`);

    if (streams.length > 0) {
      for (const stream of streams) {
        const info = await jsm.streams.info(stream.config.name);
        console.log(`   📁 ${stream.config.name}: ${info.state.messages} messages`);
      }
    }

    await nc.close();
  } catch (error) {
    console.log('   ❌ NATS error:', error.message);
  }

  // 5. Check WebSocket Proxy
  console.log('\n5️⃣  NATS WEBSOCKET PROXY (Port 8080)');
  try {
    const response = await axios.get('http://98.87.12.130:8080/', { timeout: 2000 });
    console.log('   ✅ WebSocket proxy is responding');
    results.natsProxy = true;
  } catch (error) {
    console.log('   ❌ Proxy error:', error.message);
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 FLOW SUMMARY:');
  console.log(`   Telemetry Gateway: ${results.telemetryGateway ? '✅' : '❌'}`);
  console.log(`   Redis Stream:      ${results.redisStream ? '✅' : '❌'}`);
  console.log(`   Behavior Processor:${results.behaviorProcessor ? '✅' : '❌'}`);
  console.log(`   NATS Publisher:    ${results.natsPublisher ? '✅' : '❌'}`);
  console.log(`   WebSocket Proxy:   ${results.natsProxy ? '✅' : '❌'}`);

  const workingCount = Object.values(results).filter(v => v).length;
  const totalCount = Object.values(results).length;

  console.log(`\n🎯 Health Score: ${workingCount}/${totalCount} components working`);

  if (workingCount < totalCount) {
    console.log('\n⚠️  ISSUES DETECTED:');

    if (!results.behaviorProcessor && results.redisStream) {
      console.log('   • Behavior processor not consuming Redis stream');
      console.log('     → Check processor logs: pm2 logs behavior-processor');
    }

    if (!results.natsPublisher && results.behaviorProcessor) {
      console.log('   • NATS publisher not receiving emotions');
      console.log('     → Check publisher logs: pm2 logs nats-publisher');
    }

    if (!results.natsProxy) {
      console.log('   • WebSocket proxy down - dashboard cannot connect');
      console.log('     → Restart: pm2 restart nats-ws-proxy');
    }
  }

  redis.disconnect();
  process.exit(0);
}

// Run diagnostics
runDiagnostics().catch(console.error);