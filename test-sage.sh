#!/bin/bash

curl -X POST https://sentientiq.app/api/sage/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Would you be open to having a discussion sometime about looking at ways to provide additional support to your sales team at SentientIQ™? My organization, Reignmore Group, can do this by helping your sales team fill their sales pipeline with pre-qualified leads and from what was gathered about your company - can yield quick return as we serve customers that target similiar personas.",
    "sender": "sales@reignmore.com"
  }' \
  -s | jq '.sage_says' -r