# SentientIQ Unified Script - Comprehensive Handoff Documentation

## Critical Architecture Overview

### What We've Built
A revolutionary behavioral intelligence system that "reads minds through the mouse" by analyzing biomechanical patterns at 120Hz sampling rate. The system consists of:

1. **Pure Telemetry Capture** (Client-side)
   - Raw physics calculations: velocity, acceleration, jerk
   - FFT tremor analysis (8-12Hz stress detection)
   - Micro-gesture detection
   - Viewport proximity tracking
   - Text selection monitoring
   - Tab switching patterns
   - Memory pressure detection

2. **Processing Pipeline** (Server-side)
   - Telemetry Gateway (Port 3002) → Redis Streams
   - Behavior Processor → Emotional attribution (18 distinct emotions)
   - Intervention Processor → Decision engine
   - Two broadcast points:
     - Emotional Broadcaster (Port 3003) - Emotions to dashboard
     - Intervention Broadcaster (Port 3004) - Interventions to clients

3. **Dashboard Components** (/pulse)
   - EmotionalStream.tsx - Real-time emotion visualization
   - InterventionStream.tsx - Live intervention tracking

## The Unified Script Requirements

The unified script MUST combine:

### From sentientiq-telemetry-pure.js (1340 lines of critical telemetry):

```javascript
// Core physics tracking
- 120Hz mouse sampling with jerk calculations
- FFT for tremor analysis (requires buffer of last 32 samples)
- Micro-gesture detection (circles, zigzags, dwelling)
- Viewport boundary proximity with exit vectors
- Text selection with price detection ($xxx patterns)
- Tab switching and memory pressure monitoring
- Rage click detection (3+ clicks in 500ms)
- Scroll depth and velocity tracking
- Form field interaction timing
- Cart interaction patterns

// Advanced biomechanical features
- Acceleration/deceleration patterns
- Movement smoothness analysis
- Pause detection and duration
- Direction change frequency
- Speed variance calculations
```

### Intervention Reception & Rendering:
```javascript
// WebSocket connection to intervention broadcaster
- Connect to ws://98.87.12.130:3004/ws/interventions
- Subscribe to intervention channel
- Render interventions: modals, banners, chat widgets
- Track intervention acceptance/dismissal
- Report results back to server
```

## Complete Unified Script Structure

```javascript
/**
 * SentientIQ Unified Script v7.0
 * Complete telemetry + intervention system
 * Deploy to: marketing-website/public/sentientiq-unified.js
 */

(function(window, document) {
  'use strict';

  const config = {
    // Core configuration
    tenantId: window.SENTIENTIQ_TENANT_ID || 'demo',
    debug: window.SENTIENTIQ_DEBUG || false,

    // Telemetry settings
    telemetryEndpoint: 'ws://98.87.12.130:3002/ws',
    httpFallback: 'http://98.87.12.130:3002/api/telemetry',
    samplingRate: 120, // Hz
    batchSize: 50,
    flushInterval: 2000,

    // Intervention settings
    enableInterventions: window.SENTIENTIQ_ENABLE_INTERVENTIONS !== false,
    interventionEndpoint: 'ws://98.87.12.130:3004/ws/interventions',

    // FFT settings for tremor analysis
    fftBufferSize: 32,
    tremorFreqMin: 8, // Hz
    tremorFreqMax: 12, // Hz
  };

  class SentientIQ {
    constructor() {
      // Session management
      this.sessionId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStart = Date.now();

      // Telemetry state
      this.buffer = [];
      this.ws = null;
      this.isConnected = false;

      // Mouse physics tracking
      this.mouseState = {
        x: 0, y: 0,
        vx: 0, vy: 0,
        ax: 0, ay: 0,
        lastTime: Date.now(),
        history: [], // For FFT analysis
        microGestures: {
          circles: 0,
          zigzags: 0,
          dwells: []
        }
      };

      // Intervention state
      this.interventionWs = null;
      this.activeInterventions = new Set();

      // Performance monitoring
      this.lastActivity = Date.now();
      this.idleTimer = null;

      this.init();
    }

    init() {
      // Connect both WebSockets
      this.connectTelemetry();
      if (config.enableInterventions) {
        this.connectInterventions();
      }

      // Setup all telemetry tracking
      this.setupMouseTracking();
      this.setupInteractionTracking();
      this.setupViewportTracking();
      this.setupPerformanceMonitoring();
      this.setupScrollTracking();
      this.setupFormTracking();
      this.setupCartTracking();

      // Setup intervention rendering
      if (config.enableInterventions) {
        this.setupInterventionRenderer();
      }

      // Batch flush interval
      setInterval(() => this.flush(), config.flushInterval);

      // FFT analysis interval (for tremor detection)
      setInterval(() => this.analyzeTremor(), 250);
    }

    // [Include ALL telemetry methods from original]
    // - setupMouseTracking() with full physics
    // - analyzeTremor() with FFT
    // - detectMicroGestures()
    // - trackViewportProximity()
    // - All other tracking methods...

    // [Include intervention methods]
    // - connectInterventions()
    // - handleIntervention()
    // - renderDiscountModal()
    // - All other intervention rendering...
  }

  window.SentientIQ = new SentientIQ();

})(window, document);
```

## Critical Features That MUST Be Included

### 1. FFT Tremor Analysis
```javascript
analyzeTremor() {
  if (this.mouseState.history.length < config.fftBufferSize) return;

  const samples = this.mouseState.history.slice(-config.fftBufferSize);
  // Implement FFT to detect 8-12Hz tremor frequency
  // This indicates stress/anxiety
}
```

### 2. Micro-gesture Detection
```javascript
detectMicroGestures() {
  // Detect circular motions (confusion)
  // Detect zigzag patterns (frustration)
  // Detect dwelling (hesitation)
}
```

### 3. Viewport Exit Vectors
```javascript
trackViewportExit(e) {
  const exitAngle = Math.atan2(e.clientY - window.innerHeight/2,
                               e.clientX - window.innerWidth/2) * 180 / Math.PI;
  const exitVelocity = Math.sqrt(this.mouseState.vx ** 2 + this.mouseState.vy ** 2);
  // Track where and how fast they're leaving
}
```

### 4. Tab Switching Detection
```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // They switched tabs - track duration when they return
    this.tabSwitchStart = Date.now();
  } else if (this.tabSwitchStart) {
    const awayDuration = Date.now() - this.tabSwitchStart;
    // Long duration = comparison shopping
  }
});
```

### 5. Text Selection with Price Detection
```javascript
document.addEventListener('mouseup', () => {
  const text = window.getSelection().toString().trim();
  if (text.length > 0) {
    const hasPrice = /\$\d+|\d+\.\d{2}/.test(text);
    // Price selection = sticker shock indicator
  }
});
```

## GTM Integration Script Tag

```html
<!-- SentientIQ Unified Behavioral Intelligence -->
<script>
  // Configuration (customize per site)
  window.SENTIENTIQ_TENANT_ID = 'your-tenant-id';
  window.SENTIENTIQ_DEBUG = false; // Set true for console logging
  window.SENTIENTIQ_ENABLE_INTERVENTIONS = true; // Set false to disable interventions
</script>
<script src="https://your-cdn-domain.netlify.app/sentientiq-unified.js" async></script>
```

## Deployment Steps

1. **Create Complete Unified Script**
   - Copy ALL telemetry features from sentientiq-telemetry-pure.js
   - Add intervention WebSocket connection
   - Include intervention rendering logic
   - Ensure bidirectional communication

2. **Deploy to Netlify**
   - Place in: `marketing-website/public/sentientiq-unified.js`
   - Deploy marketing-website to Netlify
   - Get production CDN URL - It's sentientiq.ai

3. **GTM Configuration**
   - Add configuration variables in Custom HTML tag
   - Load script from Netlify CDN
   - Fire on All Pages trigger

## Testing Checklist

- [ ] Mouse physics calculations working (velocity, acceleration, jerk)
- [ ] FFT tremor analysis detecting 8-12Hz patterns
- [ ] Micro-gestures being detected (circles, zigzags, dwelling)
- [ ] Viewport proximity and exit vectors tracked
- [ ] Text selection with price detection working
- [ ] Tab switching patterns captured
- [ ] Rage clicks detected
- [ ] Telemetry batches reaching gateway (port 3002)
- [ ] Interventions received from broadcaster (port 3004)
- [ ] Intervention modals rendering correctly
- [ ] Intervention acceptance/dismissal tracked
- [ ] Dashboard showing real-time emotions
- [ ] Dashboard showing intervention triggers

## Common Issues & Solutions

1. **Script Too Small**: Original was 1340 lines, unified must include ALL features
2. **Missing FFT**: Essential for stress detection via tremor analysis
3. **No Micro-gestures**: Critical for confusion/frustration detection
4. **Intervention Not Rendering**: Check WebSocket connection to port 3004
5. **Telemetry Not Sending**: Verify WebSocket to port 3002, check HTTP fallback

## Architecture Diagram

```
Client Browser (GTM Script)
    ├── Telemetry Capture (120Hz)
    │   └── WebSocket → Port 3002 (Gateway)
    │       └── Redis Streams
    │           └── Behavior Processor
    │               └── Emotional Broadcaster (Port 3003) → Dashboard
    │               └── Intervention Processor
    │                   └── Intervention Broadcaster (Port 3004)
    │                       └── WebSocket → Client (Interventions)
    └── Intervention Rendering
        ├── Modals
        ├── Banners
        └── Chat Widgets
```

## Next Steps

1. Create the complete unified script with ALL telemetry features
2. Test locally with direct script inclusion
3. Deploy to Netlify and get production URL
4. Configure GTM with production script URL
5. Monitor dashboard for real-time emotions and interventions

## Critical Success Factors

- **Telemetry Completeness**: Must capture ALL biomechanical patterns from original
- **Real-time Performance**: 120Hz sampling without browser lag
- **Bidirectional Flow**: Telemetry out, interventions in
- **Zero Dependencies**: Pure vanilla JS, no external libraries
- **Cross-browser Compatibility**: Works on all modern browsers
- **Graceful Degradation**: HTTP fallback if WebSocket fails

This unified script is the crown jewel of the SentientIQ system - it must be perfect.