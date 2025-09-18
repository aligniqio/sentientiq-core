/**
 * SentientIQ Unified Script v7.0
 * Complete behavioral telemetry + intervention system
 * Production-ready for GTM deployment
 *
 * Deploy to: sentientiq.ai/sentientiq-unified.js
 */

(function(window, document) {
  'use strict';

  // Prevent duplicate loading
  if (window.SentientIQUnified) {
    console.log('[SentientIQ] Already loaded');
    return;
  }

  // ============ CONFIGURATION ============
  const config = {
    // Core configuration
    tenantId: window.SENTIENTIQ_TENANT_ID || 'demo',
    debug: window.SENTIENTIQ_DEBUG || false,

    // Telemetry settings
    telemetryEndpoint: 'wss://api.sentientiq.app/ws/telemetry',
    httpFallback: 'https://api.sentientiq.app/api/telemetry',
    samplingRate: 120, // Hz for biomechanical precision
    batchSize: 50,
    flushInterval: 1000, // Reduced from 2000ms for faster delivery

    // Intervention settings
    enableInterventions: window.SENTIENTIQ_ENABLE_INTERVENTIONS !== false,
    interventionEndpoint: 'wss://api.sentientiq.app/ws/interventions',

    // FFT settings for tremor analysis
    fftBufferSize: 32,
    tremorFreqMin: 8, // Hz - stress indicator
    tremorFreqMax: 12, // Hz - stress indicator

    // Physics thresholds
    microMovementThreshold: 3, // pixels
    macroMovementThreshold: 50, // pixels
    jerkThreshold: 1000, // px/s^3 - frustration indicator

    // Gesture detection
    circleThreshold: 0.7, // circularity score
    dwellThreshold: 500, // ms - hesitation indicator
    rageClickThreshold: 3, // clicks in 500ms
    rageClickWindow: 500, // ms

    // Viewport tracking
    viewportBoundary: 50, // pixels from edge
    exitVectorThreshold: 200 // px/s velocity
  };

  // ============ SENTIENTIQ UNIFIED CLASS ============
  class SentientIQUnified {
    constructor() {
      // Session management
      this.sessionId = this.generateSessionId();
      this.sessionStart = Date.now();
      sessionStorage.setItem('sq_session_id', this.sessionId);

      // Telemetry state
      this.buffer = [];
      this.ws = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      this.maxReconnects = 5;

      // Mouse physics state
      this.mouseState = {
        x: 0,
        y: 0,
        vx: 0, // velocity x
        vy: 0, // velocity y
        ax: 0, // acceleration x
        ay: 0, // acceleration y
        jx: 0, // jerk x
        jy: 0, // jerk y
        lastTime: Date.now(),
        lastVx: 0,
        lastVy: 0,
        lastAx: 0,
        lastAy: 0,
        history: [], // For FFT analysis
        microGestures: {
          circles: 0,
          zigzags: 0,
          dwells: [],
          lastDwellStart: null
        }
      };

      // Click tracking
      this.clickState = {
        history: [],
        rageClicks: 0
      };

      // Scroll tracking
      this.scrollState = {
        depth: 0,
        maxDepth: 0,
        velocity: 0,
        lastY: 0,
        lastTime: Date.now()
      };

      // Tab switching
      this.tabState = {
        switchCount: 0,
        awayDuration: 0,
        lastHiddenTime: null
      };

      // Text selection
      this.selectionState = {
        count: 0,
        priceSelections: 0,
        lastSelection: null
      };

      // Form tracking
      this.formState = {
        interactions: [],
        abandonments: []
      };

      // Intervention state
      this.interventionWs = null;
      this.activeInterventions = new Set();
      this.interventionHistory = [];

      // Performance monitoring
      this.lastActivity = Date.now();
      this.idleTimer = null;
      this.memoryPressure = false;

      // Element mapping
      this.elementMap = new Map();
      this.hoveredElements = new Set();

      // Initialize
      this.init();
    }

    generateSessionId() {
      return `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    init() {
      if (config.debug) {
        console.log('[SentientIQ] Initializing unified system');
        console.log('[SentientIQ] Session:', this.sessionId);
        console.log('[SentientIQ] Tenant:', config.tenantId);
      }

      // Connect telemetry WebSocket
      this.connectTelemetry();

      // Connect intervention WebSocket if enabled
      if (config.enableInterventions) {
        this.connectInterventions();
      }

      // Setup all tracking systems
      this.setupMouseTracking();
      this.setupClickTracking();
      this.setupScrollTracking();
      this.setupViewportTracking();
      this.setupTabTracking();
      this.setupTextSelection();
      this.setupFormTracking();
      this.setupMemoryMonitoring();
      this.mapElements();

      // Setup intervention renderer if enabled
      if (config.enableInterventions) {
        this.setupInterventionRenderer();
      }

      // Batch flush interval
      this.flushTimer = setInterval(() => {
        if (config.debug && this.buffer.length > 0) {
          console.log(`[SentientIQ] Flush timer: ${this.buffer.length} events in buffer`);
        }
        this.flush();
      }, config.flushInterval);

      // FFT analysis interval for tremor detection
      this.fftTimer = setInterval(() => this.analyzeTremor(), 250);

      // Element remapping interval
      this.mapTimer = setInterval(() => this.mapElements(), 5000);

      // Cleanup on unload
      window.addEventListener('beforeunload', () => this.cleanup());
    }

    // ============ TELEMETRY CONNECTION ============
    connectTelemetry() {
      try {
        const wsUrl = `${config.telemetryEndpoint}?session=${this.sessionId}&tenant=${config.tenantId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          if (config.debug) console.log('[SentientIQ] Telemetry connected');

          // Send initial connection event
          this.track('connection', {
            type: 'telemetry_connected',
            userAgent: navigator.userAgent,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            screen: {
              width: screen.width,
              height: screen.height
            }
          });
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.ws = null;
          if (config.debug) console.log('[SentientIQ] Telemetry disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          if (config.debug) console.error('[SentientIQ] Telemetry error:', error);
        };

      } catch (error) {
        if (config.debug) console.error('[SentientIQ] Failed to connect telemetry:', error);
        this.fallbackToHttp();
      }
    }

    attemptReconnect() {
      if (this.reconnectAttempts >= config.maxReconnects) {
        if (config.debug) console.log('[SentientIQ] Max reconnects reached, falling back to HTTP');
        this.fallbackToHttp();
        return;
      }

      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      setTimeout(() => {
        if (config.debug) console.log(`[SentientIQ] Reconnecting... (${this.reconnectAttempts}/${config.maxReconnects})`);
        this.connectTelemetry();
      }, delay);
    }

    fallbackToHttp() {
      // Use HTTP fallback for telemetry
      this.useHttpFallback = true;
    }

    // ============ MOUSE PHYSICS TRACKING ============
    setupMouseTracking() {
      let lastSampleTime = Date.now();
      let samplingTimer = null;

      // High-frequency mouse tracking
      document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        const dt = (now - this.mouseState.lastTime) / 1000; // Convert to seconds

        if (dt <= 0) return; // Prevent division by zero

        // Calculate velocity
        const vx = (e.clientX - this.mouseState.x) / dt;
        const vy = (e.clientY - this.mouseState.y) / dt;

        // Calculate acceleration
        const ax = (vx - this.mouseState.vx) / dt;
        const ay = (vy - this.mouseState.vy) / dt;

        // Calculate jerk (rate of change of acceleration)
        const jx = (ax - this.mouseState.ax) / dt;
        const jy = (ay - this.mouseState.ay) / dt;

        // Update state
        this.mouseState.x = e.clientX;
        this.mouseState.y = e.clientY;
        this.mouseState.vx = vx;
        this.mouseState.vy = vy;
        this.mouseState.ax = ax;
        this.mouseState.ay = ay;
        this.mouseState.jx = jx;
        this.mouseState.jy = jy;
        this.mouseState.lastTime = now;

        // Store in history for FFT analysis
        this.mouseState.history.push({
          x: e.clientX,
          y: e.clientY,
          vx: vx,
          vy: vy,
          ax: ax,
          ay: ay,
          jx: jx,
          jy: jy,
          timestamp: now
        });

        // Keep buffer size limited
        if (this.mouseState.history.length > config.fftBufferSize * 2) {
          this.mouseState.history.shift();
        }

        // Detect micro-gestures
        this.detectMicroGestures(e);

        // Check viewport proximity
        this.checkViewportProximity(e);

        // Check for dwelling (hesitation)
        this.checkDwelling(vx, vy);

        // Sample at configured rate for telemetry
        if (now - lastSampleTime >= 1000 / config.samplingRate) {
          this.track('mouse', {
            x: e.clientX,
            y: e.clientY,
            vx: Math.round(vx),
            vy: Math.round(vy),
            ax: Math.round(ax),
            ay: Math.round(ay),
            jx: Math.round(jx),
            jy: Math.round(jy),
            speed: Math.round(Math.sqrt(vx * vx + vy * vy)),
            jerk: Math.round(Math.sqrt(jx * jx + jy * jy))
          });
          lastSampleTime = now;
        }
      });

      // Mouse leave tracking (potential exit intent)
      document.addEventListener('mouseleave', (e) => {
        const exitVector = this.calculateExitVector(e);
        this.track('mouse_exit', exitVector);
      });
    }

    // ============ MICRO-GESTURE DETECTION ============
    detectMicroGestures(e) {
      if (this.mouseState.history.length < 10) return;

      const recent = this.mouseState.history.slice(-10);

      // Detect circular motion (confusion indicator)
      const circularity = this.calculateCircularity(recent);
      if (circularity > config.circleThreshold) {
        this.mouseState.microGestures.circles++;
        this.track('micro_gesture', {
          type: 'circle',
          circularity: circularity
        });
      }

      // Detect zigzag pattern (frustration indicator)
      const directionChanges = this.countDirectionChanges(recent);
      if (directionChanges > 6) {
        this.mouseState.microGestures.zigzags++;
        this.track('micro_gesture', {
          type: 'zigzag',
          changes: directionChanges
        });
      }
    }

    calculateCircularity(points) {
      // Simplified circularity calculation
      // Returns value between 0 and 1, where 1 is perfect circle
      if (points.length < 3) return 0;

      // Calculate centroid
      let cx = 0, cy = 0;
      points.forEach(p => {
        cx += p.x;
        cy += p.y;
      });
      cx /= points.length;
      cy /= points.length;

      // Calculate average radius and variance
      let avgRadius = 0;
      let variance = 0;
      points.forEach(p => {
        const r = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        avgRadius += r;
      });
      avgRadius /= points.length;

      points.forEach(p => {
        const r = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        variance += (r - avgRadius) ** 2;
      });
      variance /= points.length;

      // Low variance = more circular
      return Math.max(0, 1 - (variance / (avgRadius * avgRadius)));
    }

    countDirectionChanges(points) {
      let changes = 0;
      let lastDirection = null;

      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i-1].x;
        const dy = points[i].y - points[i-1].y;
        const angle = Math.atan2(dy, dx);
        const direction = Math.round(angle / (Math.PI / 4)); // 8 directions

        if (lastDirection !== null && direction !== lastDirection) {
          changes++;
        }
        lastDirection = direction;
      }

      return changes;
    }

    // ============ DWELLING DETECTION ============
    checkDwelling(vx, vy) {
      const speed = Math.sqrt(vx * vx + vy * vy);

      if (speed < config.microMovementThreshold) {
        // Start or continue dwelling
        if (!this.mouseState.microGestures.lastDwellStart) {
          this.mouseState.microGestures.lastDwellStart = Date.now();
        } else {
          const dwellDuration = Date.now() - this.mouseState.microGestures.lastDwellStart;
          if (dwellDuration > config.dwellThreshold) {
            // Significant dwell detected
            this.mouseState.microGestures.dwells.push({
              duration: dwellDuration,
              x: this.mouseState.x,
              y: this.mouseState.y
            });
            this.track('dwell', {
              duration: dwellDuration,
              x: this.mouseState.x,
              y: this.mouseState.y
            });
            this.mouseState.microGestures.lastDwellStart = null;
          }
        }
      } else {
        // Movement resumed
        this.mouseState.microGestures.lastDwellStart = null;
      }
    }

    // ============ FFT TREMOR ANALYSIS ============
    analyzeTremor() {
      if (this.mouseState.history.length < config.fftBufferSize) return;

      const samples = this.mouseState.history.slice(-config.fftBufferSize);

      // Check if there's any actual movement in the samples
      const hasMovement = samples.some((sample, i) => {
        if (i === 0) return false;
        const dx = Math.abs(sample.x - samples[i-1].x);
        const dy = Math.abs(sample.y - samples[i-1].y);
        return dx > 0.1 || dy > 0.1; // At least 0.1 pixel movement
      });

      // Skip tremor analysis if no movement detected
      if (!hasMovement) return;

      // Extract position data for FFT
      const xData = samples.map(s => s.x);
      const yData = samples.map(s => s.y);

      // Simple FFT implementation for tremor detection
      const xFreq = this.computeFFT(xData);
      const yFreq = this.computeFFT(yData);

      // Check for tremor in target frequency range (8-12 Hz)
      const tremorPower = this.getTremorPower(xFreq, yFreq);

      // Only report significant tremor with actual movement
      if (tremorPower > 0.3 && hasMovement) { // Threshold for significant tremor
        this.track('tremor', {
          power: tremorPower,
          frequency: this.dominantFrequency(xFreq, yFreq)
        });
      }
    }

    computeFFT(data) {
      // Simplified DFT for tremor detection
      const N = data.length;
      const frequencies = [];

      for (let k = 0; k < N/2; k++) {
        let real = 0;
        let imag = 0;

        for (let n = 0; n < N; n++) {
          const angle = -2 * Math.PI * k * n / N;
          real += data[n] * Math.cos(angle);
          imag += data[n] * Math.sin(angle);
        }

        frequencies.push(Math.sqrt(real * real + imag * imag) / N);
      }

      return frequencies;
    }

    getTremorPower(xFreq, yFreq) {
      // Calculate power in tremor frequency range (8-12 Hz)
      const samplingFreq = config.samplingRate;
      const minBin = Math.floor(config.tremorFreqMin * xFreq.length * 2 / samplingFreq);
      const maxBin = Math.ceil(config.tremorFreqMax * xFreq.length * 2 / samplingFreq);

      let power = 0;
      for (let i = minBin; i <= maxBin && i < xFreq.length; i++) {
        power += xFreq[i] + yFreq[i];
      }

      return power / (maxBin - minBin + 1);
    }

    dominantFrequency(xFreq, yFreq) {
      let maxPower = 0;
      let dominantBin = 0;

      for (let i = 0; i < xFreq.length; i++) {
        const power = xFreq[i] + yFreq[i];
        if (power > maxPower) {
          maxPower = power;
          dominantBin = i;
        }
      }

      return dominantBin * config.samplingRate / (2 * xFreq.length);
    }

    // ============ VIEWPORT TRACKING ============
    checkViewportProximity(e) {
      const proximity = {
        top: e.clientY,
        right: window.innerWidth - e.clientX,
        bottom: window.innerHeight - e.clientY,
        left: e.clientX
      };

      // Check if near any edge
      const nearEdge = Object.entries(proximity).find(([edge, distance]) =>
        distance < config.viewportBoundary
      );

      if (nearEdge) {
        const [edge, distance] = nearEdge;
        const velocity = Math.sqrt(this.mouseState.vx ** 2 + this.mouseState.vy ** 2);

        // Exit intent detection
        if (edge === 'top' && this.mouseState.vy < -config.exitVectorThreshold) {
          this.track('exit_intent', {
            edge: edge,
            velocity: velocity,
            angle: Math.atan2(this.mouseState.vy, this.mouseState.vx) * 180 / Math.PI
          });
        }
      }
    }

    calculateExitVector(e) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
      const velocity = Math.sqrt(this.mouseState.vx ** 2 + this.mouseState.vy ** 2);

      return {
        angle: angle,
        velocity: velocity,
        edge: this.getExitEdge(angle),
        x: e.clientX,
        y: e.clientY
      };
    }

    getExitEdge(angle) {
      if (angle >= -45 && angle <= 45) return 'right';
      if (angle >= 45 && angle <= 135) return 'bottom';
      if (angle >= -135 && angle <= -45) return 'top';
      return 'left';
    }

    // ============ CLICK TRACKING ============
    setupClickTracking() {
      document.addEventListener('click', (e) => {
        const now = Date.now();
        const target = e.target;

        // Track click physics
        const clickData = {
          x: e.clientX,
          y: e.clientY,
          timestamp: now,
          target: {
            tag: target.tagName,
            class: target.className,
            id: target.id,
            text: target.textContent?.substring(0, 50)
          },
          mouseVelocity: Math.sqrt(this.mouseState.vx ** 2 + this.mouseState.vy ** 2),
          mouseJerk: Math.sqrt(this.mouseState.jx ** 2 + this.mouseState.jy ** 2)
        };

        // Add to history
        this.clickState.history.push(clickData);

        // Check for rage clicks
        const recentClicks = this.clickState.history.filter(
          c => now - c.timestamp < config.rageClickWindow
        );

        if (recentClicks.length >= config.rageClickThreshold) {
          this.clickState.rageClicks++;
          this.track('rage_click', {
            count: recentClicks.length,
            area: this.calculateClickArea(recentClicks)
          });
        }

        // Track normal click
        this.track('click', clickData);

        // Cleanup old clicks
        this.clickState.history = this.clickState.history.filter(
          c => now - c.timestamp < 10000
        );
      });
    }

    calculateClickArea(clicks) {
      if (clicks.length < 2) return 0;

      const minX = Math.min(...clicks.map(c => c.x));
      const maxX = Math.max(...clicks.map(c => c.x));
      const minY = Math.min(...clicks.map(c => c.y));
      const maxY = Math.max(...clicks.map(c => c.y));

      return (maxX - minX) * (maxY - minY);
    }

    // ============ SCROLL TRACKING ============
    setupScrollTracking() {
      let scrollTimer = null;

      window.addEventListener('scroll', () => {
        const now = Date.now();
        const currentY = window.scrollY;
        const dt = (now - this.scrollState.lastTime) / 1000;

        // Calculate scroll velocity
        const velocity = (currentY - this.scrollState.lastY) / dt;

        // Update state
        this.scrollState.velocity = velocity;
        this.scrollState.lastY = currentY;
        this.scrollState.lastTime = now;
        this.scrollState.depth = currentY / (document.body.scrollHeight - window.innerHeight);
        this.scrollState.maxDepth = Math.max(this.scrollState.maxDepth, this.scrollState.depth);

        // Debounce scroll tracking
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          this.track('scroll', {
            depth: Math.round(this.scrollState.depth * 100),
            maxDepth: Math.round(this.scrollState.maxDepth * 100),
            velocity: Math.round(velocity),
            direction: velocity > 0 ? 'down' : 'up'
          });
        }, 100);
      });
    }

    // ============ VIEWPORT TRACKING ============
    setupViewportTracking() {
      // Track viewport resize events
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this.track('viewport_resize', {
            width: window.innerWidth,
            height: window.innerHeight,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
          });
        }, 250);
      });

      // Track scroll to top/bottom boundaries
      window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;

        // Check if at top
        if (scrollTop <= 50 && !this.viewportState.atTop) {
          this.viewportState.atTop = true;
          this.viewportState.atBottom = false;
          this.track('viewport_boundary', {
            boundary: 'top',
            scrollDepth: 0
          });
        }

        // Check if at bottom
        else if (scrollTop + clientHeight >= scrollHeight - 50 && !this.viewportState.atBottom) {
          this.viewportState.atBottom = true;
          this.viewportState.atTop = false;
          this.track('viewport_boundary', {
            boundary: 'bottom',
            scrollDepth: 100
          });
        }

        // Neither at top nor bottom
        else if (scrollTop > 50 && scrollTop + clientHeight < scrollHeight - 50) {
          this.viewportState.atTop = false;
          this.viewportState.atBottom = false;
        }
      });

      // Initialize viewport state
      this.viewportState = {
        atTop: true,
        atBottom: false,
        width: window.innerWidth,
        height: window.innerHeight
      };
    }

    // ============ TAB SWITCHING TRACKING ============
    setupTabTracking() {
      document.addEventListener('visibilitychange', () => {
        const now = Date.now();

        if (document.hidden) {
          // Tab hidden - user switched away
          this.tabState.lastHiddenTime = now;
          this.track('tab_switch', {
            action: 'away',
            activeTime: now - (this.tabState.lastVisibleTime || this.sessionStart)
          });
        } else if (this.tabState.lastHiddenTime) {
          // Tab visible again - user returned
          const awayDuration = now - this.tabState.lastHiddenTime;
          this.tabState.awayDuration += awayDuration;
          this.tabState.switchCount++;
          this.tabState.lastVisibleTime = now;

          this.track('tab_switch', {
            action: 'return',
            awayDuration: awayDuration,
            totalSwitches: this.tabState.switchCount
          });

          // Long absence might indicate comparison shopping
          if (awayDuration > 30000) {
            this.track('comparison_shopping', {
              duration: awayDuration
            });
          }
        }
      });
    }

    // ============ TEXT SELECTION TRACKING ============
    setupTextSelection() {
      document.addEventListener('mouseup', () => {
        setTimeout(() => {
          const selection = window.getSelection();
          const text = selection.toString().trim();

          if (text.length > 0) {
            // Check if selection contains price
            const pricePattern = /\\$\\d+(\\.\\d{2})?|\\d+\\.\\d{2}/;
            const hasPrice = pricePattern.test(text);

            if (hasPrice) {
              this.selectionState.priceSelections++;
              const priceMatch = text.match(pricePattern);

              this.track('price_selection', {
                text: text.substring(0, 100),
                price: priceMatch[0]
              });
            }

            this.selectionState.count++;
            this.selectionState.lastSelection = text;

            this.track('text_selection', {
              text: text.substring(0, 100),
              length: text.length,
              hasPrice: hasPrice
            });
          }
        }, 10);
      });
    }

    // ============ FORM TRACKING ============
    setupFormTracking() {
      // Track form field interactions
      document.addEventListener('focusin', (e) => {
        if (e.target.matches('input, textarea, select')) {
          const field = e.target;
          this.track('form_focus', {
            type: field.type || field.tagName.toLowerCase(),
            name: field.name,
            id: field.id
          });

          // Track field start time
          field.dataset.focusTime = Date.now();
        }
      });

      document.addEventListener('focusout', (e) => {
        if (e.target.matches('input, textarea, select')) {
          const field = e.target;
          const focusTime = field.dataset.focusTime;

          if (focusTime) {
            const duration = Date.now() - parseInt(focusTime);
            const hasValue = field.value && field.value.length > 0;

            this.track('form_blur', {
              type: field.type || field.tagName.toLowerCase(),
              name: field.name,
              duration: duration,
              hasValue: hasValue
            });

            // Track potential abandonment
            if (!hasValue && duration > 2000) {
              this.formState.abandonments.push({
                field: field.name || field.id,
                duration: duration
              });
            }
          }
        }
      });

      // Track form submissions
      document.addEventListener('submit', (e) => {
        const form = e.target;
        this.track('form_submit', {
          id: form.id,
          action: form.action,
          method: form.method
        });
      });
    }

    // ============ MEMORY MONITORING ============
    setupMemoryMonitoring() {
      if (!performance.memory) return;

      setInterval(() => {
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;

        if (memoryUsage > 0.9) {
          this.memoryPressure = true;
          this.track('memory_pressure', {
            usage: Math.round(memoryUsage * 100)
          });
        } else {
          this.memoryPressure = false;
        }
      }, 10000);
    }

    // ============ ELEMENT MAPPING ============
    mapElements() {
      this.elementMap.clear();

      // Map important elements
      const selectors = [
        // Pricing elements
        '[class*="price"], [class*="cost"], [data-price]',
        '.pricing-tier, .pricing-plan, .subscription',

        // CTAs
        'button, [role="button"], .btn, .button',
        '[class*="buy"], [class*="purchase"], [class*="checkout"]',
        '[class*="cart"], [class*="add-to"], [class*="subscribe"]',

        // Forms
        'form, input, select, textarea',
        '[class*="form"], [class*="signup"], [class*="register"]',

        // Navigation
        'nav, header, .navigation, [role="navigation"]',
        'a[href], .nav-link, .menu-item'
      ];

      document.querySelectorAll(selectors.join(', ')).forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.elementMap.set(el, {
            tag: el.tagName.toLowerCase(),
            class: el.className,
            id: el.id,
            text: el.textContent?.substring(0, 50),
            bounds: {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height
            },
            isPrice: /price|cost|\\$\\d+/.test(el.textContent || ''),
            isCTA: el.matches('button, [role="button"], .btn, .button')
          });
        }
      });
    }

    // ============ INTERVENTION CONNECTION ============
    connectInterventions() {
      if (!config.enableInterventions) return;

      try {
        const wsUrl = `${config.interventionEndpoint}?session=${this.sessionId}&tenant=${config.tenantId}`;
        this.interventionWs = new WebSocket(wsUrl);

        this.interventionWs.onopen = () => {
          if (config.debug) console.log('[SentientIQ] Intervention channel connected');
        };

        this.interventionWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIntervention(data);
          } catch (error) {
            if (config.debug) console.error('[SentientIQ] Failed to parse intervention:', error);
          }
        };

        this.interventionWs.onclose = () => {
          if (config.debug) console.log('[SentientIQ] Intervention channel disconnected');
          this.interventionWs = null;

          // Attempt reconnection after delay
          setTimeout(() => {
            if (config.enableInterventions) {
              this.connectInterventions();
            }
          }, 5000);
        };

      } catch (error) {
        if (config.debug) console.error('[SentientIQ] Failed to connect interventions:', error);
      }
    }

    // ============ INTERVENTION HANDLER ============
    handleIntervention(data) {
      if (data.type !== 'intervention') return;

      const interventionType = data.intervention_type || data.intervention;

      if (config.debug) {
        console.log('[SentientIQ] Intervention received:', interventionType);
      }

      // Check if intervention already active
      if (this.activeInterventions.has(interventionType)) {
        return;
      }

      // Add to active set
      this.activeInterventions.add(interventionType);
      this.interventionHistory.push({
        type: interventionType,
        timestamp: Date.now()
      });

      // Render intervention based on type
      switch(interventionType) {
        case 'exit_intent':
          this.showExitModal();
          break;

        case 'help_offer':
          this.showHelpTooltip();
          break;

        case 'price_assist':
          this.showPriceAssistant();
          break;

        case 'guidance':
          this.showGuidanceHelper();
          break;

        case 'save_cart_urgent':
          this.showCartSaveUrgent();
          break;

        case 'discount_offer':
          this.showDiscountOffer();
          break;

        case 'free_shipping':
          this.showFreeShipping();
          break;

        case 'reassurance':
          this.showReassurance();
          break;

        default:
          if (config.debug) {
            console.log('[SentientIQ] Unknown intervention type:', interventionType);
          }
      }

      // Send acknowledgment
      this.acknowledgeIntervention(interventionType);
    }

    acknowledgeIntervention(type) {
      if (this.interventionWs && this.interventionWs.readyState === WebSocket.OPEN) {
        this.interventionWs.send(JSON.stringify({
          type: 'intervention_shown',
          intervention: type,
          timestamp: new Date().toISOString()
        }));
      }
    }

    // ============ INTERVENTION RENDERER ============
    setupInterventionRenderer() {
      // Create style element for interventions
      const style = document.createElement('style');
      style.textContent = `
        .sq-intervention {
          position: fixed;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: sq-fade-in 0.3s ease-out;
        }

        @keyframes sq-fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sq-modal {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 32px;
          max-width: 480px;
          width: 90%;
        }

        .sq-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 999998;
        }

        .sq-tooltip {
          bottom: 20px;
          right: 20px;
          background: #4F46E5;
          color: white;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(79, 70, 229, 0.3);
          max-width: 300px;
        }

        .sq-banner {
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(90deg, #4F46E5, #7C3AED);
          color: white;
          padding: 16px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .sq-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 24px;
          color: #6B7280;
        }

        .sq-close:hover {
          color: #1F2937;
        }

        .sq-cta {
          background: #4F46E5;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 16px;
        }

        .sq-cta:hover {
          background: #4338CA;
        }
      `;
      document.head.appendChild(style);
    }

    // ============ INTERVENTION RENDERERS ============
    showExitModal() {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'sq-modal-overlay sq-intervention';

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'sq-intervention sq-modal';
      modal.innerHTML = `
        <button class="sq-close">&times;</button>
        <h2 style="margin: 0 0 16px 0; font-size: 24px;">Wait! Don't leave yet!</h2>
        <p style="margin: 0 0 20px 0; color: #6B7280;">
          We noticed you're about to leave. Here's an exclusive 15% discount just for you!
        </p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <code style="font-size: 20px; font-weight: bold;">SAVE15NOW</code>
        </div>
        <button class="sq-cta" style="width: 100%;">Claim Your Discount</button>
      `;

      // Add to page
      document.body.appendChild(overlay);
      document.body.appendChild(modal);

      // Setup close handlers
      const closeBtn = modal.querySelector('.sq-close');
      const ctaBtn = modal.querySelector('.sq-cta');

      const closeModal = () => {
        overlay.remove();
        modal.remove();
        this.activeInterventions.delete('exit_intent');
        this.trackInterventionResult('exit_intent', 'dismissed');
      };

      closeBtn.addEventListener('click', closeModal);
      overlay.addEventListener('click', closeModal);

      ctaBtn.addEventListener('click', () => {
        this.trackInterventionResult('exit_intent', 'accepted');
        closeModal();
        // Could trigger actual discount application here
      });
    }

    showHelpTooltip() {
      const tooltip = document.createElement('div');
      tooltip.className = 'sq-intervention sq-tooltip';
      tooltip.innerHTML = `
        <button class="sq-close" style="color: white;">&times;</button>
        <div style="font-weight: 600; margin-bottom: 8px;">Need help?</div>
        <div style="font-size: 14px; opacity: 0.9;">
          Our team is here to assist you with any questions!
        </div>
        <button class="sq-cta" style="background: white; color: #4F46E5; width: 100%;">
          Chat with us
        </button>
      `;

      document.body.appendChild(tooltip);

      // Setup handlers
      tooltip.querySelector('.sq-close').addEventListener('click', () => {
        tooltip.remove();
        this.activeInterventions.delete('help_offer');
        this.trackInterventionResult('help_offer', 'dismissed');
      });

      tooltip.querySelector('.sq-cta').addEventListener('click', () => {
        this.trackInterventionResult('help_offer', 'accepted');
        // Could open chat widget here
      });
    }

    showPriceAssistant() {
      const assistant = document.createElement('div');
      assistant.className = 'sq-intervention sq-tooltip';
      assistant.innerHTML = `
        <button class="sq-close" style="color: white;">&times;</button>
        <div style="font-weight: 600; margin-bottom: 8px;">💡 Price Information</div>
        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">
          This plan includes all premium features and priority support!
        </div>
        <div style="font-size: 12px; opacity: 0.8;">
          • Unlimited access<br>
          • 24/7 support<br>
          • Free updates
        </div>
      `;

      document.body.appendChild(assistant);

      setTimeout(() => {
        assistant.remove();
        this.activeInterventions.delete('price_assist');
      }, 8000);

      assistant.querySelector('.sq-close').addEventListener('click', () => {
        assistant.remove();
        this.activeInterventions.delete('price_assist');
        this.trackInterventionResult('price_assist', 'dismissed');
      });
    }

    showDiscountOffer() {
      const banner = document.createElement('div');
      banner.className = 'sq-intervention sq-banner';
      banner.innerHTML = `
        <button class="sq-close" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: white;">&times;</button>
        <div style="font-size: 18px; font-weight: 600;">
          🎉 Limited Time: Get 20% OFF your first purchase! Use code: WELCOME20
        </div>
      `;

      document.body.appendChild(banner);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        banner.remove();
        this.activeInterventions.delete('discount_offer');
      }, 10000);

      banner.querySelector('.sq-close').addEventListener('click', () => {
        banner.remove();
        this.activeInterventions.delete('discount_offer');
        this.trackInterventionResult('discount_offer', 'dismissed');
      });
    }

    showCartSaveUrgent() {
      const modal = document.createElement('div');
      modal.className = 'sq-intervention sq-modal';
      modal.innerHTML = `
        <button class="sq-close">&times;</button>
        <h2 style="margin: 0 0 16px 0; font-size: 24px;">Your cart is waiting!</h2>
        <p style="margin: 0 0 20px 0; color: #6B7280;">
          Complete your purchase in the next 10 minutes and save 10%!
        </p>
        <button class="sq-cta" style="width: 100%;">Complete Purchase</button>
      `;

      const overlay = document.createElement('div');
      overlay.className = 'sq-modal-overlay sq-intervention';

      document.body.appendChild(overlay);
      document.body.appendChild(modal);

      const closeModal = () => {
        overlay.remove();
        modal.remove();
        this.activeInterventions.delete('save_cart_urgent');
      };

      modal.querySelector('.sq-close').addEventListener('click', closeModal);
      overlay.addEventListener('click', closeModal);
    }

    showFreeShipping() {
      const tooltip = document.createElement('div');
      tooltip.className = 'sq-intervention sq-tooltip';
      tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">🚚 Free Shipping!</div>
        <div style="font-size: 14px;">
          Add $25 more to your cart for FREE shipping!
        </div>
      `;

      document.body.appendChild(tooltip);

      setTimeout(() => {
        tooltip.remove();
        this.activeInterventions.delete('free_shipping');
      }, 7000);
    }

    showGuidanceHelper() {
      const helper = document.createElement('div');
      helper.className = 'sq-intervention sq-tooltip';
      helper.innerHTML = `
        <button class="sq-close" style="color: white;">&times;</button>
        <div style="font-weight: 600; margin-bottom: 8px;">👋 Quick Tip</div>
        <div style="font-size: 14px;">
          You can compare features by clicking the "Compare Plans" button above!
        </div>
      `;

      document.body.appendChild(helper);

      setTimeout(() => {
        helper.remove();
        this.activeInterventions.delete('guidance');
      }, 6000);

      helper.querySelector('.sq-close').addEventListener('click', () => {
        helper.remove();
        this.activeInterventions.delete('guidance');
      });
    }

    showReassurance() {
      const reassurance = document.createElement('div');
      reassurance.className = 'sq-intervention sq-tooltip';
      reassurance.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">✅ Trusted by thousands</div>
        <div style="font-size: 14px;">
          30-day money-back guarantee • No hidden fees • Cancel anytime
        </div>
      `;

      document.body.appendChild(reassurance);

      setTimeout(() => {
        reassurance.remove();
        this.activeInterventions.delete('reassurance');
      }, 8000);
    }

    // ============ INTERVENTION TRACKING ============
    trackInterventionResult(type, result) {
      this.track('intervention_result', {
        type: type,
        result: result,
        displayDuration: Date.now() - (this.interventionHistory.find(i => i.type === type)?.timestamp || Date.now())
      });

      // Send result back through WebSocket
      if (this.interventionWs && this.interventionWs.readyState === WebSocket.OPEN) {
        this.interventionWs.send(JSON.stringify({
          type: 'intervention_result',
          intervention: type,
          result: result,
          timestamp: new Date().toISOString()
        }));
      }
    }

    // ============ TELEMETRY TRACKING ============
    track(eventType, data) {
      const event = {
        type: eventType,
        data: data,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        tenantId: config.tenantId,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      // Add to buffer
      this.buffer.push(event);

      if (config.debug && eventType !== 'mouse') {
        console.log(`[SentientIQ] Tracked event: ${eventType}, buffer size: ${this.buffer.length}`);
      }

      // Flush if buffer is full
      if (this.buffer.length >= config.batchSize) {
        if (config.debug) {
          console.log(`[SentientIQ] Buffer full (${this.buffer.length}), triggering flush`);
        }
        this.flush();
      }
    }

    flush() {
      if (this.buffer.length === 0) {
        if (config.debug) console.log('[SentientIQ] Flush called but buffer empty');
        return;
      }

      const batch = this.buffer.splice(0, config.batchSize);

      if (config.debug) {
        const eventTypes = {};
        batch.forEach(e => {
          eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
        });
        console.log(`[SentientIQ] Flushing ${batch.length} events:`, eventTypes);
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send via WebSocket
        this.ws.send(JSON.stringify({
          type: 'telemetry_batch',
          events: batch,
          sessionId: this.sessionId,
          tenantId: config.tenantId
        }));

        if (config.debug) {
          console.log(`[SentientIQ] Successfully sent via WebSocket (connected: ${this.isConnected})`);
        }
      } else if (this.useHttpFallback) {
        // Fallback to HTTP
        fetch(config.httpFallback, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            events: batch,
            sessionId: this.sessionId,
            tenantId: config.tenantId
          })
        }).catch(error => {
          if (config.debug) console.error('[SentientIQ] HTTP fallback failed:', error);
        });
      } else {
        // Return to buffer if no connection
        if (config.debug) {
          console.log(`[SentientIQ] No WebSocket connection, returning ${batch.length} events to buffer (WS: ${this.ws}, HTTP fallback: ${this.useHttpFallback})`);
        }
        this.buffer.unshift(...batch);
      }
    }

    // ============ CLEANUP ============
    cleanup() {
      // Flush remaining events
      this.flush();

      // Close connections
      if (this.ws) {
        this.ws.close();
      }
      if (this.interventionWs) {
        this.interventionWs.close();
      }

      // Clear timers
      clearInterval(this.flushTimer);
      clearInterval(this.fftTimer);
      clearInterval(this.mapTimer);

      // Remove interventions
      document.querySelectorAll('.sq-intervention').forEach(el => el.remove());
    }
  }

  // ============ INITIALIZATION ============
  // Auto-initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.SentientIQUnified = new SentientIQUnified();
    });
  } else {
    window.SentientIQUnified = new SentientIQUnified();
  }

  // Export for testing
  window.SentientIQUnified = SentientIQUnified;

})(window, document);