#!/bin/bash

# SentientIQ Moat Shutdown
# Gracefully stop the truth engine

echo "
🛑 STOPPING SENTIENTIQ MOAT
═══════════════════════════
"

# Load PIDs
if [ -f "sentientiq.pids" ]; then
    source sentientiq.pids
    
    # Stop Python processes
    if [ ! -z "$PHD_COLLECTIVE" ]; then
        echo "Stopping PhD Collective (PID: $PHD_COLLECTIVE)..."
        kill $PHD_COLLECTIVE 2>/dev/null || true
    fi
    
    if [ ! -z "$API" ]; then
        echo "Stopping API (PID: $API)..."
        kill $API 2>/dev/null || true
    fi
    
    rm sentientiq.pids
    echo "✅ Python services stopped"
else
    echo "⚠️  No PID file found"
fi

# Stop Docker containers
cd infrastructure
echo "Stopping Docker containers..."
docker-compose down

echo "
✅ SENTIENTIQ MOAT STOPPED
═════════════════════════

The moat accumulation has paused.
But the data remains. 
The truth is preserved.

To restart: ./start_moat.sh
"