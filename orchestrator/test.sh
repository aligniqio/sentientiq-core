#!/bin/bash

# Test the orchestrator endpoint
echo "🧪 Testing orchestrator debate endpoint..."
echo "================================================"

curl -N -X POST "http://localhost:8787/v1/debate" \
  -H "content-type: application/json" \
  -d '{"prompt":"Rewrite the hero to reduce anxiety and increase trust for a fintech landing.","topK":4}'

echo ""
echo "================================================"
echo "✅ Test complete!"