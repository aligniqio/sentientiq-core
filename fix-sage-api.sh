#!/bin/bash

# Script to fix the sage-api service on EC2
# IMPORTANT: Replace YOUR_ACTUAL_OPENAI_API_KEY with your real OpenAI API key

echo "🔧 Fixing sage-api service on EC2..."
echo ""
echo "⚠️  IMPORTANT: You need to replace 'YOUR_ACTUAL_OPENAI_API_KEY' with your real OpenAI API key"
echo ""

# SSH into EC2 and set the OpenAI API key
ssh -i .ssh/sentientiq-core.pem ec2-user@3.15.29.138 << 'EOF'
    # Create ecosystem config with environment variables
    cat > ~/sage-ecosystem.config.js << 'ECOSYSTEM'
module.exports = {
  apps: [{
    name: 'sage-api',
    script: '/home/ec2-user/sentientiq-core/backend/sage-api.js',
    env: {
      PORT: 8004,
      NODE_ENV: 'production',
      OPENAI_API_KEY: 'YOUR_ACTUAL_OPENAI_API_KEY'  // <-- REPLACE THIS!
    }
  }]
};
ECOSYSTEM

    # Stop the current sage-api service
    pm2 stop sage-api
    
    # Delete the old sage-api service
    pm2 delete sage-api
    
    # Start sage-api with the new ecosystem config
    pm2 start ~/sage-ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Show status
    pm2 status
    
    echo ""
    echo "✅ sage-api service reconfigured!"
    echo ""
    echo "⚠️  IMPORTANT: If you see the service still restarting:"
    echo "   1. Edit ~/sage-ecosystem.config.js on the EC2 instance"
    echo "   2. Replace 'YOUR_ACTUAL_OPENAI_API_KEY' with your real OpenAI API key"
    echo "   3. Run: pm2 restart sage-api --update-env"
EOF

echo ""
echo "📝 To manually fix this:"
echo "   1. SSH into EC2: ssh -i .ssh/sentientiq-core.pem ec2-user@3.15.29.138"
echo "   2. Edit the config: nano ~/sage-ecosystem.config.js"
echo "   3. Replace 'YOUR_ACTUAL_OPENAI_API_KEY' with your real key"
echo "   4. Restart: pm2 restart sage-api --update-env"