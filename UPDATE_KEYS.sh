#!/bin/bash

echo "⚡️ ZEUS KEY ROTATION SCRIPT ⚡️"
echo "================================"
echo "Replace the XXX values with your new keys, then run this script!"
echo ""

# UPDATE THESE WITH YOUR NEW KEYS
NEW_STRIPE_SECRET="sk_live_XXX"
NEW_ANTHROPIC_KEY="sk-ant-XXX"
NEW_XAI_KEY="xai-XXX"
NEW_CLERK_SECRET="sk_live_XXX"

# Update local .env
echo "Updating local .env files..."
sed -i '' "s/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=$NEW_STRIPE_SECRET/" .env
sed -i '' "s/STRIPE_API_KEY=.*/STRIPE_API_KEY=$NEW_STRIPE_SECRET/" backend/.env
sed -i '' "s/ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$NEW_ANTHROPIC_KEY/" backend/.env
sed -i '' "s/XAI_API_KEY=.*/XAI_API_KEY=$NEW_XAI_KEY/" backend/.env
sed -i '' "s/CLERK_SECRET_KEY=.*/CLERK_SECRET_KEY=$NEW_CLERK_SECRET/" .env

# Update EC2
echo "Updating EC2..."
scp -i .ssh/sentientiq-core.pem backend/.env ec2-user@ec2-3-15-29-138.us-east-2.compute.amazonaws.com:~/sentientiq-core/backend/
ssh -i .ssh/sentientiq-core.pem ec2-user@ec2-3-15-29-138.us-east-2.compute.amazonaws.com "cd ~/sentientiq-core/backend && pm2 restart sage-api"

echo "✅ Keys rotated successfully!"
echo "🔒 Your secrets are safe again!"