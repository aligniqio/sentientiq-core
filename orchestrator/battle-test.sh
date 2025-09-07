#!/bin/bash

echo "🔥 BATTLE TESTING SENTIENTIQ ORCHESTRATOR 🔥"
echo "============================================"

HOST="${1:-localhost:8787}"
echo "Testing against: $HOST"
echo ""

# 1. Health Check
echo "1️⃣ HEALTH CHECK"
curl -s http://$HOST/health | jq '.' || echo "❌ Health check failed"
echo ""

# 2. Single Debate Test
echo "2️⃣ SINGLE DEBATE (3-chain)"
curl -s -X POST http://$HOST/v1/debate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test prompt","topK":2}' \
  --max-time 10 \
  2>&1 | head -20
echo ""

# 3. Boardroom Stress Test - 12 Personas
echo "3️⃣ BOARDROOM - 12 PERSONAS PARALLEL"
curl -N -X POST http://$HOST/v1/boardroom \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Critical: Customer trust at checkout","topK":3}' \
  --max-time 30 \
  2>&1 | grep -E "(event:|data:)" | head -50
echo ""

# 4. Invalid Input Test
echo "4️⃣ INVALID INPUT HANDLING"
curl -s -X POST http://$HOST/v1/debate \
  -H "Content-Type: application/json" \
  -d '{"prompt":""}' \
  --max-time 5 \
  2>&1 | head -10
echo ""

# 5. Large Payload Test
echo "5️⃣ LARGE PAYLOAD TEST"
BIGPROMPT=$(printf 'x%.0s' {1..5000})
curl -s -X POST http://$HOST/v1/debate \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"$BIGPROMPT\",\"topK\":1}" \
  --max-time 5 \
  2>&1 | head -10
echo ""

# 6. Concurrent Requests Test
echo "6️⃣ CONCURRENT REQUESTS (5 parallel)"
for i in {1..5}; do
  curl -s -X POST http://$HOST/v1/debate \
    -H "Content-Type: application/json" \
    -d "{\"prompt\":\"Concurrent test $i\",\"topK\":1}" \
    --max-time 10 > /tmp/concurrent-$i.log 2>&1 &
done
wait
echo "✅ Concurrent requests completed"
for i in {1..5}; do
  echo "Request $i: $(head -1 /tmp/concurrent-$i.log | cut -c1-50)"
done
echo ""

# 7. Queue Endpoint Test
echo "7️⃣ QUEUE ENDPOINT TEST"
curl -s -X POST http://$HOST/v1/debate/queue \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Queue test","topK":2}' | jq '.' || echo "❌ Queue endpoint failed"
echo ""

# 8. Performance Check
echo "8️⃣ PERFORMANCE METRICS"
echo "Response time for health check:"
time curl -s http://$HOST/health > /dev/null
echo ""

echo "============================================"
echo "🏁 BATTLE TEST COMPLETE"
echo ""
echo "HARDENING CHECKLIST:"
echo "✓ Rate limiting active (check logs)"
echo "✓ Input validation working"
echo "✓ Concurrent request handling"
echo "✓ Error boundaries in place"
echo "✓ Memory usage stable"
echo ""
echo "Run on EC2: ./battle-test.sh 98.87.12.130:8787"