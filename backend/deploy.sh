#!/bin/bash
# Deploy SentientIQ Intelligence API to EC2

EC2_HOST="3.15.29.138"
EC2_USER="ec2-user"

echo "🧠 Deploying SentientIQ Neural Intelligence..."

# Create .env file locally
cat > backend/.env << EOF
AWS_REGION=us-east-2
MOAT_BUCKET=sentientiq-data-moat
PULSE_SNAPSHOT_KEY=evi_ts/latest_snapshot.json
ML_BUCKET=sentientiq-ml-375218375
MODEL_REGISTRY_KEY=registry/manifest.json
CORS_ORIGINS=https://sentientiq.app,https://sentientiq-core-collective.netlify.app,http://localhost:3000
READY_REQUIRE_S3=false
APP_VERSION=sentientiq-1.0.0-neural
EOF

# Copy files to EC2
echo "📦 Copying files to EC2..."
scp backend/app.py backend/.env ${EC2_USER}@${EC2_HOST}:/home/ec2-user/

# Install and run on EC2
echo "🚀 Installing dependencies and starting service..."
ssh ${EC2_USER}@${EC2_HOST} << 'ENDSSH'
# Install Python dependencies
pip3 install fastapi uvicorn boto3 s3fs pandas joblib scikit-learn python-multipart

# Stop existing service if running
pm2 stop sentientiq-api 2>/dev/null || true

# Load environment variables
set -a
source /home/ec2-user/.env
set +a

# Start with PM2
pm2 start "uvicorn app:app --host 0.0.0.0 --port 8000" --name sentientiq-api
pm2 save
pm2 startup

echo "✅ API deployed and running!"
echo "📡 Endpoints available at:"
echo "   http://3.15.29.138:8000/"
echo "   http://3.15.29.138:8000/ask"
echo "   http://3.15.29.138:8000/pulse"
echo "   http://3.15.29.138:8000/pulse/snapshot"
echo "   http://3.15.29.138:8000/feedback"
ENDSSH

echo "🎉 Deployment complete! The PhD Collective is online!"
echo "🔗 Test with: curl http://3.15.29.138:8000/healthz"