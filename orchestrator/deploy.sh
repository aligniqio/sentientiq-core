#!/bin/bash

# Quick deploy script for EC2
echo "📦 Building orchestrator..."
npm run build

echo "🚀 Deploying to EC2..."
# Update with your EC2 instance details
EC2_HOST="ec2-user@your-ec2-ip"
EC2_PATH="/home/ec2-user/orchestrator"

# Copy files to EC2
scp -r dist package.json package-lock.json $EC2_HOST:$EC2_PATH/

# Install and restart on EC2
ssh $EC2_HOST << 'EOF'
cd /home/ec2-user/orchestrator
npm ci --omit=dev
pm2 restart orchestrator || pm2 start dist/server.js --name orchestrator
pm2 save
EOF

echo "✅ Deployed!"