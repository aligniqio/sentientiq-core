/**
 * Test Dashboard Client
 * Simulates the /pulse dashboard WebSocket connection
 */

const WebSocket = require('ws');

const BROADCASTER_URL = process.env.BROADCASTER_URL || 'ws://localhost:3003/ws/emotions';

console.log(`🖥️  Connecting to broadcaster at ${BROADCASTER_URL}...`);

const ws = new WebSocket(BROADCASTER_URL);

ws.on('open', () => {
  console.log('✅ Connected to emotional broadcaster');

  // Subscribe to all emotions (no filter)
  ws.send(JSON.stringify({
    type: 'subscribe',
    tenant: null, // Subscribe to all tenants for testing
    filter: null  // No filter - see everything
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
        console.log('📡 Subscription confirmed');
        break;

      case 'emotional_state':
        const state = message.data;
        const vectors = state.vectors;

        // Format emotional state for display
        console.log(`
╔════════════════════════════════════════════════╗
║ 🧠 EMOTIONAL STATE DETECTED                    ║
╠════════════════════════════════════════════════╣
║ Session: ${state.sessionId.substring(0, 20)}...
║ Emotion: ${state.emotion.toUpperCase()}
║ Confidence: ${state.confidence}%
║ Intensity: ${state.intensity}%
╠════════════════════════════════════════════════╣
║ VECTORS:
║   Frustration: ${vectors.frustration}%
║   Anxiety: ${vectors.anxiety}%
║   Urgency: ${vectors.urgency}%
║   Trust: ${vectors.trust}%
║   Excitement: ${vectors.excitement}%
╠════════════════════════════════════════════════╣
║ Page: ${state.pageUrl || 'unknown'}
║ Session Age: ${Math.round((state.sessionAge || 0) / 1000)}s
║ Time: ${new Date(state.timestamp).toLocaleTimeString()}
╚════════════════════════════════════════════════╝
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
  console.log('\n👋 Closing dashboard client...');
  ws.close();
  process.exit(0);
});

console.log(`
╔════════════════════════════════════════════════╗
║   TEST DASHBOARD CLIENT                        ║
╠════════════════════════════════════════════════╣
║   Listening for emotional states...            ║
║   Press Ctrl+C to exit                         ║
╚════════════════════════════════════════════════╝
`);