#!/bin/bash
# Test streaming directly with curl

echo "Testing direct streaming from API..."
echo "Watch for individual sentence events:"
echo "----------------------------------------"

curl -N -X POST https://api.sentientiq.app/v1/boardroom \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Should we use AI for customer service?",
    "topK": 2,
    "mode": "debate",
    "tenantId": "test"
  }' 2>/dev/null | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
      echo "[$(date +%H:%M:%S.%3N)] $line"
    fi
done