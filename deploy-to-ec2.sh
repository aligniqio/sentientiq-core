#!/bin/bash

# Deploy SentientIQ to EC2
# The truth deserves infrastructure
# No Math.random(). No bullshit. Just honesty at scale.

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║         SENTIENTIQ EC2 DEPLOYMENT                 ║"
echo "║         Making Honesty Profitable                 ║"
echo "║         12 Agents of Truth Going Live             ║"
echo "╚════════════════════════════════════════════════════╝"

# Configuration
EC2_HOST="${EC2_HOST:-}"
EC2_USER="${EC2_USER:-ec2-user}"
EC2_KEY="${EC2_KEY:-.ssh/sentientiq-core.pem}"
APP_DIR="/home/$EC2_USER/sentientiq-core"
PM2_APP_NAME="sentientiq"

# Check if EC2_HOST is set
if [ -z "$EC2_HOST" ]; then
    echo "❌ Error: EC2_HOST environment variable not set"
    echo "Usage: EC2_HOST=your-ec2-ip ./deploy-to-ec2.sh"
    exit 1
fi

echo "🚀 Deploying to EC2 instance: $EC2_HOST"

# Build the frontend
echo "📦 Building frontend for production..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf sentientiq-deploy.tar.gz \
    --exclude node_modules \
    --exclude .git \
    --exclude .env \
    --exclude sentientiq-deploy.tar.gz \
    --exclude hairball.tar.gz \
    --exclude "*.log" \
    --exclude ".DS_Store" \
    .

# Upload to EC2
echo "📤 Uploading to EC2..."
scp -i $EC2_KEY sentientiq-deploy.tar.gz $EC2_USER@$EC2_HOST:/tmp/

# Deploy on EC2
echo "🔧 Deploying on EC2..."
ssh -i $EC2_KEY $EC2_USER@$EC2_HOST << 'DEPLOY_SCRIPT'
set -e

echo "🔍 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js $(node --version) already installed"
fi

echo "🔄 Extracting deployment package..."
cd ~
rm -rf sentientiq-core-new
mkdir sentientiq-core-new
cd sentientiq-core-new
tar -xzf /tmp/sentientiq-deploy.tar.gz
rm /tmp/sentientiq-deploy.tar.gz

echo "📦 Installing dependencies..."
npm install --production

echo "🔧 Installing PM2 if needed..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 globally..."
    sudo npm install -g pm2
else
    echo "PM2 already installed"
fi

echo "🔑 Setting up environment..."
# Copy existing .env if it exists
if [ -f ~/sentientiq-core/.env ]; then
    cp ~/sentientiq-core/.env .
else
    echo "⚠️  No .env file found. Please create one with:"
    echo "    ANTHROPIC_API_KEY=your-key"
    echo "    OPENAI_API_KEY=your-key"
    echo "    SUPABASE_URL=your-url"
    echo "    SUPABASE_KEY=your-key"
fi

echo "🛑 Stopping existing services..."
pm2 delete sentientiq-swarm 2>/dev/null || true
pm2 delete sentientiq-posts 2>/dev/null || true
pm2 delete sentientiq-frontend 2>/dev/null || true

echo "🔄 Swapping directories..."
if [ -d ~/sentientiq-core ]; then
    mv ~/sentientiq-core ~/sentientiq-core-old
fi
mv ~/sentientiq-core-new ~/sentientiq-core
cd ~/sentientiq-core

echo "🚀 Starting services with PM2..."

# Start the swarm API server
pm2 start backend/swarm-api-server.cjs \
    --name sentientiq-swarm \
    --time \
    --log-date-format "YYYY-MM-DD HH:mm:ss" \
    --merge-logs \
    --log ~/sentientiq-logs/swarm.log

# Start the posts server
pm2 start backend/supabase-posts-server.cjs \
    --name sentientiq-posts \
    --time \
    --log-date-format "YYYY-MM-DD HH:mm:ss" \
    --merge-logs \
    --log ~/sentientiq-logs/posts.log

# Serve the frontend with PM2
pm2 serve dist 5000 \
    --name sentientiq-frontend \
    --spa

# Save PM2 configuration
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER || true

echo "✅ Services started!"
echo ""
echo "🔍 Checking service status..."
pm2 list

# Cleanup old deployment
if [ -d ~/sentientiq-core-old ]; then
    rm -rf ~/sentientiq-core-old
fi

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║         DEPLOYMENT COMPLETE                       ║"
echo "║                                                    ║"
echo "║  Frontend:    http://$(hostname -I | awk '{print $1}'):5000       ║"
echo "║  Posts API:   http://$(hostname -I | awk '{print $1}'):8002/api   ║"
echo "║  Swarm API:   http://$(hostname -I | awk '{print $1}'):8003/api   ║"
echo "║                                                    ║"
echo "║  The truth compounds.                             ║"
echo "║  Every analysis makes us stronger.                ║"
echo "╚════════════════════════════════════════════════════╝"
DEPLOY_SCRIPT

# Cleanup local deployment package
rm sentientiq-deploy.tar.gz

echo ""
echo "🎉 Deployment complete!"
echo "🔍 View logs with: ssh $EC2_USER@$EC2_HOST 'pm2 logs'"
echo "📊 Monitor with: ssh $EC2_USER@$EC2_HOST 'pm2 monit'"
echo ""
echo "The 12 agents are now live. The moat is active."
echo "Math.random() vendors, your time is up."