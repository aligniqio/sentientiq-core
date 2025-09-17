/**
 * Test Intervention Client
 * Simulates the /pulse dashboard intervention WebSocket connection
 */

const WebSocket = require('ws');

const BROADCASTER_URL = process.env.BROADCASTER_URL || 'ws://localhost:3004/ws/interventions';

console.log(`🎯 Connecting to intervention broadcaster at ${BROADCASTER_URL}...`);

const ws = new WebSocket(BROADCASTER_URL);

ws.on('open', () => {
  console.log('✅ Connected to intervention broadcaster');

  // Subscribe to interventions
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'interventions'
  }));

  // Send periodic pings
  setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping' }));
  }, 30000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);

    switch(message.type) {
      case 'connection':
        console.log(`🔗 Connection established: ${message.connectionId}`);
        break;

      case 'subscribed':
        console.log('📡 Subscription confirmed to:', message.channel);
        break;

      case 'intervention_triggered':
        console.log(`
╔════════════════════════════════════════════════╗
║ 🎯 INTERVENTION TRIGGERED                      ║
╠════════════════════════════════════════════════╣
║ Session: ${message.sessionId.substring(0, 20)}...
║ Type: ${message.interventionType.toUpperCase()}
║ Reason: ${message.reason}
║ Emotion: ${message.emotion}
║ Confidence: ${message.confidence}%
║ Priority: ${message.priority}
║ Timing: ${message.timing}
╠════════════════════════════════════════════════╣
║ Time: ${new Date(message.timestamp).toLocaleTimeString()}
╚════════════════════════════════════════════════╝
        `);
        break;

      case 'intervention_completed':
        console.log(`✅ Intervention completed: ${message.sessionId} - Result: ${message.result}`);
        break;

      case 'stats':
        console.log(`
📊 STATS UPDATE:
  Total Shown: ${message.stats.totalShown}
  Total Converted: ${message.stats.totalConverted}
  Active: ${message.stats.activeInterventions}
  Success Rate: ${message.stats.successRate.toFixed(1)}%
        `);
        break;

      case 'pong':
        // Ping response received
        break;

      case 'shutdown':
        console.log('⚠️ Server shutting down:', message.message);
        break;

      default:
        console.log('📨 Message:', message);
    }
  } catch (error) {
    console.error('Failed to parse message:', error);
    console.log('Raw message:', data.toString());
  }
});

ws.on('close', () => {
  console.log('❌ Disconnected from broadcaster');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Closing intervention client...');
  ws.close();
  process.exit(0);
});

console.log(`
╔════════════════════════════════════════════════╗
║   TEST INTERVENTION CLIENT                     ║
╠════════════════════════════════════════════════╣
║   Listening for intervention decisions...      ║
║   Press Ctrl+C to exit                         ║
╚════════════════════════════════════════════════╝
`);