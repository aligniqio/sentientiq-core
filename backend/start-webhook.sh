#!/bin/bash

# Start Stripe webhook server with PM2
cd /home/ubuntu/sentientiq-core/backend

# Install dependencies if needed
npm install

# Start webhook server with PM2
pm2 start stripe-webhook.js --name stripe-webhook
pm2 save

echo "✅ Stripe webhook server started on port 8005"
echo "📝 Configure webhook in Stripe Dashboard:"
echo "   Endpoint: https://sentientiq.app/api/stripe/webhook"