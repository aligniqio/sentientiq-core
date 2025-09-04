#!/bin/bash

# First-time setup for fresh EC2 Ubuntu instance
# Run this ONCE on a new EC2 instance before deploying

echo "╔════════════════════════════════════════════════════╗"
echo "║     EC2 FIRST-TIME SETUP FOR SENTIENTIQ           ║"
echo "║     Installing Node.js, PM2, and dependencies     ║"
echo "╚════════════════════════════════════════════════════╝"

# Update package manager
echo "📦 Updating package manager..."
sudo apt-get update

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node installation
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install PM2 globally
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p ~/sentientiq-logs

# Install build essentials (sometimes needed for npm packages)
echo "📦 Installing build essentials..."
sudo apt-get install -y build-essential

# Setup PM2 to start on boot
echo "🔧 Setting up PM2 to start on system boot..."
pm2 startup systemd -u $USER --hp /home/$USER
# Note: This will output a command to run with sudo - follow those instructions!

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║     FIRST-TIME SETUP COMPLETE!                    ║"
echo "║                                                    ║"
echo "║  Next steps:                                      ║"
echo "║  1. Create .env file with your API keys:          ║"
echo "║     nano ~/sentientiq-core/.env                   ║"
echo "║                                                    ║"
echo "║  2. Add these variables:                          ║"
echo "║     ANTHROPIC_API_KEY=your-key                    ║"
echo "║     OPENAI_API_KEY=your-key                       ║"
echo "║     SUPABASE_URL=your-url                         ║"
echo "║     SUPABASE_KEY=your-key                         ║"
echo "║                                                    ║"
echo "║  3. Run the deployment from your local machine:   ║"
echo "║     EC2_HOST=your-ip ./deploy-to-ec2.sh           ║"
echo "║                                                    ║"
echo "║  PM2 commands you'll use:                         ║"
echo "║     pm2 list     - see running processes          ║"
echo "║     pm2 logs     - view logs                      ║"
echo "║     pm2 restart all - restart everything          ║"
echo "║     pm2 monit    - live monitoring                ║"
echo "╚════════════════════════════════════════════════════╝"