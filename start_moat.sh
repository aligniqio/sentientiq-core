#!/bin/bash

# SentientIQ Moat Initializer
# This starts the emotional intelligence infrastructure
# After this runs, Math.random() vendors should start panicking

set -e

echo "
🚀 SENTIENTIQ MOAT INITIALIZATION
══════════════════════════════════

Starting the infrastructure that exposes Math.random() as fraud
and accumulates unreplicatable emotional intelligence.

This is Day 0 of the moat.
"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check for environment variables
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cat > .env << EOF
# SentientIQ Environment Variables
POSTGRES_PASSWORD=truthmatters2024
AWS_ACCESS_KEY_ID=sentientiq
AWS_SECRET_ACCESS_KEY=truthwins2024
GRAFANA_PASSWORD=truthdashboard
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379
S3_BUCKET=sentientiq-moat
EOF
    echo "✅ Created .env file"
fi

# Load environment variables
source .env

echo "
Step 1: Starting infrastructure containers
──────────────────────────────────────────
"

# Start infrastructure
cd infrastructure
docker-compose up -d

# Wait for services to be healthy
echo "
Step 2: Waiting for services to initialize
──────────────────────────────────────────
"

# Wait for NATS
until curl -s http://localhost:8222/healthz > /dev/null; do
    echo "Waiting for NATS JetStream..."
    sleep 2
done
echo "✅ NATS JetStream: Ready"

# Wait for Redis
until docker exec sentientiq-redis redis-cli ping > /dev/null 2>&1; do
    echo "Waiting for Redis..."
    sleep 2
done
echo "✅ Redis: Ready"

# Wait for PostgreSQL
until docker exec sentientiq-postgres pg_isready > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL with pgVector: Ready"

# Wait for MinIO
until curl -s http://localhost:9000/minio/health/live > /dev/null; do
    echo "Waiting for MinIO (S3)..."
    sleep 2
done
echo "✅ MinIO S3: Ready"

echo "
Step 3: Creating S3 buckets for the moat
─────────────────────────────────────────
"

# Create MinIO bucket using mc (MinIO client)
docker run --rm --network sentientiq-network \
    minio/mc:latest \
    alias set minio http://minio:9000 $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY && \
    mc mb minio/sentientiq-moat 2>/dev/null || true

echo "✅ S3 Bucket 'sentientiq-moat' created"

echo "
Step 4: Initializing Dr. Brutal's memory (pgVector)
────────────────────────────────────────────────────
"

# Initialize pgVector tables
docker exec sentientiq-postgres psql -U sentient -d sentientiq << EOF
-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create initial tables (from brutalMemory.sql)
$(cat ../src/lib/brutalMemory.sql)

EOF

echo "✅ Dr. Brutal's memory initialized"

echo "
Step 5: Installing Python dependencies
───────────────────────────────────────
"

cd ../backend

# Create virtual environment if doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate and install
source venv/bin/activate
pip install -r requirements.txt

echo "
Step 6: Initializing JetStream and the Moat
────────────────────────────────────────────
"

# Initialize JetStream streams
python3 -c "
import asyncio
from jetstream_config import setup_pipeline

async def init():
    await setup_pipeline()

asyncio.run(init())
"

# Initialize the moat structure
python3 -c "
import asyncio
from moat_builder import build_the_fortress

asyncio.run(build_the_fortress())
"

echo "
Step 7: Starting the PhD Collective
────────────────────────────────────
"

# Start PhD agents in background
nohup python3 phd_collective.py > phd_collective.log 2>&1 &
PHD_PID=$!
echo "✅ PhD Collective started (PID: $PHD_PID)"

echo "
Step 8: Starting the FastAPI backend
─────────────────────────────────────
"

# Start the main API
nohup python3 main.py > api.log 2>&1 &
API_PID=$!
echo "✅ API started (PID: $API_PID)"

echo "
═══════════════════════════════════════════════════════════

🎉 SENTIENTIQ MOAT IS ACCUMULATING

Infrastructure Status:
─────────────────────
✅ NATS JetStream:     http://localhost:8222
✅ Redis:              localhost:6379
✅ PostgreSQL:         localhost:5432
✅ MinIO S3:           http://localhost:9001 (console)
✅ Prometheus:         http://localhost:9090
✅ Grafana:            http://localhost:3000
✅ API:                http://localhost:8000
✅ API Docs:           http://localhost:8000/docs

The Moat is Now:
───────────────
• Accumulating emotional fingerprints
• Building consensus patterns
• Learning from feedback
• Getting deeper every second

Next Steps:
──────────
1. Open Grafana at http://localhost:3000
   Username: admin
   Password: $GRAFANA_PASSWORD

2. Monitor the moat depth:
   curl http://localhost:8000/api/moat/depth

3. Check the EVI pulse:
   curl http://localhost:8000/api/pulse

4. View the Wall of Shame:
   curl http://localhost:8000/api/wall-of-shame

The longer this runs, the more defensible we become.
Math.random() can't compete with accumulated truth.

Process PIDs saved to: sentientiq.pids
To stop: ./stop_moat.sh
"

# Save PIDs for shutdown
echo "PHD_COLLECTIVE=$PHD_PID" > sentientiq.pids
echo "API=$API_PID" >> sentientiq.pids

echo "
🏰 THE MOAT DEEPENS WITH EVERY PASSING SECOND
"