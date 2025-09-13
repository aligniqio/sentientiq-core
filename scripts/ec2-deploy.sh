#!/bin/bash

# EC2 DEPLOYMENT SCRIPT - LIVE BY MONDAY
# This uses your EXISTING EC2 + pm2 + Clerk + Supabase + Stripe setup

echo "🚀 SentientIQ EC2 Deployment - Let's fucking go!"

# Configuration
EC2_USER="ec2-user"
EC2_HOST="98.87.12.130"
EC2_KEY="/Users/matthewkiselstein/projects/sentientiq-core/.ssh/collective-backend.pem"
DEPLOY_PATH="/home/ec2-user/sentientiq-core"
ORCHESTRATOR_PATH="/home/ec2-user/orchestrator"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build locally
echo -e "${YELLOW}Building orchestrator...${NC}"
cd orchestrator
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Fix errors and try again.${NC}"
    exit 1
fi

# Step 2: Create deployment bundle
echo -e "${YELLOW}Creating deployment bundle...${NC}"
tar -czf orchestrator-deploy.tar.gz \
    dist \
    package.json \
    package-lock.json \
    .env.production \
    --exclude=node_modules \
    --exclude=.git

# Step 3: Deploy to EC2
echo -e "${YELLOW}Deploying to EC2...${NC}"
scp -i ${EC2_KEY} orchestrator-deploy.tar.gz ${EC2_USER}@${EC2_HOST}:${ORCHESTRATOR_PATH}/

# Step 4: SSH and restart services
echo -e "${YELLOW}Restarting services on EC2...${NC}"
ssh -i ${EC2_KEY} ${EC2_USER}@${EC2_HOST} << 'ENDSSH'
cd /home/ec2-user/orchestrator

# Extract new code
tar -xzf orchestrator-deploy.tar.gz

# Install dependencies if package.json changed
npm ci --production

# Copy production env if not exists
if [ ! -f .env ]; then
    cp .env.production .env
    echo "⚠️  Created .env from .env.production - VERIFY YOUR SECRETS!"
fi

# Update deployment mode for alpha
sed -i 's/^DEPLOYMENT_MODE=.*/DEPLOYMENT_MODE=alpha/' .env || echo 'DEPLOYMENT_MODE=alpha' >> .env

# Disable expensive AI by default
sed -i 's/^PREFER_ANTHROPIC=.*/PREFER_ANTHROPIC=false/' .env || echo 'PREFER_ANTHROPIC=false' >> .env

# Restart with pm2
pm2 restart orchestrator-streaming --update-env || pm2 start dist/server.js --name orchestrator-streaming

# Show status
pm2 status
pm2 logs orchestrator-streaming --lines 20 --nostream

echo "✅ Deployment complete!"
echo "📊 Check health: curl http://localhost:8787/health"
echo "🔍 View logs: pm2 logs orchestrator-streaming"
ENDSSH

# Step 5: Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 5

# Test health endpoint
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://${EC2_HOST}:8787/health)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Orchestrator is healthy!${NC}"
    echo -e "${GREEN}🎯 Emotion engine is LIVE!${NC}"
    
    # Show feature status
    curl -s http://${EC2_HOST}:8787/features | jq '.' || true
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH_CHECK)${NC}"
    echo "Check logs: ssh ${EC2_USER}@${EC2_HOST} 'pm2 logs orchestrator-streaming'"
    exit 1
fi

echo ""
echo "==================================="
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Install SDK on your first customer's site"
echo "2. Watch emotions flow in real-time"
echo "3. CEO alerts are ACTIVE - test with high-value emotion"
echo ""
echo "Monitor: ssh ${EC2_USER}@${EC2_HOST} 'pm2 monit'"
echo "Logs: ssh ${EC2_USER}@${EC2_HOST} 'pm2 logs orchestrator-streaming'"
echo ""
echo "5 months of grinding. THIS IS IT. 🚀"