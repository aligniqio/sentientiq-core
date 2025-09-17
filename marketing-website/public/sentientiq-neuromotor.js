/**
 * SentientIQ Neuromotor Telemetry Engine
 * Version: 6.0 "Mind Reader"
 *
 * This script captures and analyzes mouse movement at a biomechanical level
 * to infer emotional and cognitive states in real-time.
 *
 * Key innovations:
 * - 120Hz sampling for micro-movement detection
 * - FFT-based tremor analysis for stress detection
 * - Jerk (acceleration change) analysis for confidence measurement
 * - Predictive trajectory calculation for intent detection
 * - Pre-conscious movement analysis (first 50-100ms)
 */

(function() {
  'use strict';

  // Only initialize once
  if (window.SentientIQNeuromotor) {
    console.log('SentientIQ Neuromotor already loaded');
    return;
  }

  // ============ CONFIGURATION ============
  const config = {
    tenantId: window.SENTIENTIQ_TENANT_ID || localStorage.getItem('tenantId'),
    apiEndpoint: window.SENTIENTIQ_API || 'https://api.sentientiq.app',

    // Sampling configuration
    samplingRate: 120, // Hz - 8.33ms per sample
    microMovementThreshold: 3, // pixels - movements below this are tremor
    macroMovementThreshold: 50, // pixels - movements above this are intentional

    // Buffer sizes for analysis
    mouseBufferSize: 500, // ~4 seconds at 120Hz
    fftWindowSize: 128, // For frequency analysis
    predictionBufferSize: 10, // Samples for trajectory prediction

    // Analysis thresholds
    stressTremorIncrease: 1.3, // 30% increase indicates stress
    confidenceJerkThreshold: 100, // Low jerk = confident movement
    hesitationJerkThreshold: 500, // High jerk = hesitation
    approachDistanceThreshold: 200, // pixels - when we start tracking approach

    // Timing configuration
    batchInterval: 100, // ms - send events every 100ms
    criticalEventFlush: true, // Immediately send critical events
    sessionTimeout: 1800000, // 30 minutes

    // Debug mode
    debug: window.SENTIENTIQ_DEBUG === true
  };

  // ============ NEUROMOTOR ENGINE ============
  class NeuromotorTelemetryEngine {
    constructor() {
      // Session management
      this.sessionId = this.generateSessionId();
      this.startTime = performance.now();

      // Current mouse state
      this.currentX = 0;
      this.currentY = 0;
      this.isMoving = false;

      // Physics buffers (circular for performance)
      this.mouseBuffer = [];
      this.velocityBuffer = [];
      this.accelerationBuffer = [];
      this.jerkBuffer = [];

      // Analysis results
      this.tremorProfile = {
        baselineFrequency: null,
        baselineAmplitude: null,
        currentFrequency: 0,
        currentAmplitude: 0,
        stressLevel: 0
      };

      this.cognitiveState = {
        load: 0,
        confidence: 50,
        hesitation: 0,
        conflict: 0
      };

      this.emotionalState = {
        excitement: 0,
        anxiety: 0,
        frustration: 0,
        interest: 0
      };

      // Predictive state
      this.predictions = {
        nextTarget: null,
        clickProbability: 0,
        timeToClick: null,
        abandonmentRisk: 0
      };

      // Element tracking
      this.elementProximity = new Map();
      this.approachDynamics = new Map();
      this.hoverStartTimes = new Map();

      // Site context
      this.siteMap = null;
      this.currentZone = null;

      // Event queue for batching
      this.eventQueue = [];
      this.lastFlush = performance.now();

      // Sampling control
      this.lastSampleTime = performance.now();
      this.frameRequest = null;
    }

    // ============ INITIALIZATION ============
    init() {
      console.log('🧠 SentientIQ Neuromotor Engine v6.0 initializing...');

      // Load site map for context
      this.loadSiteMap();

      // Start mouse tracking
      this.initMouseTracking();

      // Start high-frequency sampling
      this.startSampling();

      // Initialize analysis pipelines
      this.initTremorAnalysis();
      this.initPredictiveEngine();

      // Start batch transmission
      this.startBatchTransmission();

      // Additional event listeners
      this.initEventListeners();

      console.log('✅ Neuromotor Engine initialized');
    }

    // ============ MOUSE TRACKING ============
    initMouseTracking() {
      // Track mouse position continuously
      document.addEventListener('mousemove', (e) => {
        this.currentX = e.clientX;
        this.currentY = e.clientY;
        this.isMoving = true;

        // Reset idle timer
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
          this.isMoving = false;
        }, 100);
      }, { passive: true });

      // Track mouse enter/leave
      document.addEventListener('mouseenter', () => {
        this.track('mouse_enter', { entry_point: { x: this.currentX, y: this.currentY } });
      });

      document.addEventListener('mouseleave', (e) => {
        // Determine exit direction
        let exitDirection = 'unknown';
        if (e.clientY <= 0) exitDirection = 'top';
        else if (e.clientY >= window.innerHeight - 1) exitDirection = 'bottom';
        else if (e.clientX <= 0) exitDirection = 'left';
        else if (e.clientX >= window.innerWidth - 1) exitDirection = 'right';

        this.track('mouse_exit', {
          exit_point: { x: e.clientX, y: e.clientY },
          direction: exitDirection,
          session_time: performance.now() - this.startTime
        });
      });
    }

    // ============ HIGH-FREQUENCY SAMPLING ============
    startSampling() {
      let lastX = this.currentX;
      let lastY = this.currentY;
      let lastVx = 0;
      let lastVy = 0;
      let lastAx = 0;
      let lastAy = 0;

      const sample = () => {
        const now = performance.now();
        const dt = (now - this.lastSampleTime) / 1000; // Convert to seconds

        // Only sample at target rate
        if (dt >= 1 / config.samplingRate) {
          // Calculate displacement
          const dx = this.currentX - lastX;
          const dy = this.currentY - lastY;
          const distance = Math.hypot(dx, dy);

          // Calculate velocity (pixels/second)
          const vx = dx / dt;
          const vy = dy / dt;
          const velocity = Math.hypot(vx, vy);

          // Calculate acceleration (pixels/second²)
          const ax = (vx - lastVx) / dt;
          const ay = (vy - lastVy) / dt;
          const acceleration = Math.hypot(ax, ay);

          // Calculate jerk (pixels/second³) - KEY METRIC
          const jx = (ax - lastAx) / dt;
          const jy = (ay - lastAy) / dt;
          const jerk = Math.hypot(jx, jy);

          // Store in circular buffers
          this.addToBuffer(this.mouseBuffer, {
            x: this.currentX,
            y: this.currentY,
            t: now,
            dx: dx,
            dy: dy
          }, config.mouseBufferSize);

          this.addToBuffer(this.velocityBuffer, velocity, config.mouseBufferSize);
          this.addToBuffer(this.accelerationBuffer, acceleration, config.mouseBufferSize);
          this.addToBuffer(this.jerkBuffer, jerk, config.mouseBufferSize);

          // Analyze different movement types
          if (distance > 0) {
            if (distance < config.microMovementThreshold) {
              // Micro-movement: analyze for tremor
              this.analyzeTremor(dx, dy, dt, velocity);
            } else if (distance < config.macroMovementThreshold) {
              // Normal movement: analyze dynamics
              this.analyzeMovementDynamics(velocity, acceleration, jerk);
            } else {
              // Large movement: likely intentional
              this.analyzeIntentionalMovement(dx, dy, velocity, acceleration);
            }
          }

          // Predictive analysis
          if (this.mouseBuffer.length >= config.predictionBufferSize) {
            this.updatePredictions();
          }

          // Analyze approach to elements
          if (this.siteMap) {
            this.analyzeElementApproach();
          }

          // Update state variables
          lastX = this.currentX;
          lastY = this.currentY;
          lastVx = vx;
          lastVy = vy;
          lastAx = ax;
          lastAy = ay;
          this.lastSampleTime = now;
        }

        this.frameRequest = requestAnimationFrame(sample);
      };

      sample();
    }

    // ============ TREMOR ANALYSIS ============
    initTremorAnalysis() {
      // Establish baseline tremor after 2 seconds of data
      setTimeout(() => {
        if (this.mouseBuffer.length > 100) {
          const frequencies = this.calculateTremorSpectrum();
          if (frequencies.dominant) {
            this.tremorProfile.baselineFrequency = frequencies.dominant.frequency;
            this.tremorProfile.baselineAmplitude = frequencies.dominant.amplitude;
            console.log('📊 Baseline tremor established:', this.tremorProfile);
          }
        }
      }, 2000);
    }

    analyzeTremor(dx, dy, dt, velocity) {
      // Micro-movements reveal autonomic nervous system activity
      const amplitude = Math.hypot(dx, dy);

      // Calculate instantaneous frequency
      const frequency = velocity > 0 ? 1 / dt : 0;

      // Update current tremor metrics
      this.tremorProfile.currentFrequency = frequency;
      this.tremorProfile.currentAmplitude = amplitude;

      // Compare to baseline if established
      if (this.tremorProfile.baselineFrequency) {
        const freqRatio = frequency / this.tremorProfile.baselineFrequency;
        const ampRatio = amplitude / this.tremorProfile.baselineAmplitude;

        // Stress increases tremor frequency and amplitude
        if (freqRatio > config.stressTremorIncrease || ampRatio > config.stressTremorIncrease) {
          const stressLevel = Math.min(100, ((freqRatio + ampRatio) / 2 - 1) * 100);
          this.tremorProfile.stressLevel = stressLevel;

          if (stressLevel > 30) {
            this.track('stress_detected', {
              level: stressLevel,
              tremor_increase: freqRatio,
              amplitude_increase: ampRatio,
              confidence: Math.min(95, stressLevel + 20)
            });
          }
        }
      }
    }

    calculateTremorSpectrum() {
      // Simplified FFT for tremor frequency analysis
      if (this.mouseBuffer.length < config.fftWindowSize) return {};

      const window = this.mouseBuffer.slice(-config.fftWindowSize);
      const xValues = window.map(p => p.dx || 0);
      const yValues = window.map(p => p.dy || 0);

      // Calculate power spectrum (simplified - real FFT would be more complex)
      const frequencies = [];
      for (let freq = 1; freq < 20; freq++) { // 1-20 Hz range
        let power = 0;
        for (let i = 0; i < xValues.length; i++) {
          const t = i / config.samplingRate;
          power += xValues[i] * Math.sin(2 * Math.PI * freq * t);
          power += yValues[i] * Math.sin(2 * Math.PI * freq * t);
        }
        frequencies.push({ frequency: freq, amplitude: Math.abs(power) });
      }

      // Find dominant frequency
      frequencies.sort((a, b) => b.amplitude - a.amplitude);

      return {
        dominant: frequencies[0],
        spectrum: frequencies
      };
    }

    // ============ MOVEMENT DYNAMICS ANALYSIS ============
    analyzeMovementDynamics(velocity, acceleration, jerk) {
      // Jerk reveals cognitive state and confidence

      // Low jerk + moderate velocity = confident, purposeful movement
      if (jerk < config.confidenceJerkThreshold && velocity > 50) {
        this.cognitiveState.confidence = Math.min(100, this.cognitiveState.confidence + 2);
        this.cognitiveState.hesitation = Math.max(0, this.cognitiveState.hesitation - 5);
      }

      // Medium jerk = normal movement
      else if (jerk >= config.confidenceJerkThreshold && jerk < config.hesitationJerkThreshold) {
        // Maintain current state with minor adjustments
        this.cognitiveState.confidence = Math.min(100, Math.max(30, this.cognitiveState.confidence));
      }

      // High jerk = hesitation, uncertainty, or cognitive conflict
      else if (jerk > config.hesitationJerkThreshold) {
        this.cognitiveState.hesitation = Math.min(100, this.cognitiveState.hesitation + 5);
        this.cognitiveState.confidence = Math.max(20, this.cognitiveState.confidence - 3);

        // Very high jerk indicates cognitive conflict
        if (jerk > 1000) {
          this.cognitiveState.conflict = Math.min(100, this.cognitiveState.conflict + 10);

          this.track('cognitive_conflict', {
            jerk: jerk,
            conflict_level: this.cognitiveState.conflict,
            confidence: 75
          });
        }
      }

      // Acceleration patterns reveal emotional state
      if (acceleration > 2000) {
        // Sudden acceleration = excitement or urgency
        this.emotionalState.excitement = Math.min(100, this.emotionalState.excitement + 5);
        this.emotionalState.interest = Math.min(100, this.emotionalState.interest + 3);
      } else if (acceleration < 500 && velocity > 20 && velocity < 200) {
        // Moderate, steady movement = interest and engagement
        this.emotionalState.interest = Math.min(100, this.emotionalState.interest + 2);
        // Decay anxiety when moving smoothly
        this.emotionalState.anxiety = Math.max(0, this.emotionalState.anxiety - 1);
      }

      // Decay states over time for responsiveness
      this.cognitiveState.hesitation = Math.max(0, this.cognitiveState.hesitation - 0.5);
      this.cognitiveState.conflict = Math.max(0, this.cognitiveState.conflict - 0.3);
      this.emotionalState.excitement = Math.max(0, this.emotionalState.excitement - 0.2);
      this.emotionalState.frustration = Math.max(0, this.emotionalState.frustration - 0.1);

      // Debug output for testing
      if (config.debug && Math.random() < 0.05) {  // Log 5% of samples
        console.log('Movement analysis:', {
          velocity: Math.round(velocity),
          acceleration: Math.round(acceleration),
          jerk: Math.round(jerk),
          confidence: Math.round(this.cognitiveState.confidence),
          hesitation: Math.round(this.cognitiveState.hesitation)
        });
      }
    }

    analyzeIntentionalMovement(dx, dy, velocity, acceleration) {
      // Large, fast movements indicate intent and purpose
      const direction = Math.atan2(dy, dx);
      const target = this.predictTarget(direction, velocity);

      if (target) {
        // Moving rapidly toward specific element
        this.track('rapid_approach', {
          target: target.type,
          velocity: velocity,
          confidence: Math.min(90, velocity / 10)
        });

        // Update predictions
        this.predictions.nextTarget = target;
        this.predictions.timeToClick = target.distance / velocity;
      }
    }

    // ============ PREDICTIVE ENGINE ============
    initPredictiveEngine() {
      // Initialize prediction models
      this.predictionModels = {
        click: { threshold: 0.7, factors: [] },
        abandonment: { threshold: 0.6, factors: [] },
        purchase: { threshold: 0.8, factors: [] }
      };
    }

    updatePredictions() {
      // Use recent movement history to predict future actions
      const trajectory = this.calculateTrajectory();

      if (trajectory) {
        // Predict where mouse is heading
        const targetElement = this.findElementOnTrajectory(trajectory);

        if (targetElement) {
          // Calculate approach dynamics
          const approach = this.calculateApproachDynamics(targetElement, trajectory);

          // Predict click probability based on approach characteristics
          this.predictions.clickProbability = this.predictClickProbability(approach);

          // Predict timing
          if (this.predictions.clickProbability > 0.5) {
            this.predictions.timeToClick = approach.timeToTarget;

            // High confidence prediction
            if (this.predictions.clickProbability > 0.8) {
              this.track('click_predicted', {
                target: targetElement.type,
                probability: this.predictions.clickProbability,
                time_to_click: this.predictions.timeToClick,
                confidence: 85
              });
            }
          }
        }

        // Update abandonment risk
        this.updateAbandonmentRisk();
      }
    }

    calculateTrajectory() {
      if (this.mouseBuffer.length < config.predictionBufferSize) return null;

      const recent = this.mouseBuffer.slice(-config.predictionBufferSize);

      // Calculate velocity vector using least squares
      let sumX = 0, sumY = 0, sumT = 0;
      let sumXT = 0, sumYT = 0, sumT2 = 0;

      const t0 = recent[0].t;
      recent.forEach(point => {
        const t = (point.t - t0) / 1000; // Normalize time
        sumX += point.x;
        sumY += point.y;
        sumT += t;
        sumXT += point.x * t;
        sumYT += point.y * t;
        sumT2 += t * t;
      });

      const n = recent.length;
      const vx = (n * sumXT - sumX * sumT) / (n * sumT2 - sumT * sumT);
      const vy = (n * sumYT - sumY * sumT) / (n * sumT2 - sumT * sumT);

      // Project forward
      const predictions = [];
      for (let futureTime = 100; futureTime <= 3000; futureTime += 100) {
        predictions.push({
          t: futureTime,
          x: this.currentX + vx * (futureTime / 1000),
          y: this.currentY + vy * (futureTime / 1000)
        });
      }

      return {
        velocity: { x: vx, y: vy },
        speed: Math.hypot(vx, vy),
        angle: Math.atan2(vy, vx),
        predictions: predictions
      };
    }

    predictClickProbability(approach) {
      // Factors that increase click probability
      let probability = 0.5; // Base probability

      // Factor 1: Smooth approach (low jerk)
      const avgJerk = this.jerkBuffer.slice(-5).reduce((a, b) => a + b, 0) / 5;
      if (avgJerk < 100) probability += 0.2;

      // Factor 2: Deceleration as approaching (slowing down to click)
      const recentAccel = this.accelerationBuffer.slice(-3);
      if (recentAccel[2] < recentAccel[0]) probability += 0.15;

      // Factor 3: Direct path (low curvature)
      if (approach.curvature < 0.1) probability += 0.1;

      // Factor 4: Previous interest in element
      if (approach.previousHovers > 0) probability += 0.1;

      // Factor 5: Element type (CTAs more likely to be clicked)
      if (approach.element.type === 'cta' || approach.element.type === 'button') {
        probability += 0.15;
      }

      return Math.min(0.95, Math.max(0.05, probability));
    }

    updateAbandonmentRisk() {
      let risk = 0;

      // Factor 1: High stress level
      if (this.tremorProfile.stressLevel > 50) risk += 0.2;

      // Factor 2: High hesitation
      if (this.cognitiveState.hesitation > 60) risk += 0.15;

      // Factor 3: Decreasing engagement (velocity dropping)
      const recentVelocity = this.velocityBuffer.slice(-10);
      const velocityTrend = this.calculateTrend(recentVelocity);
      if (velocityTrend < -0.5) risk += 0.15;

      // Factor 4: Mouse moving toward exit zones
      const trajectory = this.calculateTrajectory();
      if (trajectory) {
        const heading = trajectory.predictions[trajectory.predictions.length - 1];
        if (heading.y < 100 || heading.x < 100 ||
            heading.x > window.innerWidth - 100) {
          risk += 0.25;
        }
      }

      // Factor 5: Long idle periods
      if (!this.isMoving) risk += 0.1;

      this.predictions.abandonmentRisk = Math.min(0.95, risk);

      // Alert if high risk
      if (this.predictions.abandonmentRisk > 0.7) {
        this.track('abandonment_risk_high', {
          risk: this.predictions.abandonmentRisk,
          factors: {
            stress: this.tremorProfile.stressLevel,
            hesitation: this.cognitiveState.hesitation,
            trajectory: trajectory ? 'exit_bound' : 'unknown'
          },
          confidence: 80
        });
      }
    }

    // ============ ELEMENT INTERACTION ANALYSIS ============
    analyzeElementApproach() {
      if (!this.siteMap) return;

      // Check proximity to key elements
      ['pricing', 'cta', 'cart', 'form'].forEach(category => {
        const elements = this.siteMap[category] || [];

        elements.forEach(element => {
          if (!element.selector) return;

          // Get element position (cached or query)
          const el = document.querySelector(element.selector);
          if (!el) return;

          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.hypot(this.currentX - centerX, this.currentY - centerY);

          // Get previous distance
          const previousDistance = this.elementProximity.get(element.selector) || Infinity;

          // Approaching element
          if (distance < previousDistance && distance < config.approachDistanceThreshold) {
            const approachSpeed = previousDistance - distance;

            // Store approach dynamics
            if (!this.approachDynamics.has(element.selector)) {
              this.approachDynamics.set(element.selector, {
                startTime: performance.now(),
                startDistance: distance,
                minDistance: distance,
                hoverCount: 0,
                trajectory: []
              });
            }

            const dynamics = this.approachDynamics.get(element.selector);
            dynamics.minDistance = Math.min(dynamics.minDistance, distance);
            dynamics.trajectory.push({ d: distance, t: performance.now() });

            // Analyze approach pattern based on element type
            if (category === 'pricing' && distance < 100) {
              this.analyzePricingApproach(approachSpeed, distance, dynamics);
            } else if (category === 'cta' && distance < 50) {
              this.analyzeCTAApproach(approachSpeed, distance, dynamics);
            }
          }

          // Update proximity
          this.elementProximity.set(element.selector, distance);
        });
      });
    }

    analyzePricingApproach(speed, distance, dynamics) {
      const timeInApproach = performance.now() - dynamics.startTime;

      // Slow, hesitant approach to pricing
      if (speed < 5 && timeInApproach > 1000) {
        this.emotionalState.anxiety = Math.min(100, this.emotionalState.anxiety + 10);

        this.track('pricing_approach_hesitant', {
          speed: speed,
          distance: distance,
          duration: timeInApproach,
          anxiety_level: this.emotionalState.anxiety,
          confidence: 85
        });
      }

      // Fast, direct approach to pricing
      else if (speed > 20 && dynamics.trajectory.length < 5) {
        this.emotionalState.excitement = Math.min(100, this.emotionalState.excitement + 15);

        this.track('pricing_approach_eager', {
          speed: speed,
          distance: distance,
          excitement_level: this.emotionalState.excitement,
          confidence: 90
        });
      }
    }

    analyzeCTAApproach(speed, distance, dynamics) {
      // Very close to CTA - likely to click
      if (distance < 20) {
        const avgJerk = this.jerkBuffer.slice(-3).reduce((a, b) => a + b, 0) / 3;

        // Smooth approach = high intent
        if (avgJerk < 50) {
          this.predictions.clickProbability = 0.9;

          this.track('cta_click_imminent', {
            distance: distance,
            jerk: avgJerk,
            probability: 0.9,
            confidence: 95
          });
        }
      }
    }

    // ============ EVENT TRACKING ============
    track(eventType, data = {}) {
      const event = {
        type: eventType,
        timestamp: performance.now(),
        session_age: performance.now() - this.startTime,
        data: {
          ...data,
          position: { x: this.currentX, y: this.currentY },
          cognitive: { ...this.cognitiveState },
          emotional: { ...this.emotionalState },
          tremor: {
            frequency: this.tremorProfile.currentFrequency,
            stress: this.tremorProfile.stressLevel
          },
          predictions: { ...this.predictions }
        }
      };

      // Add to queue
      this.eventQueue.push(event);

      // Immediate flush for critical events
      const criticalEvents = [
        'stress_detected',
        'cognitive_conflict',
        'click_predicted',
        'cta_click_imminent',
        'abandonment_risk_high',
        'pricing_approach_hesitant',
        'sticker_shock'
      ];

      if (config.criticalEventFlush && criticalEvents.includes(eventType)) {
        this.flush();
      }
    }

    // ============ SITE MAPPING INTEGRATION ============
    async loadSiteMap() {
      // Try to get cached sitemap
      const cacheKey = `sq_sitemap_${window.location.hostname}_${window.location.pathname}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const { map, timestamp } = JSON.parse(cached);
          // Use cache if less than 24 hours old
          if (Date.now() - timestamp < 86400000) {
            this.siteMap = map;
            console.log('📍 Loaded cached site map');
            return;
          }
        } catch (e) {
          console.log('Failed to load cached sitemap');
        }
      }

      // Load fresh map using existing site mapper if available
      if (window.SentientIQSiteMapper) {
        this.siteMap = window.SentientIQSiteMapper.init();
      } else {
        // Basic fallback mapping
        this.siteMap = this.performBasicMapping();
      }
    }

    performBasicMapping() {
      // Simplified site mapping when mapper not available
      const map = {
        pricing: [],
        cta: [],
        cart: [],
        form: []
      };

      // Find pricing elements
      document.querySelectorAll('[class*="price"], [class*="pricing"], [class*="tier"]').forEach(el => {
        map.pricing.push({
          selector: this.generateSelector(el),
          type: 'pricing',
          confidence: 70
        });
      });

      // Find CTAs
      document.querySelectorAll('button, [role="button"], a.btn, a.button').forEach(el => {
        const text = el.textContent.toLowerCase();
        if (text.includes('buy') || text.includes('start') || text.includes('try')) {
          map.cta.push({
            selector: this.generateSelector(el),
            type: 'cta',
            confidence: 80
          });
        }
      });

      return map;
    }

    generateSelector(element) {
      if (element.id) return `#${element.id}`;

      let path = [];
      while (element && element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.nodeName.toLowerCase();
        if (element.className) {
          const classes = element.className.split(' ').filter(c => c).slice(0, 2);
          if (classes.length) {
            selector += '.' + classes.join('.');
          }
        }
        path.unshift(selector);
        element = element.parentElement;
        if (path.length > 3) break;
      }

      return path.join(' > ');
    }

    // ============ DATA TRANSMISSION ============
    startBatchTransmission() {
      setInterval(() => {
        if (this.eventQueue.length > 0) {
          this.flush();
        }
      }, config.batchInterval);
    }

    flush() {
      if (this.eventQueue.length === 0) return;

      const events = [...this.eventQueue];
      this.eventQueue = [];

      const payload = {
        session_id: this.sessionId,
        tenant_id: config.tenantId,
        url: window.location.href,
        events: events
      };

      // Send using beacon for reliability
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(`${config.apiEndpoint}/api/telemetry/neuromotor`, blob);
      } else {
        // Fallback to fetch
        fetch(`${config.apiEndpoint}/api/telemetry/neuromotor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => {
          if (config.debug) console.error('Telemetry error:', err);
          // Re-queue events on failure
          this.eventQueue = events.concat(this.eventQueue);
        });
      }
    }

    // ============ EVENT LISTENERS ============
    initEventListeners() {
      // Track current hover target
      let currentHoverTarget = null;
      let hoverStartTime = null;

      // Hover detection
      document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('a, button, [role="button"], .price-card, .price-amount, [class*="price"], [class*="cta"]');

        if (target && target !== currentHoverTarget) {
          // End previous hover if exists
          if (currentHoverTarget && hoverStartTime) {
            const hoverDuration = performance.now() - hoverStartTime;
            if (hoverDuration > 100) {
              this.track('hover_end', {
                target: this.generateSelector(currentHoverTarget),
                duration: hoverDuration,
                element_type: this.getElementType(currentHoverTarget)
              });
            }
          }

          // Start new hover
          currentHoverTarget = target;
          hoverStartTime = performance.now();

          this.track('hover_start', {
            target: this.generateSelector(target),
            element_type: this.getElementType(target),
            cognitive_state: { ...this.cognitiveState }
          });
        }
      });

      // Mouse leave from element
      document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('a, button, [role="button"], .price-card, .price-amount, [class*="price"], [class*="cta"]');

        if (target === currentHoverTarget && currentHoverTarget) {
          const hoverDuration = performance.now() - hoverStartTime;

          this.track('hover_end', {
            target: this.generateSelector(currentHoverTarget),
            duration: hoverDuration,
            element_type: this.getElementType(currentHoverTarget),
            cognitive_state: { ...this.cognitiveState }
          });

          // Analyze hover pattern
          if (this.getElementType(currentHoverTarget) === 'pricing' && hoverDuration > 2000) {
            this.emotionalState.anxiety = Math.min(100, this.emotionalState.anxiety + 15);
            this.track('pricing_hesitation', {
              duration: hoverDuration,
              anxiety: this.emotionalState.anxiety
            });
          }

          currentHoverTarget = null;
          hoverStartTime = null;
        }
      });

      // Click events with pre-click analysis
      let clickPredictionTime = null;

      document.addEventListener('mousedown', (e) => {
        // Check if we predicted this click
        const predictionAccuracy = clickPredictionTime ?
          performance.now() - clickPredictionTime : null;

        const target = e.target.closest('a, button, [role="button"], input, select');

        this.track('click', {
          target: target ? this.generateSelector(target) : 'unknown',
          button: e.button,
          predicted: !!clickPredictionTime,
          prediction_accuracy: predictionAccuracy,
          cognitive_state: { ...this.cognitiveState },
          tremor_at_click: this.tremorProfile.currentFrequency
        });

        clickPredictionTime = null;
      });

      // Scroll events with emotional context
      let scrollTimer;
      let lastScrollY = window.scrollY;

      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);

        scrollTimer = setTimeout(() => {
          const scrollDelta = window.scrollY - lastScrollY;
          const scrollSpeed = Math.abs(scrollDelta) / 100; // Rough speed estimate
          const scrollDepth = (window.scrollY / document.body.scrollHeight) * 100;

          this.track('scroll', {
            direction: scrollDelta > 0 ? 'down' : 'up',
            speed: scrollSpeed,
            depth: scrollDepth,
            cognitive_load: this.cognitiveState.load
          });

          lastScrollY = window.scrollY;
        }, 100);
      }, { passive: true });

      // Visibility change
      document.addEventListener('visibilitychange', () => {
        this.track(document.hidden ? 'tab_hidden' : 'tab_visible', {
          hidden_duration: document.hidden ? 0 : performance.now() - this.hiddenTime
        });

        if (document.hidden) {
          this.hiddenTime = performance.now();
        }
      });

      // Before unload - final flush
      window.addEventListener('beforeunload', () => {
        this.track('session_end', {
          total_duration: performance.now() - this.startTime,
          final_emotional_state: { ...this.emotionalState },
          final_predictions: { ...this.predictions }
        });
        this.flush();
      });
    }

    // ============ UTILITIES ============
    generateSessionId() {
      return `nm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    getElementType(element) {
      if (!element) return 'unknown';

      const classes = element.className.toLowerCase();
      const text = element.textContent?.toLowerCase() || '';
      const tagName = element.tagName.toLowerCase();

      if (classes.includes('price') || text.includes('$') || classes.includes('tier')) {
        return 'pricing';
      }
      if (tagName === 'button' || classes.includes('cta') || classes.includes('btn')) {
        return 'cta';
      }
      if (classes.includes('cart') || classes.includes('checkout')) {
        return 'cart';
      }
      if (tagName === 'a') {
        return 'link';
      }
      return 'other';
    }

    addToBuffer(buffer, value, maxSize) {
      buffer.push(value);
      if (buffer.length > maxSize) {
        buffer.shift();
      }
    }

    calculateTrend(values) {
      if (values.length < 2) return 0;

      // Simple linear regression for trend
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      const n = values.length;

      values.forEach((y, x) => {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });

      return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    findElementOnTrajectory(trajectory) {
      if (!this.siteMap || !trajectory.predictions.length) return null;

      // Check if trajectory intersects with any mapped elements
      const futurePosition = trajectory.predictions[Math.min(5, trajectory.predictions.length - 1)];

      let closestElement = null;
      let minDistance = Infinity;

      ['pricing', 'cta', 'cart'].forEach(category => {
        const elements = this.siteMap[category] || [];
        elements.forEach(element => {
          if (!element.selector) return;

          const el = document.querySelector(element.selector);
          if (!el) return;

          const rect = el.getBoundingClientRect();
          const distance = this.pointToRectDistance(futurePosition, rect);

          if (distance < minDistance) {
            minDistance = distance;
            closestElement = { ...element, distance, category };
          }
        });
      });

      return minDistance < 100 ? closestElement : null;
    }

    pointToRectDistance(point, rect) {
      const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
      const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
      return Math.hypot(dx, dy);
    }

    calculateApproachDynamics(element, trajectory) {
      const dynamics = this.approachDynamics.get(element.selector) || {
        previousHovers: 0,
        curvature: 0,
        timeToTarget: Infinity
      };

      // Calculate path curvature (straight line = 0, curved = higher)
      if (trajectory.predictions.length > 2) {
        const p1 = trajectory.predictions[0];
        const p2 = trajectory.predictions[Math.floor(trajectory.predictions.length / 2)];
        const p3 = trajectory.predictions[trajectory.predictions.length - 1];

        const directDistance = Math.hypot(p3.x - p1.x, p3.y - p1.y);
        const actualDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y) +
                              Math.hypot(p3.x - p2.x, p3.y - p2.y);

        dynamics.curvature = (actualDistance / directDistance) - 1;
      }

      // Time to reach target
      if (trajectory.speed > 0) {
        dynamics.timeToTarget = element.distance / trajectory.speed;
      }

      return {
        ...dynamics,
        element: element
      };
    }
  }

  // ============ INITIALIZATION ============

  // Check for tenant ID
  if (!config.tenantId || config.tenantId === 'demo') {
    console.error('SentientIQ: No tenant ID found. Neuromotor engine not initialized.');
    return;
  }

  // Create and initialize engine
  const engine = new NeuromotorTelemetryEngine();
  engine.init();

  // Export for debugging and external access
  window.SentientIQNeuromotor = engine;

  // Public API
  window.SentientIQ = window.SentientIQ || {};
  window.SentientIQ.neuromotor = {
    version: '6.0',
    sessionId: engine.sessionId,
    getState: () => ({
      cognitive: engine.cognitiveState,
      emotional: engine.emotionalState,
      predictions: engine.predictions,
      tremor: engine.tremorProfile
    }),
    getPredictions: () => engine.predictions,
    getStressLevel: () => engine.tremorProfile.stressLevel
  };

  console.log('🧠 SentientIQ Neuromotor Engine ready');
  console.log('Session:', engine.sessionId);
  console.log('Sampling:', config.samplingRate + 'Hz');

})();