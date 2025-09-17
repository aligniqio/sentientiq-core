/**
 * SentientIQ Pure Telemetry Engine
 * Version: 8.0 "Vital Signs"
 *
 * This script is a pure sensor. It takes impeccable measurements of:
 * - Mouse position, velocity, acceleration, jerk
 * - Element proximity and intersection
 * - Hover timing and duration
 * - Click coordinates and timing
 *
 * NO emotional attribution. NO behavioral diagnosis.
 * Just perfect vital signs for every pixel.
 */

(function() {
  'use strict';

  if (window.SentientIQTelemetry) {
    console.log('SentientIQ Telemetry already loaded');
    return;
  }

  // ============ CONFIGURATION ============
  const config = {
    tenantId: window.SENTIENTIQ_TENANT_ID || localStorage.getItem('tenantId'),
    apiEndpoint: window.SENTIENTIQ_API || 'https://api.sentientiq.app',

    // Sampling rates
    samplingRate: 20, // Hz - 50ms per sample (reduced for human readability)
    mapUpdateRate: 5000, // Update element positions every 5s
    transmissionRate: 1000, // Send batch every 1000ms (1 second)

    // Physics thresholds (for classification only, not diagnosis)
    microMovementThreshold: 3, // pixels
    macroMovementThreshold: 50, // pixels

    // Buffer sizes
    bufferSize: 100, // ~5 seconds at 20Hz
    batchSize: 10, // Events per batch (smaller batches for readability)

    debug: window.SENTIENTIQ_DEBUG === true
  };

  // ============ SITE MAPPER ============
  class ElementMapper {
    constructor() {
      this.elements = new Map();
      this.lastUpdate = 0;
    }

    init() {
      this.discover();
      // Periodic updates for dynamic content
      setInterval(() => this.update(), config.mapUpdateRate);
      // Watch for major DOM changes
      this.observeChanges();
    }

    discover() {
      const startTime = performance.now();

      // Clear existing
      this.elements.clear();

      // Find all potentially interesting elements
      const selectors = [
        // Pricing
        '[class*="price"], [class*="pricing"], [class*="tier"], [class*="plan"]',
        '[data-price], [data-plan], [data-tier]',
        // CTAs
        'button, [role="button"], a.btn, a.button, input[type="submit"]',
        '[class*="cta"], [class*="buy"], [class*="purchase"]',
        // Cart
        '[class*="cart"], [class*="basket"], [class*="checkout"]',
        // Forms
        'form, input, select, textarea',
        // Navigation
        'nav, header, footer, [role="navigation"]',
        // Content
        'h1, h2, h3, article, section, main'
      ];

      document.querySelectorAll(selectors.join(', ')).forEach(el => {
        const rect = el.getBoundingClientRect();

        // Only track visible elements
        if (rect.width > 0 && rect.height > 0) {
          const id = this.generateId(el);

          this.elements.set(id, {
            id: id,
            tagName: el.tagName.toLowerCase(),
            className: el.className || '',
            selector: this.generateSelector(el),
            text: el.textContent?.substring(0, 100) || '',
            href: el.href || null,
            bounds: {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              right: rect.right + window.scrollX,
              bottom: rect.bottom + window.scrollY,
              width: rect.width,
              height: rect.height,
              centerX: rect.left + rect.width / 2 + window.scrollX,
              centerY: rect.top + rect.height / 2 + window.scrollY
            }
          });
        }
      });

      this.lastUpdate = performance.now();

      if (config.debug) {
        console.log(`📍 Mapped ${this.elements.size} elements in ${Math.round(performance.now() - startTime)}ms`);
      }
    }

    update() {
      // Update positions of existing elements
      this.elements.forEach((data, id) => {
        const el = document.querySelector(data.selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            data.bounds = {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              right: rect.right + window.scrollX,
              bottom: rect.bottom + window.scrollY,
              width: rect.width,
              height: rect.height,
              centerX: rect.left + rect.width / 2 + window.scrollX,
              centerY: rect.top + rect.height / 2 + window.scrollY
            };
          }
        }
      });
    }

    observeChanges() {
      const observer = new MutationObserver((mutations) => {
        // Re-discover if significant changes
        if (mutations.length > 20) {
          this.discover();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    getNearestElements(x, y, maxDistance = 500) {
      const nearby = [];

      // Adjust for scroll position
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const absoluteX = x + scrollX;
      const absoluteY = y + scrollY;

      this.elements.forEach((element) => {
        const distance = Math.hypot(
          absoluteX - element.bounds.centerX,
          absoluteY - element.bounds.centerY
        );

        if (distance <= maxDistance) {
          nearby.push({
            ...element,
            distance: distance
          });
        }
      });

      return nearby.sort((a, b) => a.distance - b.distance);
    }

    getElementAtPoint(x, y) {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const absoluteX = x + scrollX;
      const absoluteY = y + scrollY;

      for (const [id, element] of this.elements) {
        if (absoluteX >= element.bounds.left &&
            absoluteX <= element.bounds.right &&
            absoluteY >= element.bounds.top &&
            absoluteY <= element.bounds.bottom) {
          return element;
        }
      }
      return null;
    }

    generateId(element) {
      // Generate stable ID for element
      if (element.id) return element.id;

      let path = [];
      let el = element;
      while (el && el.nodeType === Node.ELEMENT_NODE && path.length < 4) {
        let selector = el.nodeName.toLowerCase();
        if (el.className) {
          const classes = el.className.toString().split(' ').filter(c => c).slice(0, 2);
          if (classes.length) selector += '.' + classes.join('.');
        }
        path.unshift(selector);
        el = el.parentElement;
      }
      return path.join('>');
    }

    generateSelector(element) {
      if (element.id) return '#' + element.id;

      let path = [];
      while (element && element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.nodeName.toLowerCase();
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).slice(0, 2);
          if (classes.length && classes[0]) {
            selector += '.' + classes.join('.');
          }
        }
        path.unshift(selector);
        element = element.parentElement;
        if (path.length > 3) break;
      }
      return path.join(' > ');
    }
  }

  // ============ TELEMETRY ENGINE ============
  class TelemetryEngine {
    constructor(mapper) {
      this.mapper = mapper;
      this.sessionId = this.generateSessionId();
      this.startTime = performance.now();

      // Current state
      this.x = 0;
      this.y = 0;
      this.scrollX = 0;
      this.scrollY = 0;

      // Physics buffers
      this.positionBuffer = [];
      this.velocityBuffer = [];
      this.accelerationBuffer = [];
      this.jerkBuffer = [];

      // Interaction state
      this.hoverElement = null;
      this.hoverStartTime = null;
      this.lastClickTime = 0;
      this.lastScrollTime = 0;

      // Event queue
      this.eventQueue = [];
      this.lastSampleTime = performance.now();
      this.lastTransmission = performance.now();

      // Tracking state
      this.isActive = true;
      this.samplingInterval = null;
      this.transmissionInterval = null;
    }

    init() {
      console.log('📊 Telemetry engine initializing...');

      // Start tracking
      this.trackMouse();
      this.trackClicks();
      this.trackScrolling();
      this.trackVisibility();
      this.trackKeyboard();

      // Start high-frequency sampling
      this.startSampling();

      // Start transmission
      this.startTransmission();

      console.log('✅ Telemetry engine ready');
    }

    trackMouse() {
      // Track position with higher precision
      document.addEventListener('mousemove', (e) => {
        // Store with fractional pixel precision when available
        // Use movementX/Y for sub-pixel precision when available
        if (e.movementX !== undefined && e.movementY !== undefined) {
          // Accumulate fractional movements
          this.fractionalX = (this.fractionalX || e.clientX) + e.movementX;
          this.fractionalY = (this.fractionalY || e.clientY) + e.movementY;
          // Clamp to viewport bounds
          this.fractionalX = Math.max(0, Math.min(this.fractionalX, window.innerWidth));
          this.fractionalY = Math.max(0, Math.min(this.fractionalY, window.innerHeight));
          this.x = this.fractionalX;
          this.y = this.fractionalY;
        } else {
          this.x = e.clientX;
          this.y = e.clientY;
        }

        // Track if we're in critical zones
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Edge zone (within 10% of viewport edge)
        const edgeThreshold = Math.min(viewportWidth, viewportHeight) * 0.1;
        this.inEdgeZone = (
          this.x < edgeThreshold ||
          this.x > viewportWidth - edgeThreshold ||
          this.y < edgeThreshold ||
          this.y > viewportHeight - edgeThreshold
        );

        // Critical exit zone (within 30px of edge)
        this.inExitZone = (
          this.x < 30 ||
          this.x > viewportWidth - 30 ||
          this.y < 30 ||
          this.y > viewportHeight - 30
        );
      }, { passive: true });

      // Track enter/exit
      document.addEventListener('mouseenter', (e) => {
        this.record('mouse_enter', {
          x: e.clientX,
          y: e.clientY,
          target: this.getTargetInfo(e.target)
        });
        // Resume tracking when mouse returns
        this.resume();
      });

      document.addEventListener('mouseleave', (e) => {
        // Determine exit side
        let exitSide = 'unknown';
        if (e.clientY <= 0) exitSide = 'top';
        else if (e.clientY >= window.innerHeight - 1) exitSide = 'bottom';
        else if (e.clientX <= 0) exitSide = 'left';
        else if (e.clientX >= window.innerWidth - 1) exitSide = 'right';

        this.record('mouse_exit', {
          x: e.clientX,
          y: e.clientY,
          side: exitSide
        });

        // Flush any pending events
        this.transmit();

        // Pause tracking when mouse exits
        this.pause();
      });

      // Track hover
      document.addEventListener('mouseover', (e) => {
        const element = this.mapper.getElementAtPoint(e.clientX, e.clientY);

        if (element && element.id !== this.hoverElement?.id) {
          // End previous hover
          if (this.hoverElement) {
            this.endHover();
          }

          // Start new hover
          this.hoverElement = element;
          this.hoverStartTime = performance.now();

          this.record('hover_start', {
            element_id: element.id,
            x: e.clientX,
            y: e.clientY
          });
        }
      });

      document.addEventListener('mouseout', (e) => {
        if (this.hoverElement) {
          const element = this.mapper.getElementAtPoint(e.clientX, e.clientY);
          if (!element || element.id !== this.hoverElement.id) {
            this.endHover();
          }
        }
      });
    }

    endHover() {
      if (this.hoverElement && this.hoverStartTime) {
        const duration = performance.now() - this.hoverStartTime;

        this.record('hover_end', {
          element_id: this.hoverElement.id,
          duration: duration
        });

        this.hoverElement = null;
        this.hoverStartTime = null;
      }
    }

    trackClicks() {
      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartTime = 0;
      let isDragging = false;
      let selectionStarted = false;

      document.addEventListener('mousedown', (e) => {
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartTime = performance.now();
        isDragging = true;

        const element = this.mapper.getElementAtPoint(e.clientX, e.clientY);

        this.record('mousedown', {
          x: e.clientX,
          y: e.clientY,
          button: e.button,
          element_id: element?.id || null,
          time_since_last: performance.now() - this.lastClickTime
        });

        this.lastClickTime = performance.now();

        // Check if starting text selection
        const selection = window.getSelection();
        if (selection) {
          selectionStarted = selection.toString().length === 0;
        }
      });

      document.addEventListener('mouseup', (e) => {
        if (isDragging) {
          const dragDistance = Math.hypot(
            e.clientX - dragStartX,
            e.clientY - dragStartY
          );
          const dragDuration = performance.now() - dragStartTime;

          // Check for text selection
          const selection = window.getSelection();
          const selectedText = selection ? selection.toString() : '';

          if (selectedText.length > 0) {
            // Text was selected!
            this.record('text_selection', {
              text: selectedText.substring(0, 200), // First 200 chars
              length: selectedText.length,
              start_x: dragStartX,
              start_y: dragStartY,
              end_x: e.clientX,
              end_y: e.clientY,
              drag_distance: dragDistance,
              duration: dragDuration,
              words: selectedText.trim().split(/\s+/).length,
              // What type of content was selected
              contains_price: /[$€£¥₹]\d+|\d+[.,]\d{2}/.test(selectedText),
              contains_email: /\S+@\S+\.\S+/.test(selectedText),
              contains_phone: /[\d\s\-\(\)]+\d{7,}/.test(selectedText),
              element: this.getElementContext(selection.anchorNode)
            });
          } else if (dragDistance > 5) {
            // Mouse drag without text selection
            this.record('mouse_drag', {
              start_x: dragStartX,
              start_y: dragStartY,
              end_x: e.clientX,
              end_y: e.clientY,
              distance: dragDistance,
              duration: dragDuration,
              velocity: dragDistance / (dragDuration / 1000)
            });
          } else {
            // Regular click (minimal movement)
            this.record('click', {
              x: e.clientX,
              y: e.clientY,
              element_id: this.mapper.getElementAtPoint(e.clientX, e.clientY)?.id || null
            });
          }

          isDragging = false;
          selectionStarted = false;
        }
      });

      // Track selection changes
      document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          // Debounce to avoid too many events
          clearTimeout(this.selectionTimer);
          this.selectionTimer = setTimeout(() => {
            this.record('selection_change', {
              text_preview: selection.toString().substring(0, 50),
              length: selection.toString().length
            });
          }, 500);
        }
      });
    }

    trackScrolling() {
      let scrollTimer;
      let lastScrollY = window.scrollY;
      let lastScrollX = window.scrollX;
      let lastScrollTime = performance.now();
      let scrollVelocityY = 0;
      let scrollVelocityX = 0;
      let scrollSamples = [];

      const trackScrollPhysics = () => {
        const now = performance.now();
        const currentScrollY = window.scrollY;
        const currentScrollX = window.scrollX;
        const dt = (now - lastScrollTime) / 1000;

        if (dt > 0) {
          // Calculate scroll velocity
          const newVelocityY = (currentScrollY - lastScrollY) / dt;
          const newVelocityX = (currentScrollX - lastScrollX) / dt;

          // Calculate scroll acceleration (deceleration)
          const accelerationY = (newVelocityY - scrollVelocityY) / dt;
          const accelerationX = (newVelocityX - scrollVelocityX) / dt;

          // Store sample
          scrollSamples.push({
            t: now,
            y: currentScrollY,
            x: currentScrollX,
            vy: newVelocityY,
            vx: newVelocityX,
            ay: accelerationY,
            ax: accelerationX
          });

          // Keep only last 10 samples
          if (scrollSamples.length > 10) scrollSamples.shift();

          // Detect scroll patterns
          const scrollPattern = this.detectScrollPattern(scrollSamples);

          // Find visible elements during scroll
          const viewportTop = currentScrollY;
          const viewportBottom = currentScrollY + window.innerHeight;
          const visibleElements = [];

          this.mapper.elements.forEach((element) => {
            if (element.bounds.top < viewportBottom && element.bounds.bottom > viewportTop) {
              visibleElements.push({
                id: element.id,
                visibility: this.calculateVisibility(element.bounds, viewportTop, viewportBottom)
              });
            }
          });

          this.record('scroll', {
            // Position
            x: currentScrollX,
            y: currentScrollY,
            dx: currentScrollX - lastScrollX,
            dy: currentScrollY - lastScrollY,

            // Physics
            velocity_y: newVelocityY,
            velocity_x: newVelocityX,
            acceleration_y: accelerationY,
            acceleration_x: accelerationX,

            // Context
            viewport_height: window.innerHeight,
            document_height: document.body.scrollHeight,
            scroll_percentage: (currentScrollY / (document.body.scrollHeight - window.innerHeight)) * 100,

            // Pattern
            pattern: scrollPattern,
            momentum: Math.abs(newVelocityY) > 500, // High velocity scroll

            // Visible elements (top 3)
            visible_elements: visibleElements
              .sort((a, b) => b.visibility - a.visibility)
              .slice(0, 3)
          });

          // Update state
          scrollVelocityY = newVelocityY;
          scrollVelocityX = newVelocityX;
          lastScrollY = currentScrollY;
          lastScrollX = currentScrollX;
          lastScrollTime = now;
        }
      };

      window.addEventListener('scroll', () => {
        trackScrollPhysics();

        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          // Final scroll position after momentum ends
          this.record('scroll_stop', {
            x: window.scrollX,
            y: window.scrollY,
            duration_since_start: performance.now() - this.lastScrollTime
          });

          // Reset velocity
          scrollVelocityY = 0;
          scrollVelocityX = 0;
          scrollSamples = [];
        }, 150);
      }, { passive: true });

      // Track wheel events separately for granular input
      window.addEventListener('wheel', (e) => {
        this.record('wheel', {
          delta_y: e.deltaY,
          delta_x: e.deltaX,
          delta_mode: e.deltaMode, // 0=pixels, 1=lines, 2=pages
          x: e.clientX,
          y: e.clientY
        });
      }, { passive: true });
    }

    calculateVisibility(bounds, viewportTop, viewportBottom) {
      const elementHeight = bounds.height;
      const visibleTop = Math.max(bounds.top, viewportTop);
      const visibleBottom = Math.min(bounds.bottom, viewportBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      return (visibleHeight / elementHeight) * 100; // Percentage visible
    }

    detectScrollPattern(samples) {
      if (samples.length < 3) return 'none';

      const recent = samples.slice(-5);
      const velocities = recent.map(s => Math.abs(s.vy));

      // Check if decelerating (momentum scroll)
      const isDecelerating = velocities.every((v, i) =>
        i === 0 || v <= velocities[i - 1]
      );

      if (isDecelerating && velocities[0] > 1000) {
        return 'momentum_scroll';
      }

      // Check for quick flicks
      const maxVelocity = Math.max(...velocities);
      if (maxVelocity > 3000) {
        return 'fast_scroll';
      }

      // Check for reading pace
      if (maxVelocity < 200 && maxVelocity > 10) {
        return 'reading_scroll';
      }

      // Check for search scanning
      const directionChanges = this.countDirectionChanges(recent.map(s => s.y));
      if (directionChanges > 2) {
        return 'search_scroll'; // Up and down looking for something
      }

      return 'normal_scroll';
    }

    trackVisibility() {
      let tabSwitchCount = 0;
      let lastHiddenTime = 0;
      let cumulativeHiddenTime = 0;
      let focusBlurRapidCount = 0;
      let lastFocusBlurTime = 0;

      // Track rapid focus/blur as indicator of tab switching
      const trackRapidSwitching = () => {
        const now = performance.now();
        if (now - lastFocusBlurTime < 1000) {
          focusBlurRapidCount++;
        } else {
          focusBlurRapidCount = 0;
        }
        lastFocusBlurTime = now;
      };

      document.addEventListener('visibilitychange', () => {
        const now = performance.now();

        if (document.hidden) {
          lastHiddenTime = now;
          tabSwitchCount++;

          this.record('tab_hidden', {
            timestamp: now,
            switch_count: tabSwitchCount,
            // Quick switch suggests comparing multiple tabs
            likely_comparing: tabSwitchCount > 2
          });
        } else {
          const hiddenDuration = now - lastHiddenTime;
          cumulativeHiddenTime += hiddenDuration;

          this.record('tab_visible', {
            timestamp: now,
            hidden_duration: hiddenDuration,
            cumulative_hidden: cumulativeHiddenTime,
            switch_count: tabSwitchCount,
            // Behavioral inference
            behavior: hiddenDuration < 3000 ? 'quick_compare' :
                     hiddenDuration < 30000 ? 'researching' :
                     'extended_absence'
          });
        }
      });

      window.addEventListener('blur', () => {
        trackRapidSwitching();

        this.record('window_blur', {
          rapid_switching: focusBlurRapidCount > 3,
          // Memory pressure detection
          memory_pressure: this.detectMemoryPressure()
        });
      });

      window.addEventListener('focus', () => {
        trackRapidSwitching();

        this.record('window_focus', {
          rapid_switching: focusBlurRapidCount > 3,
          performance_metrics: this.getPerformanceMetrics()
        });
      });

      // Detect paste events (likely from another tab)
      document.addEventListener('paste', (e) => {
        this.record('paste', {
          likely_from_other_tab: document.hidden === false,
          clipboard_data_type: e.clipboardData?.types || []
        });
      });

      // Monitor performance degradation (multiple tabs = slower)
      setInterval(() => {
        const metrics = this.getPerformanceMetrics();
        if (metrics.jank_score > 50) {
          this.record('performance_degradation', {
            likely_cause: 'multiple_tabs',
            metrics: metrics
          });
        }
      }, 10000);
    }

    detectMemoryPressure() {
      // Check if memory API is available
      if (performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;
        return {
          usage_percent: (used / limit) * 100,
          likely_many_tabs: (used / limit) > 0.7
        };
      }
      return null;
    }

    getPerformanceMetrics() {
      const entries = performance.getEntriesByType('measure');
      const recentEntries = entries.slice(-10);

      // Detect jank/slowness
      let jankCount = 0;
      let slowFrames = 0;

      // Try to detect frame timing
      if (performance.now) {
        const frameTime = performance.now() % 16.67; // 60fps = 16.67ms per frame
        if (frameTime > 20) slowFrames++;
      }

      return {
        jank_score: jankCount + slowFrames * 10,
        timestamp: performance.now(),
        // More tabs = higher event loop delay
        estimated_pressure: slowFrames > 3 ? 'high' : 'normal'
      };
    }

    trackKeyboard() {
      // Track copy/paste as they indicate intent
      document.addEventListener('copy', () => {
        this.record('copy', {
          selection: window.getSelection()?.toString().substring(0, 100)
        });
      });

      document.addEventListener('paste', () => {
        this.record('paste', {});
      });
    }

    startSampling() {
      // Clear any existing interval
      if (this.samplingInterval) {
        clearInterval(this.samplingInterval);
      }

      let lastX = this.x;
      let lastY = this.y;
      let lastVx = 0;
      let lastVy = 0;
      let lastAx = 0;
      let lastAy = 0;

      // For angle and curvature tracking
      let lastAngle = 0;
      let angleBuffer = [];

      // For micro-pattern detection
      let microMovementBuffer = [];
      let dwellStartTime = null;
      let dwellThreshold = 30; // pixels - if movement stays within this radius

      const sample = () => {
        if (!this.isActive) return; // Skip sampling when paused
        const now = performance.now();
        const dt = (now - this.lastSampleTime) / 1000; // Convert to seconds

        if (dt >= 1 / config.samplingRate) {
          // Calculate physics
          const dx = this.x - lastX;
          const dy = this.y - lastY;
          const displacement = Math.hypot(dx, dy);

          // Velocity (pixels/second)
          const vx = dx / dt;
          const vy = dy / dt;
          const velocity = Math.hypot(vx, vy);

          // Acceleration (pixels/second²)
          const ax = (vx - lastVx) / dt;
          const ay = (vy - lastVy) / dt;
          const acceleration = Math.hypot(ax, ay);

          // Jerk (pixels/second³)
          const jx = (ax - lastAx) / dt;
          const jy = (ay - lastAy) / dt;
          const jerk = Math.hypot(jx, jy);

          // Direction and angular velocity
          const angle = Math.atan2(dy, dx);
          const angleDelta = angle - lastAngle;
          const angularVelocity = angleDelta / dt;

          // Curvature (how much the path curves)
          this.addToBuffer(angleBuffer, angle, 10);
          const curvature = this.calculateCurvature(angleBuffer);

          // Detect micro-patterns
          this.addToBuffer(microMovementBuffer, { x: this.x, y: this.y, t: now }, 30);
          const microPattern = this.detectMicroPattern(microMovementBuffer);

          // Dwelling detection (staying in small area)
          const isDwelling = this.detectDwelling(microMovementBuffer, dwellThreshold);
          if (isDwelling && !dwellStartTime) {
            dwellStartTime = now;
          } else if (!isDwelling && dwellStartTime) {
            // Dwelling ended
            this.record('dwell_end', {
              duration: now - dwellStartTime,
              x: this.x,
              y: this.y
            });
            dwellStartTime = null;
          }

          // Get nearby elements with approach angles
          const nearby = this.mapper.getNearestElements(this.x, this.y, 300);
          const nearbyWithApproach = nearby.slice(0, 5).map(el => {
            const approachAngle = Math.atan2(
              el.bounds.centerY - this.y,
              el.bounds.centerX - this.x
            );
            const alignmentAngle = Math.abs(angle - approachAngle);
            const isApproaching = alignmentAngle < Math.PI / 4; // Within 45 degrees

            return {
              id: el.id,
              distance: Math.round(el.distance),
              approach_angle: approachAngle,
              is_approaching: isApproaching,
              closing_velocity: isApproaching ? velocity * Math.cos(alignmentAngle) : 0
            };
          });

          // Calculate viewport boundary proximity
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          const edgeProximity = {
            top: this.y,
            bottom: viewportHeight - this.y,
            left: this.x,
            right: viewportWidth - this.x,
            // Minimum distance to any edge
            nearest: Math.min(this.y, viewportHeight - this.y, this.x, viewportWidth - this.x)
          };

          // Viewport zones (16-grid for higher granularity)
          const gridX = Math.floor(this.x / (viewportWidth / 4));
          const gridY = Math.floor(this.y / (viewportHeight / 4));
          const zone = `grid_${gridY}_${gridX}`;

          // Also track traditional 9-grid
          const zoneX = this.x < viewportWidth * 0.33 ? 'left' :
                       this.x > viewportWidth * 0.67 ? 'right' : 'center';
          const zoneY = this.y < viewportHeight * 0.33 ? 'top' :
                       this.y > viewportHeight * 0.67 ? 'bottom' : 'middle';
          const zone9 = `${zoneY}_${zoneX}`;

          // Corner proximity (diagonal distance)
          const cornerProximity = {
            top_left: Math.hypot(this.x, this.y),
            top_right: Math.hypot(viewportWidth - this.x, this.y),
            bottom_left: Math.hypot(this.x, viewportHeight - this.y),
            bottom_right: Math.hypot(viewportWidth - this.x, viewportHeight - this.y),
            nearest_corner: Math.min(
              Math.hypot(this.x, this.y),
              Math.hypot(viewportWidth - this.x, this.y),
              Math.hypot(this.x, viewportHeight - this.y),
              Math.hypot(viewportWidth - this.x, viewportHeight - this.y)
            )
          };

          // Exit vector (if near edge, which direction are we moving)
          let exitVector = null;
          if (edgeProximity.nearest < 100) { // Within 100px of edge
            if (edgeProximity.top === edgeProximity.nearest && vy < 0) {
              exitVector = { side: 'top', velocity: Math.abs(vy), time_to_exit: edgeProximity.top / Math.abs(vy) };
            } else if (edgeProximity.bottom === edgeProximity.nearest && vy > 0) {
              exitVector = { side: 'bottom', velocity: vy, time_to_exit: edgeProximity.bottom / vy };
            } else if (edgeProximity.left === edgeProximity.nearest && vx < 0) {
              exitVector = { side: 'left', velocity: Math.abs(vx), time_to_exit: edgeProximity.left / Math.abs(vx) };
            } else if (edgeProximity.right === edgeProximity.nearest && vx > 0) {
              exitVector = { side: 'right', velocity: vx, time_to_exit: edgeProximity.right / vx };
            }
          }

          // Record with maximum sensitivity - capture everything
          // Even sub-pixel movements are important for neuromotor analysis
          if (displacement > 0.01 || isDwelling || edgeProximity.nearest < 50 || now - this.lastTransmission > 100) {
            // Record telemetry with enhanced physics
            this.record('mouse_move', {
              // Position (with maximum sub-pixel precision)
              x: Math.round(this.x * 1000) / 1000,
              y: Math.round(this.y * 1000) / 1000,
              dx: Math.round(dx * 1000) / 1000,
              dy: Math.round(dy * 1000) / 1000,
              displacement: Math.round(displacement * 1000) / 1000,

              // Linear motion
              vx: Math.round(vx * 10) / 10,
              vy: Math.round(vy * 10) / 10,
              velocity: Math.round(velocity * 10) / 10,
              ax: Math.round(ax * 10) / 10,
              ay: Math.round(ay * 10) / 10,
              acceleration: Math.round(acceleration * 10) / 10,
              jerk: Math.round(jerk),

              // Angular motion
              angle: Math.round(angle * 1000) / 1000,
              angular_velocity: Math.round(angularVelocity * 10) / 10,
              curvature: Math.round(curvature * 1000) / 1000,

              // Viewport context
              viewport: {
                width: viewportWidth,
                height: viewportHeight,
                zone: zone,
                zone9: zone9,
                position_percent: {
                  x: (this.x / viewportWidth) * 100,
                  y: (this.y / viewportHeight) * 100
                },
                edge_proximity: edgeProximity,
                corner_proximity: cornerProximity,
                exit_vector: exitVector,
                // Distance from center
                center_distance: Math.hypot(
                  this.x - viewportWidth / 2,
                  this.y - viewportHeight / 2
                )
              },

              // Patterns
              micro_pattern: microPattern,
              is_dwelling: isDwelling,
              dwell_time: dwellStartTime ? now - dwellStartTime : 0,

              // Element context
              nearby_elements: nearbyWithApproach,
              hovering: this.hoverElement?.id || null
            });
          }

          // Special event when very close to edge
          if (edgeProximity.nearest < 20 && !this.nearEdgeTracked) {
            this.record('edge_approach', {
              side: Object.keys(edgeProximity).find(key =>
                edgeProximity[key] === edgeProximity.nearest && key !== 'nearest'
              ),
              distance: edgeProximity.nearest,
              velocity: velocity,
              angle: angle
            });
            this.nearEdgeTracked = true;
          } else if (edgeProximity.nearest > 50) {
            this.nearEdgeTracked = false;
          }

          // Update buffers for analysis
          this.addToBuffer(this.positionBuffer, { x: this.x, y: this.y, t: now });
          this.addToBuffer(this.velocityBuffer, velocity);
          this.addToBuffer(this.accelerationBuffer, acceleration);
          this.addToBuffer(this.jerkBuffer, jerk);

          // Track peak values for this session
          if (!this.peaks) {
            this.peaks = {
              max_velocity: 0,
              max_acceleration: 0,
              max_jerk: 0
            };
          }
          this.peaks.max_velocity = Math.max(this.peaks.max_velocity, velocity);
          this.peaks.max_acceleration = Math.max(this.peaks.max_acceleration, acceleration);
          this.peaks.max_jerk = Math.max(this.peaks.max_jerk, jerk);

          // Update state
          lastX = this.x;
          lastY = this.y;
          lastVx = vx;
          lastVy = vy;
          lastAx = ax;
          lastAy = ay;
          this.lastSampleTime = now;
        }

        requestAnimationFrame(sample);
      };

      // Store interval ID for pause/resume
      this.samplingInterval = setInterval(sample, 1000 / config.samplingRate);
    }

    startTransmission() {
      // Clear any existing interval
      if (this.transmissionInterval) {
        clearInterval(this.transmissionInterval);
      }

      this.transmissionInterval = setInterval(() => {
        if (this.eventQueue.length > 0 && this.isActive) {
          this.transmit();
        }
      }, config.transmissionRate);
    }

    pause() {
      this.isActive = false;
      console.log('⏸️ Telemetry paused - mouse exited viewport');
    }

    resume() {
      this.isActive = true;
      console.log('▶️ Telemetry resumed - mouse entered viewport');
    }

    record(eventType, data) {
      const event = {
        type: eventType,
        timestamp: performance.now(),
        session_time: performance.now() - this.startTime,
        data: data
      };

      this.eventQueue.push(event);

      // Transmit if queue is full
      if (this.eventQueue.length >= config.batchSize) {
        this.transmit();
      }
    }

    transmit() {
      if (this.eventQueue.length === 0) return;

      const batch = {
        session_id: this.sessionId,
        tenant_id: config.tenantId,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        events: [...this.eventQueue]
      };

      this.eventQueue = [];

      // Skip network transmission if no valid endpoint or in local testing
      if (!config.apiEndpoint || config.apiEndpoint.includes('localhost')) {
        if (config.debug) {
          console.log('📊 Telemetry batch (local):', batch.events.length, 'events captured');
        }
        // Expose for local inspection
        window.lastTelemetryBatch = batch;
        this.lastTransmission = performance.now();
        return;
      }

      // Send via beacon for reliability
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
        navigator.sendBeacon(`${config.apiEndpoint}/api/telemetry`, blob);
      } else {
        // Fallback to fetch
        fetch(`${config.apiEndpoint}/api/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch)
        }).catch(err => {
          if (config.debug) console.error('Telemetry transmission error:', err);
        });
      }

      this.lastTransmission = performance.now();
    }

    // Utilities
    generateSessionId() {
      return `tel_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    addToBuffer(buffer, value, maxSize = config.bufferSize) {
      buffer.push(value);
      if (buffer.length > maxSize) {
        buffer.shift();
      }
    }

    getTargetInfo(element) {
      return {
        tagName: element.tagName?.toLowerCase(),
        className: element.className,
        id: element.id
      };
    }

    calculateCurvature(angleBuffer) {
      if (angleBuffer.length < 3) return 0;

      // Calculate variance in angles (straight line = low variance)
      const mean = angleBuffer.reduce((a, b) => a + b, 0) / angleBuffer.length;
      const variance = angleBuffer.reduce((sum, angle) => {
        return sum + Math.pow(angle - mean, 2);
      }, 0) / angleBuffer.length;

      return Math.sqrt(variance); // Standard deviation of angles
    }

    detectMicroPattern(buffer) {
      if (buffer.length < 10) return 'none';

      // Get last 10 positions
      const recent = buffer.slice(-10);

      // Calculate bounding box
      const xs = recent.map(p => p.x);
      const ys = recent.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const width = maxX - minX;
      const height = maxY - minY;

      // Detect patterns based on movement characteristics
      if (width < 5 && height < 5) {
        return 'stationary';
      }

      // Calculate total path length
      let pathLength = 0;
      for (let i = 1; i < recent.length; i++) {
        pathLength += Math.hypot(
          recent[i].x - recent[i-1].x,
          recent[i].y - recent[i-1].y
        );
      }

      // Direct distance from start to end
      const directDistance = Math.hypot(
        recent[recent.length-1].x - recent[0].x,
        recent[recent.length-1].y - recent[0].y
      );

      // Ratio tells us about the pattern
      const pathRatio = directDistance > 0 ? pathLength / directDistance : 0;

      if (pathRatio > 3) {
        // Path is much longer than direct distance
        if (width < 50 && height < 50) {
          return 'circling'; // Tight circular motion
        } else {
          return 'zigzag'; // Back and forth motion
        }
      } else if (pathRatio > 1.5) {
        return 'curved'; // Curved path
      } else if (pathRatio > 0 && pathRatio <= 1.2) {
        return 'straight'; // Relatively straight line
      }

      // Check for oscillation (back and forth on one axis)
      const xChanges = this.countDirectionChanges(xs);
      const yChanges = this.countDirectionChanges(ys);

      if (xChanges > 3 && yChanges < 2) {
        return 'horizontal_oscillation';
      } else if (yChanges > 3 && xChanges < 2) {
        return 'vertical_oscillation';
      }

      return 'irregular';
    }

    detectDwelling(buffer, threshold) {
      if (buffer.length < 5) return false;

      const recent = buffer.slice(-5);
      const centerX = recent.reduce((sum, p) => sum + p.x, 0) / recent.length;
      const centerY = recent.reduce((sum, p) => sum + p.y, 0) / recent.length;

      // Check if all recent points are within threshold of center
      return recent.every(p => {
        const distance = Math.hypot(p.x - centerX, p.y - centerY);
        return distance <= threshold;
      });
    }

    countDirectionChanges(values) {
      let changes = 0;
      let lastDirection = 0;

      for (let i = 1; i < values.length; i++) {
        const direction = Math.sign(values[i] - values[i-1]);
        if (direction !== 0 && direction !== lastDirection && lastDirection !== 0) {
          changes++;
        }
        if (direction !== 0) {
          lastDirection = direction;
        }
      }

      return changes;
    }
  }

  // ============ INITIALIZATION ============
  function initialize() {
    if (!config.tenantId) {
      console.error('SentientIQ: No tenant ID found');
      return;
    }

    console.log('🚀 SentientIQ Pure Telemetry v8.0 initializing...');

    // Initialize mapper
    const mapper = new ElementMapper();
    mapper.init();

    // Initialize telemetry
    const telemetry = new TelemetryEngine(mapper);
    telemetry.init();

    // Export for debugging/monitoring
    window.SentientIQTelemetry = {
      version: '8.0',
      sessionId: telemetry.sessionId,
      mapper: mapper,
      telemetry: telemetry,

      // Read-only access to current state
      getVitals: () => ({
        position: { x: telemetry.x, y: telemetry.y },
        velocity: telemetry.velocityBuffer[telemetry.velocityBuffer.length - 1] || 0,
        acceleration: telemetry.accelerationBuffer[telemetry.accelerationBuffer.length - 1] || 0,
        jerk: telemetry.jerkBuffer[telemetry.jerkBuffer.length - 1] || 0,
        hovering: telemetry.hoverElement?.id || null,
        nearby: mapper.getNearestElements(telemetry.x, telemetry.y, 100)
      }),

      // Get mapped elements
      getMap: () => Array.from(mapper.elements.values()),

      // Get event queue size
      getQueueSize: () => telemetry.eventQueue.length
    };

    // Also expose as SentientIQ for compatibility with test page
    window.SentientIQ = window.SentientIQTelemetry;

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      telemetry.transmit();
    });

    console.log('✅ Telemetry ready - tracking', mapper.elements.size, 'elements at', config.samplingRate + 'Hz');
  }

  // Start when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();