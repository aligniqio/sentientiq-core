#!/bin/bash

echo "🧪 Testing SentientIQ Boardroom (12 Personas Debate)"
echo "================================================"

# Test with default 12 personas
curl -N -X POST "http://localhost:8787/v1/boardroom" \
  -H "content-type: application/json" \
  -d '{
    "prompt": "Our fintech landing page has 47% checkout abandonment. How do we reduce anxiety and increase trust during payment?",
    "topK": 4,
    "temperature": 0.3
  }'

echo ""
echo "================================================"
echo "✅ Boardroom test complete!"
echo ""
echo "Test with custom personas:"
echo 'curl -N -X POST "http://localhost:8787/v1/boardroom" -H "content-type: application/json" -d '"'"'{"prompt":"...", "personas":["ROI Analyst","Emotion Scientist","Copy Chief"]}'"'"