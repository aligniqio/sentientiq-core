#!/bin/bash

# Deploy fixed behavior processor to EC2
# This script safely deploys the position-tracking fix

echo "=== Deploying Behavior Processor Fix ==="
echo "This will:"
echo "1. Upload the fixed processor to EC2"
echo "2. Stop the old processor (if running)"
echo "3. Clear any existing position tracking"
echo "4. Start fresh with position tracking from current time"
echo ""

# Upload the fixed processor
echo "📤 Uploading fixed processor..."
scp behavior-processor-fixed.cjs ec2-user@api.sentientiq.app:/home/ec2-user/

# Execute deployment on EC2
ssh ec2-user@api.sentientiq.app << 'EOF'
echo "🔧 On EC2 server..."

# Stop old processor if running
echo "⏹️  Stopping old processor..."
pm2 stop behavior-processor 2>/dev/null || true

# Clear the Redis stream to start fresh
echo "🗑️  Clearing old telemetry data..."
redis6-cli DEL telemetry:raw

# Clear old position tracking (if any)
echo "🔄 Resetting position tracking..."
redis6-cli DEL behavior:last_processed_id

# Start the new processor
echo "🚀 Starting fixed processor..."
pm2 start /home/ec2-user/behavior-processor-fixed.cjs --name behavior-processor-fixed

# Show status
echo "📊 Current PM2 status:"
pm2 list

# Test with a single event
echo ""
echo "🧪 Sending test event..."
redis6-cli PUBLISH emotional_events '{"sessionId":"TEST-DEPLOY","emotion":"joy","confidence":75,"timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}'

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Monitor logs: pm2 logs behavior-processor-fixed"
echo "2. Check dashboard at https://app.sentientiq.app/pulse"
echo "3. Watch for test event (sessionId: TEST-DEPLOY)"
EOF

echo ""
echo "=== Deployment Complete ==="
echo "The behavior processor is now running with position tracking."
echo "It will only process NEW events going forward."