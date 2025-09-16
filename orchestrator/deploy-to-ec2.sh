#!/bin/bash

# EC2 Deployment Script for Orchestrator
# Syncs local code to EC2 without disrupting the environment

EC2_HOST="98.87.12.130"
EC2_USER="ec2-user"
KEY_PATH="/Users/matthewkiselstein/projects/sentientiq-core/.ssh/collective-backend.pem"
REMOTE_DIR="/home/ec2-user/orchestrator"

echo "🚀 Deploying orchestrator to EC2..."

# Create backup on EC2
echo "📦 Creating backup on EC2..."
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_HOST" "cd $REMOTE_DIR && tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz src/"

# Sync source files (excluding node_modules and .env files)
echo "📤 Syncing source files..."
rsync -avz --delete \
  -e "ssh -i $KEY_PATH" \
  --exclude 'node_modules' \
  --exclude '.env*' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '*.pem' \
  --exclude 'backup-*.tar.gz' \
  ./src/ "$EC2_USER@$EC2_HOST:$REMOTE_DIR/src/"

# Sync package files if changed
echo "📋 Syncing package files..."
rsync -avz \
  -e "ssh -i $KEY_PATH" \
  ./package.json "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"

rsync -avz \
  -e "ssh -i $KEY_PATH" \
  ./tsconfig.json "$EC2_USER@$EC2_HOST:$REMOTE_DIR/" 2>/dev/null || true

# Install dependencies if package.json changed
echo "📦 Checking dependencies..."
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_HOST" "cd $REMOTE_DIR && npm install --production"

# Restart the service
echo "🔄 Restarting orchestrator-clean..."
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_HOST" "pm2 restart orchestrator-clean"

# Show logs
echo "📊 Showing recent logs..."
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_HOST" "pm2 logs orchestrator-clean --lines 20 --nostream"

echo "✅ Deployment complete!"
echo "📡 Monitor logs with: ssh -i $KEY_PATH $EC2_USER@$EC2_HOST 'pm2 logs orchestrator-clean'"