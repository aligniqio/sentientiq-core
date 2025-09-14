#!/bin/bash

curl -X POST https://sentientiq.app/api/sage/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "Are you in?", "sender": "mystery@example.com"}' \
  -s | jq '.sage_says' -r