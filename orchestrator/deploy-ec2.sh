#!/bin/bash

# EC2 Deployment Script for SentientIQ Orchestrator
EC2_HOST="ec2-user@98.87.12.130"
EC2_KEY="/Users/matthewkiselstein/projects/sentientiq-core/.ssh/collective-backend.pem"
PROJECT_NAME="orchestrator"

echo "🚀 Deploying SentientIQ Orchestrator to EC2..."

# Build locally first
echo "📦 Building TypeScript..."
npm run build

# Create tarball with necessary files
echo "📦 Creating deployment package..."
tar -czf orchestrator.tar.gz \
  dist/ \
  package.json \
  package-lock.json \
  .env.example \
  Dockerfile

# Upload to EC2
echo "📤 Uploading to EC2..."
scp -i $EC2_KEY orchestrator.tar.gz $EC2_HOST:~/

# Setup and run on EC2
echo "🔧 Setting up on EC2..."
ssh -i $EC2_KEY $EC2_HOST << 'ENDSSH'
# Install Node.js 20 if not present
if ! command -v node &> /dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo yum install -y nodejs
fi

# Install Redis if not present
if ! command -v redis-server &> /dev/null; then
  sudo yum install -y redis
  sudo systemctl start redis
  sudo systemctl enable redis
fi

# Install PM2 globally
sudo npm install -g pm2

# Extract and setup orchestrator
rm -rf orchestrator
mkdir orchestrator
cd orchestrator
tar -xzf ../orchestrator.tar.gz

# Install production dependencies
npm ci --omit=dev

# Copy and configure .env
cp .env.example .env
echo "⚠️  IMPORTANT: Edit .env with your API keys!"

# Setup PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'orchestrator-api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8787
      }
    },
    {
      name: 'orchestrator-worker',
      script: 'dist/worker.js',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. SSH into the server: ssh -i /Users/matthewkiselstein/projects/sentientiq-core/.ssh/collective-backend.pem ec2-user@98.87.12.130"
echo "2. Edit the .env file: cd orchestrator && nano .env"
echo "3. Start services: pm2 start ecosystem.config.js"
echo "4. Save PM2 config: pm2 save && pm2 startup"
echo ""
echo "📊 Monitor with: pm2 status"
echo "📝 View logs: pm2 logs"
ENDSSH

# Cleanup
rm orchestrator.tar.gz

echo "🎉 Deployment script complete!"
echo ""
echo "Test endpoints:"
echo "  Health: curl http://98.87.12.130:8787/health"
echo "  Stream: curl -N -X POST http://98.87.12.130:8787/v1/debate -H 'Content-Type: application/json' -d '{\"prompt\":\"test\"}'"