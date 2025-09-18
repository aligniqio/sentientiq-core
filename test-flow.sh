#!/bin/bash

echo "🔍 Testing SentientIQ Data Flow"
echo "================================"

# Test 1: Send test event to telemetry gateway
echo -e "\n1️⃣ Sending test event to telemetry gateway..."
curl -X POST https://api.sentientiq.app/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-'$(date +%s)'",
    "tenant_id": "test",
    "url": "https://test.com",
    "events": [{
      "type": "mousemove",
      "x": 100,
      "y": 200,
      "timestamp": '$(date +%s000)'
    }]
  }' \
  -w "\nStatus: %{http_code}\n" \
  2>/dev/null

# Test 2: Check WebSocket connectivity
echo -e "\n2️⃣ Testing WebSocket connection..."
timeout 2 curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://api.sentientiq.app/ws/telemetry 2>/dev/null | head -5

# Test 3: Check NATS WebSocket proxy
echo -e "\n3️⃣ Testing NATS WebSocket proxy..."
curl -s http://98.87.12.130:9222/ 2>&1 | head -2 || echo "❌ Not accessible from outside"

echo -e "\n✅ Test complete. Check PM2 logs for processing:"
echo "   ssh ec2-user@98.87.12.130 'pm2 logs --lines 20'"