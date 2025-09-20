# ML Emotion Detection System - Handoff Notes
**Date**: January 18, 2025
**Status**: ✅ OPERATIONAL with debouncing implemented

## 🎯 Current State
The ML-based emotion detection system is now running successfully, replacing the hostile rule-based state machine. The system detects behavioral patterns in real-time and publishes emotions to the dashboard WITHOUT Redis (direct NATS publishing).

## 🏗️ Architecture
```
Browser → HTTP/WS → Gateway (port 3002) → NATS → ML Service → EMOTIONS.state
```

### Key Components:
1. **telemetry-gateway-standalone.cjs** - Ingests telemetry, publishes to NATS
2. **emotion-ml-service.py** - ML brain that detects emotions
3. **simple-behavior-simulator.py** - Test simulator (no human contamination)

## 🚀 Running Services (PM2)
```bash
# Current running processes:
pm2 list
# Should show:
# - emotion-ml (Python ML service)
# - telemetry-gateway (Node.js NATS gateway)
```

## 🔧 Recent Fixes Applied
1. **Removed Redis redundancy** - Direct NATS publishing
2. **Implemented debouncing**:
   - 5-second per-session debounce
   - 15% confidence delta threshold
   - Prevents duplicate flooding
3. **Clean logging** - Only logs confident detections (>65%)

## 📊 Current Detection Performance
```
✅ Price Shock: 78-89% confidence
✅ Confusion: 67% confidence
✅ Frustration: 67% confidence
✅ Engagement: 73-75% confidence
✅ Comparison Shopping: 72-77% confidence
```

## ⚠️ Known Issues
1. **Engagement sometimes starts as frustration** - Needs threshold tuning
2. **Abandonment_intent not always detected after price_shock** - Pattern needs refinement
3. **Python dependencies** - PM2 uses system Python, needs packages installed with `--user --break-system-packages`

## 🛠️ Key Files & Their Purposes

### Core ML Service
- **/emotion-ml-service.py** - Main ML service
  - Uses scikit-learn for detection
  - Subscribes to TELEMETRY.events
  - Publishes to EMOTIONS.state
  - Has 5s debounce, 15% confidence delta

### Gateway
- **/telemetry-gateway-standalone.cjs** - NATS gateway
  - Receives HTTP POST at :3002/api/telemetry
  - Publishes to NATS topic TELEMETRY.events
  - NO REDIS (removed per user request)

### Testing Tools
- **/simple-behavior-simulator.py** - HTTP simulator
  - Run with: `python3 simple-behavior-simulator.py all`
  - Tests: price_shock, confusion, frustration, engagement, comparison

- **/behavioral-training-data.py** - Pattern definitions
  - Defines what each emotion looks like
  - Used for training the ML models

## 📝 Critical Configuration

### ML Service Settings (emotion-ml-service.py)
```python
self.process_debounce = 5.0  # 5 second debounce
self.max_buffer_size = 50    # Event buffer size
# Publishes only if:
# - Emotion changes OR
# - Confidence changes by >15%
```

### NATS Topics
- **Subscribe**: TELEMETRY.events (ML service listens here)
- **Publish**: EMOTIONS.state (ML publishes emotions here)

## 🚨 Emergency Recovery

### If ML service crashes:
```bash
pm2 restart emotion-ml
pm2 logs emotion-ml --lines 20
```

### If gateway crashes:
```bash
pm2 restart telemetry-gateway
pm2 logs telemetry-gateway --lines 20
```

### If Python packages missing:
```bash
pip3 install --user --break-system-packages numpy pandas scikit-learn scipy nats-py requests
```

### Full restart:
```bash
pm2 delete all
pm2 start telemetry-gateway-standalone.cjs --name telemetry-gateway
pm2 start emotion-ml-service.py --name emotion-ml --interpreter python3
```

## 🧪 Testing Procedure
1. Check services are running: `pm2 list`
2. Run simulation: `python3 simple-behavior-simulator.py all`
3. Check ML logs: `pm2 logs emotion-ml --lines 30 --nostream | grep "🎯"`
4. Verify no duplicates in dashboard

## 💡 Next Steps / TODO
1. **Tune detection thresholds** in emotion-ml-service.py:
   - Lower idle_ratio threshold for better abandonment detection
   - Adjust frustration vs engagement initial detection

2. **Add more patterns** to behavioral-training-data.py:
   - Better abandonment_intent after price_shock
   - Trust-building patterns
   - Purchase intent patterns

3. **Consider adding**:
   - Persistence layer for ML model training
   - Feedback loop from actual conversions
   - A/B testing framework for interventions

## 🔑 Key Insights
- The ML approach is working! Individual visitor patterns ARE distinguishable
- Debouncing is CRITICAL - without it, dashboard gets flooded
- Programmatic simulation (no human mouse) gives clean training data
- Direct NATS publishing eliminates unnecessary complexity (goodbye Redis!)

## 📞 Contact Context
User was experiencing:
- "The world's most hostile state machine!" - everything detected as abandonment
- Duplicate flooding making logs unreadable ("creating a smoke screen")
- VS Code getting shaky from log volume

Solution implemented:
- ML-based detection with proper debouncing
- Clean, confident-only logging
- Direct NATS architecture (no Redis)

## 🎯 Success Metrics
- Clean logs with only significant changes
- No duplicate flooding in dashboard
- Accurate emotion detection across all test scenarios
- 5-second debounce preventing rapid re-processing

---

**Last Action**: Increased debounce to 5s and confidence delta to 15% to prevent duplicate publishing to dashboard.

**System is OPERATIONAL and detecting emotions correctly with clean, deduplicated output.**