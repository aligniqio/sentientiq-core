/**
 * Telemetry Pipeline Test Script
 * Run this in the browser console on sentientiq.ai to verify telemetry is working
 */

(function() {
  console.log('=== SentientIQ Telemetry Pipeline Test ===');

  // Step 1: Check if SentientIQ is loaded
  console.log('\n1. Checking SentientIQ object...');
  if (typeof window.SentientIQ !== 'undefined') {
    console.log('✅ SentientIQ found:', window.SentientIQ);

    // Check for telemetry methods
    if (window.SentientIQ.telemetry) {
      console.log('✅ Telemetry module loaded');
    } else {
      console.error('❌ Telemetry module not found');
    }

    // Check for session ID
    if (window.SentientIQ.sessionId) {
      console.log('✅ Session ID:', window.SentientIQ.sessionId);
    } else {
      console.warn('⚠️ No session ID found');
    }
  } else {
    console.error('❌ SentientIQ not found. Script may not be loaded.');
  }

  // Step 2: Check WebSocket connections
  console.log('\n2. Checking WebSocket connections...');
  let wsConnections = [];

  // Intercept WebSocket constructor to track connections
  const originalWS = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    console.log('📡 WebSocket connection attempt to:', url);
    wsConnections.push(url);
    return new originalWS(url, protocols);
  };

  // Step 3: Check for telemetry events in network
  console.log('\n3. Monitoring telemetry events (move your mouse rapidly)...');
  let eventCount = 0;
  let lastEventTime = null;

  // Try to hook into telemetry sending
  if (window.SentientIQ && window.SentientIQ.sendTelemetry) {
    const originalSend = window.SentientIQ.sendTelemetry;
    window.SentientIQ.sendTelemetry = function(data) {
      eventCount++;
      lastEventTime = new Date();
      console.log(`📊 Telemetry event #${eventCount}:`, data);
      return originalSend.call(this, data);
    };
  }

  // Step 4: Generate test rage event
  console.log('\n4. Generating test rage event...');

  function simulateRageClick() {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: Math.random() * window.innerWidth,
      clientY: Math.random() * window.innerHeight
    });

    // Rapid clicks to simulate rage
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        document.body.dispatchEvent(event);
        console.log(`🖱️ Simulated click ${i + 1}/10`);
      }, i * 50);
    }
  }

  // Step 5: Test direct WebSocket connection
  console.log('\n5. Testing direct WebSocket connection...');

  function testWebSocket() {
    const ws = new WebSocket('wss://api.sentientiq.app/ws/telemetry');

    ws.onopen = () => {
      console.log('✅ WebSocket connected to telemetry gateway');

      // Send test event
      const testEvent = {
        type: 'telemetry',
        sessionId: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        data: {
          mouseX: 100,
          mouseY: 100,
          velocityX: 1000,
          velocityY: 1000,
          accelerationX: 2000,
          accelerationY: 2000,
          clickCount: 5,
          scrollDelta: 0,
          timeOnPage: 1000
        }
      };

      ws.send(JSON.stringify(testEvent));
      console.log('📤 Sent test event:', testEvent);

      setTimeout(() => ws.close(), 2000);
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket closed');
    };
  }

  // Step 6: Check GTM configuration
  console.log('\n6. Checking Google Tag Manager...');
  if (typeof dataLayer !== 'undefined') {
    console.log('✅ GTM dataLayer found');

    // Look for SentientIQ tag
    const sentientTags = dataLayer.filter(item =>
      JSON.stringify(item).includes('sentient') ||
      JSON.stringify(item).includes('SentientIQ')
    );

    if (sentientTags.length > 0) {
      console.log('✅ SentientIQ tags in dataLayer:', sentientTags);
    } else {
      console.warn('⚠️ No SentientIQ tags found in dataLayer');
    }
  } else {
    console.warn('⚠️ GTM dataLayer not found');
  }

  // Step 7: Summary and recommendations
  console.log('\n=== Test Summary ===');
  console.log('Run these tests:');
  console.log('1. simulateRageClick() - Generate rage clicks');
  console.log('2. testWebSocket() - Test direct WebSocket connection');
  console.log('3. Move mouse rapidly on the page');
  console.log('4. Check browser DevTools Network tab for WebSocket connections');
  console.log('5. Look for "telemetry" or "api.sentientiq.app" in Network tab');

  // Make functions available globally
  window.sentientTest = {
    simulateRageClick,
    testWebSocket,
    wsConnections,
    eventCount: () => eventCount,
    lastEventTime: () => lastEventTime
  };

  console.log('\nTest functions available as window.sentientTest');
})();

// Additional diagnostic for checking if telemetry is actually firing
console.log('\n=== Checking for Active WebSockets ===');
// This will show all active WebSocket connections in the current page
Array.from(document.querySelectorAll('*')).forEach(el => {
  if (el.__zone_symbol__eventTasks) {
    console.log('Element with event tasks:', el);
  }
});

// Monitor all fetch/XHR requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0] && args[0].includes('sentient')) {
    console.log('📡 Fetch to SentientIQ:', args[0]);
  }
  return originalFetch.apply(this, args);
};

console.log('Telemetry test script loaded. Check console for results.');