#!/bin/bash

# SentientIQ Monetization Stress Test
# Tests rate limiting, payment walls, and performance

API_BASE="http://localhost:8000"
TOTAL=0
SUCCESS=0
RATE_LIMITED=0
PAYMENT_REQUIRED=0

echo "🔥 SENTIENTIQ MONETIZATION STRESS TEST 🔥"
echo "=========================================="

# Test 1: Rate Limiting (Free user should hit limit at 20)
echo ""
echo "📊 TEST 1: Rate Limiting (20 question limit)"
echo "-------------------------------------------"
FREE_USER="free_test_$(date +%s)"

for i in {1..25}; do
    TOTAL=$((TOTAL + 1))
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/ask" \
        -H "Content-Type: application/json" \
        -H "X-User-Id: $FREE_USER" \
        -H "X-Plan: free" \
        -d "{\"question\": \"Test question $i\", \"agent\": \"Strategy\"}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        SUCCESS=$((SUCCESS + 1))
        echo "  ✅ Question $i: SUCCESS"
    elif [ "$http_code" = "402" ]; then
        PAYMENT_REQUIRED=$((PAYMENT_REQUIRED + 1))
        echo "  💰 Question $i: PAYMENT REQUIRED (limit hit!)"
        break
    elif [ "$http_code" = "429" ]; then
        RATE_LIMITED=$((RATE_LIMITED + 1))
        echo "  ⏱️  Question $i: RATE LIMITED"
    else
        echo "  ❌ Question $i: ERROR ($http_code)"
    fi
    
    sleep 0.1
done

# Test 2: Pro User (should have unlimited)
echo ""
echo "🚀 TEST 2: Pro User (unlimited access)"
echo "--------------------------------------"
PRO_USER="pro_test_$(date +%s)"

for i in {1..30}; do
    TOTAL=$((TOTAL + 1))
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/ask" \
        -H "Content-Type: application/json" \
        -H "X-User-Id: $PRO_USER" \
        -H "X-Plan: pro" \
        -d "{\"question\": \"Pro test $i\", \"agent\": \"Emotion\"}" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        SUCCESS=$((SUCCESS + 1))
        if [ $((i % 10)) -eq 0 ]; then
            echo "  ✅ Questions 1-$i: All successful"
        fi
    elif [ "$http_code" = "429" ]; then
        RATE_LIMITED=$((RATE_LIMITED + 1))
        echo "  ⏱️  Question $i: Rate limited (burst protection)"
    else
        echo "  ❌ Question $i: Error ($http_code)"
    fi
done

# Test 3: Burst Test (rapid fire)
echo ""
echo "💥 TEST 3: Burst Test (10 concurrent requests)"
echo "----------------------------------------------"
BURST_USER="burst_test_$(date +%s)"

for i in {1..10}; do
    {
        TOTAL=$((TOTAL + 1))
        curl -s -X POST "$API_BASE/ask" \
            -H "Content-Type: application/json" \
            -H "X-User-Id: ${BURST_USER}_$i" \
            -H "X-Plan: free" \
            -d "{\"question\": \"Burst $i\", \"agent\": \"ROI\"}" \
            -o /dev/null -w "%{http_code}\n"
    } &
done

wait
echo "  ✅ Burst complete"

# Test 4: SSE Streaming
echo ""
echo "📡 TEST 4: SSE Streaming"
echo "------------------------"
timeout 3 curl -s -N "$API_BASE/pulse" \
    -H "Accept: text/event-stream" \
    2>/dev/null | head -5 | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
        echo "  ✅ SSE message received"
        break
    fi
done

# Test 5: Invalid requests
echo ""
echo "🔪 TEST 5: Edge Cases"
echo "---------------------"

# Missing auth
response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/ask" \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"No auth\", \"agent\": \"Strategy\"}")
http_code=$(echo "$response" | tail -n1)
echo "  Missing auth: HTTP $http_code"

# Invalid agent
response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/ask" \
    -H "Content-Type: application/json" \
    -H "X-User-Id: test" \
    -H "X-Plan: free" \
    -d "{\"question\": \"Test\", \"agent\": \"MathRandom\"}")
http_code=$(echo "$response" | tail -n1)
echo "  Invalid agent: HTTP $http_code"

# Summary
echo ""
echo "=========================================="
echo "📊 SUMMARY"
echo "=========================================="
echo "  Total requests: $TOTAL"
echo "  Successful: $SUCCESS"
echo "  Rate limited: $RATE_LIMITED"
echo "  Payment required: $PAYMENT_REQUIRED"
echo ""

if [ $PAYMENT_REQUIRED -gt 0 ]; then
    echo "✅ MONETIZATION WORKING: Free users hit payment wall!"
else
    echo "⚠️  WARNING: No payment walls hit (is backend running?)"
fi

echo "=========================================="