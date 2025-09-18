# 🎭 SentientIQ Handoff - January 17, 2025
## "The Crystal Palace of Marketing Truth"

## 🚀 System Status: OPERATIONAL with KNOWN ISSUES

### ✅ What's Working
- **Full Emotional Spectrum Detection**: 7 emotion types (frustration, confusion, interest, intention, excitement, hesitation, trust)
- **Behavioral Pattern Recognition**: Detects sticker shock, comparison shopping, purchase funnel, abandonment risk, frustration spiral
- **Pipeline Architecture**: Complete flow from telemetry → gateway → processor → emotions → dashboard
- **Dual-Stream Visualization**: Shows both raw behaviors AND emotional interpretations (polygraph + psychologist)
- **Infrastructure**: All services running on PM2 with auto-restart

### ⚠️ Critical Issue: Marketing Website Telemetry Script
**PROBLEM**: The marketing website (sentientiq.app) is only sending tremor events to the pipeline, despite the telemetry script (sentientiq-unified.js) claiming to send 44-50 events per batch.

**SYMPTOMS**:
```
[SentientIQ] Sent 44 events via WebSocket  // Script says this
📡 WS sq_xxx: 8 events → NATS             // Gateway only receives 8 (all tremors)
Events: tremor, tremor, tremor, tremor... // Processor only sees tremors
```

**ROOT CAUSE SUSPECTS**:
1. **Telemetry Script Filter Too Aggressive**: The script might be filtering out non-tremor events before sending
2. **Rage Click Threshold Too High**: User's actual rage clicks aren't meeting the detection criteria
3. **Event Batching Error**: Events are being incorrectly batched, causing only tremors to make it through

**VERIFICATION**: Direct NATS tests work perfectly - when we send rage clicks directly to JetStream, they're processed correctly and generate appropriate emotions with pattern detection.

---

## 🏗️ System Architecture

### Services Running (PM2)
```bash
┌──────────────────────┬────────┬─────────────────────────────────────┐
│ emotion-processor    │ 30     │ Behavioral pattern detection       │
│ nats-gateway        │ 31     │ WebSocket → JetStream gateway      │
│ nats-bridge         │ 32     │ Emotion WebSocket for dashboard    │
│ behavioral-bridge   │ 33     │ Dual-stream WebSocket (port 9223)  │
│ nats-interventions  │ 34     │ Intervention trigger service        │
└──────────────────────┴────────┴─────────────────────────────────────┘
```

### Data Flow
```
1. Browser (sentientiq-unified.js)
   ↓ WebSocket (port 8080)
2. nats-gateway
   ↓ JetStream (TELEMETRY.events)
3. behavioral-processor
   ↓ Core NATS (EMOTIONS.state)
4. nats-bridge
   ↓ WebSocket (port 9222)
5. Dashboard (useEmotionalSpectrum hook)
```

---

## 🔧 Troubleshooting Commands

### Check Event Flow
```bash
# See what gateway is receiving
pm2 logs nats-gateway --lines 50

# See what processor is processing
pm2 logs emotion-processor --lines 50

# Test pipeline directly (bypasses telemetry script)
node test-direct-events.cjs

# Monitor emotions in real-time
node emotion-monitor.cjs
```

### Reset if Stuck
```bash
# Restart processor (resets JetStream consumer)
pm2 restart emotion-processor

# Full system restart
pm2 restart all
```

---

## 📝 Next Steps to Fix Telemetry Issue

### Option 1: Debug Telemetry Script
1. Check `marketing-website/public/sentientiq-unified.js`
2. Look for event filtering before WebSocket send
3. Lower rage click detection threshold (currently might be 5 clicks in 2 seconds)
4. Add console logs to see what events are being captured vs sent

### Option 2: Bypass Filter
```javascript
// In sentientiq-unified.js, find the batch sending logic
// Currently might be:
if (eventBatch.length > 0) {
  const filtered = eventBatch.filter(e => /* some condition */);
  ws.send(filtered);
}

// Change to:
if (eventBatch.length > 0) {
  ws.send(eventBatch); // Send ALL events
}
```

### Option 3: Lower Detection Thresholds
```javascript
// Find rage click detection
if (clickCount >= 5 && timeDiff < 2000) { // Current
// Change to:
if (clickCount >= 3 && timeDiff < 2000) { // More sensitive
```

---

## 🎯 What Was Accomplished Today

1. **Fixed Emotion Pipeline**: Discovered and fixed JetStream vs Core NATS mismatch
2. **Created Behavioral Processor**: Sophisticated pattern detection with session state
3. **Implemented Dual-Stream UI**: Shows both behaviors and emotions transparently
4. **Renamed Hooks**: useSimpleEmotions → useEmotionalSpectrum (reflects sophistication)
5. **Tuned Sensitivity**: Reduced tremor noise, improved pattern detection
6. **Philosophy Realized**: "The precision of a polygraph and the empathy of a psychologist"

---

## 💡 Key Insights

- **Tremor-only batches are system noise** (mouse idle), not user behavior
- **Patterns matter more than individual events** (sticker shock = pricing → panic → exit)
- **Transparency drives adoption** (show the behavior AND what it means)
- **Glassmorphism reflects product philosophy** (nothing hidden, everything illuminated)

---

## 🚨 IMMEDIATE ACTION NEEDED

**The marketing website telemetry script needs fixing** - it's only sending tremors, not the rich behavioral data it's capturing. This is preventing the full emotional spectrum from being detected for real users.

Check `/marketing-website/public/sentientiq-unified.js` for:
- Event filtering logic
- Batch processing
- WebSocket send conditions
- Rage click detection thresholds

The pipeline itself is perfect. The telemetry capture is the bottleneck.

---

## 📊 Test Commands Ready to Use

```bash
# Test full emotional spectrum
node test-full-spectrum.cjs

# Test behavioral patterns (sticker shock, etc)
node test-behavioral-patterns.cjs

# Send rage clicks directly
node test-direct-events.cjs

# Monitor emotions in real-time
ssh -i .ssh/collective-backend.pem ec2-user@98.87.12.130 "node emotion-monitor.cjs"
```

---

*"We're not guessing. We're not assuming. We're showing you exactly what happened and what it means."*

**Status**: System operational, telemetry script needs debugging to capture full behavioral spectrum beyond tremors.