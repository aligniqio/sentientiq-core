/**
 * SentientIQ Behavioral Test Harness
 * Programmatic testing without human contamination
 *
 * Deploy alongside unified script for deterministic testing
 */

(function(window, document) {
  'use strict';

  class BehavioralTestHarness {
    constructor() {
      this.patterns = {
        // Price shock: approach price, freeze, rapid exit
        price_shock: {
          duration: 5000,
          steps: [
            { time: 0, action: 'move', x: 400, y: 200, speed: 'normal' },
            { time: 500, action: 'scroll', direction: 'down', amount: 300 },
            { time: 1000, action: 'move', x: 600, y: 400, speed: 'slow', note: 'approaching price' },
            { time: 1500, action: 'hover', x: 650, y: 420, duration: 300, element: 'price' },
            { time: 1800, action: 'freeze', duration: 800, note: 'sticker shock freeze' },
            { time: 2600, action: 'move', x: 650, y: 50, speed: 'fast', note: 'rapid exit' },
            { time: 3000, action: 'exit', edge: 'top' }
          ],
          expected: ['engagement', 'price_shock', 'abandonment_intent']
        },

        // Frustration: rage clicking, circular motions
        frustration: {
          duration: 4000,
          steps: [
            { time: 0, action: 'move', x: 400, y: 300, speed: 'normal' },
            { time: 500, action: 'click', x: 400, y: 300 },
            { time: 600, action: 'rage_click', x: 400, y: 300, count: 5 },
            { time: 1200, action: 'circular_motion', center: {x: 400, y: 300}, radius: 100, rotations: 3 },
            { time: 2500, action: 'move', x: 200, y: 200, speed: 'jerky' },
            { time: 3000, action: 'circular_motion', center: {x: 200, y: 200}, radius: 50, rotations: 2 }
          ],
          expected: ['frustration']
        },

        // Confusion: erratic movements, direction changes
        confusion: {
          duration: 4000,
          steps: [
            { time: 0, action: 'move', x: 300, y: 200, speed: 'normal' },
            { time: 500, action: 'zigzag', points: [{x: 400, y: 250}, {x: 300, y: 300}, {x: 450, y: 350}] },
            { time: 1500, action: 'circular_motion', center: {x: 400, y: 300}, radius: 80, rotations: 2 },
            { time: 2500, action: 'random_moves', count: 10, area: {x: 200, y: 200, w: 400, h: 300} },
            { time: 3500, action: 'freeze', duration: 500 }
          ],
          expected: ['confusion']
        },

        // Engagement: steady scrolling, reading pattern
        engagement: {
          duration: 6000,
          steps: [
            { time: 0, action: 'move', x: 400, y: 300, speed: 'normal' },
            { time: 500, action: 'scroll', direction: 'down', amount: 200, speed: 'slow' },
            { time: 1500, action: 'pause', duration: 1000, note: 'reading' },
            { time: 2500, action: 'scroll', direction: 'down', amount: 300, speed: 'steady' },
            { time: 3500, action: 'text_selection', start: {x: 300, y: 400}, end: {x: 500, y: 450} },
            { time: 4000, action: 'pause', duration: 1000, note: 'reading selection' },
            { time: 5000, action: 'scroll', direction: 'down', amount: 200, speed: 'steady' }
          ],
          expected: ['engagement']
        },

        // Comparison shopping: tab switches, price checks
        comparison_shopping: {
          duration: 5000,
          steps: [
            { time: 0, action: 'move', x: 600, y: 400, speed: 'normal' },
            { time: 500, action: 'hover', x: 650, y: 420, duration: 500, element: 'price' },
            { time: 1000, action: 'tab_away', duration: 2000, note: 'checking competitor' },
            { time: 3000, action: 'tab_return' },
            { time: 3200, action: 'scroll', direction: 'up', amount: 200 },
            { time: 3700, action: 'hover', x: 650, y: 420, duration: 300, element: 'price' },
            { time: 4000, action: 'text_selection', start: {x: 630, y: 420}, end: {x: 680, y: 420} }
          ],
          expected: ['evaluation', 'comparison_shopping']
        },

        // Hesitation: slow movements near CTA
        hesitation: {
          duration: 4000,
          steps: [
            { time: 0, action: 'move', x: 400, y: 500, speed: 'normal' },
            { time: 500, action: 'move', x: 500, y: 520, speed: 'slow', note: 'approaching CTA' },
            { time: 1500, action: 'hover', x: 520, y: 530, duration: 800, element: 'cta' },
            { time: 2300, action: 'micro_movements', center: {x: 520, y: 530}, radius: 10, duration: 700 },
            { time: 3000, action: 'move', x: 480, y: 510, speed: 'slow', note: 'backing away' },
            { time: 3500, action: 'freeze', duration: 500 }
          ],
          expected: ['hesitation', 'cart_hesitation']
        },

        // Exit intent: idle then rapid exit
        exit_intent: {
          duration: 4000,
          steps: [
            { time: 0, action: 'move', x: 400, y: 400, speed: 'normal' },
            { time: 500, action: 'idle', duration: 1500 },
            { time: 2000, action: 'move', x: 400, y: 100, speed: 'fast', note: 'moving to exit' },
            { time: 2500, action: 'move', x: 400, y: 20, speed: 'fast' },
            { time: 3000, action: 'exit', edge: 'top' }
          ],
          expected: ['abandonment_intent', 'exit_risk']
        }
      };

      this.currentPattern = null;
      this.isRunning = false;
      this.results = [];
      this.virtualMouse = { x: 0, y: 0 };
      this.sentientIQ = window.SentientIQUnified;
    }

    /**
     * Run a specific behavioral pattern
     */
    async runPattern(patternName) {
      if (!this.patterns[patternName]) {
        console.error(`[TestHarness] Unknown pattern: ${patternName}`);
        return;
      }

      if (!window.SentientIQUnified) {
        console.error('[TestHarness] SentientIQ not loaded!');
        return;
      }

      console.log(`[TestHarness] Starting pattern: ${patternName}`);

      this.currentPattern = this.patterns[patternName];
      this.isRunning = true;

      const startTime = Date.now();
      const result = {
        pattern: patternName,
        startTime: startTime,
        expected: this.currentPattern.expected,
        detected: [],
        events: []
      };

      // Execute each step in sequence
      for (const step of this.currentPattern.steps) {
        if (!this.isRunning) break;

        // Wait for the right time
        const elapsed = Date.now() - startTime;
        const waitTime = step.time - elapsed;
        if (waitTime > 0) {
          await this.sleep(waitTime);
        }

        // Execute the action
        await this.executeAction(step);
        result.events.push({ ...step, executedAt: Date.now() - startTime });

        console.log(`[TestHarness] Executed: ${step.action} ${step.note ? `(${step.note})` : ''}`);
      }

      // Wait for emotions to process
      await this.sleep(2000);

      // Collect results
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;

      this.results.push(result);
      this.isRunning = false;

      console.log(`[TestHarness] Pattern complete: ${patternName}`);
      console.log(`[TestHarness] Expected emotions: ${result.expected.join(', ')}`);

      return result;
    }

    /**
     * Execute a single action step
     */
    async executeAction(step) {
      const sq = window.SentientIQUnified;
      if (!sq) return;

      switch(step.action) {
        case 'move':
          await this.simulateMouseMove(step.x, step.y, step.speed);
          break;

        case 'click':
          this.simulateClick(step.x, step.y);
          break;

        case 'rage_click':
          await this.simulateRageClick(step.x, step.y, step.count);
          break;

        case 'circular_motion':
          await this.simulateCircularMotion(step.center, step.radius, step.rotations);
          break;

        case 'scroll':
          await this.simulateScroll(step.direction, step.amount, step.speed);
          break;

        case 'hover':
          await this.simulateHover(step.x, step.y, step.duration, step.element);
          break;

        case 'freeze':
        case 'pause':
        case 'idle':
          sq.track('idle', { duration: step.duration });
          await this.sleep(step.duration);
          break;

        case 'tab_away':
          sq.track('tab_switch', { action: 'away' });
          await this.sleep(step.duration);
          break;

        case 'tab_return':
          sq.track('tab_switch', { action: 'return' });
          break;

        case 'exit':
          sq.track('viewport_approach', { edge: step.edge, distance: 10, velocity: 500 });
          sq.track('mouse_exit', { velocity: 600, direction: step.edge });
          break;

        case 'text_selection':
          await this.simulateTextSelection(step.start, step.end);
          break;

        case 'zigzag':
          await this.simulateZigzag(step.points);
          break;

        case 'random_moves':
          await this.simulateRandomMoves(step.count, step.area);
          break;

        case 'micro_movements':
          await this.simulateMicroMovements(step.center, step.radius, step.duration);
          break;
      }
    }

    /**
     * Simulate smooth mouse movement
     */
    async simulateMouseMove(targetX, targetY, speed = 'normal') {
      const speeds = {
        slow: 50,
        normal: 200,
        fast: 500,
        jerky: 800
      };

      const velocity = speeds[speed] || 200;
      const dx = targetX - this.virtualMouse.x;
      const dy = targetY - this.virtualMouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(5, Math.floor(distance / 20));
      const stepDelay = Math.max(10, 1000 / velocity);

      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const x = this.virtualMouse.x + (dx * progress);
        const y = this.virtualMouse.y + (dy * progress);

        // Add jitter for jerky movement
        const jitterX = speed === 'jerky' ? (Math.random() - 0.5) * 20 : 0;
        const jitterY = speed === 'jerky' ? (Math.random() - 0.5) * 20 : 0;

        this.injectMouseEvent(x + jitterX, y + jitterY, velocity);
        await this.sleep(stepDelay);
      }

      this.virtualMouse.x = targetX;
      this.virtualMouse.y = targetY;
    }

    /**
     * Simulate rage clicking
     */
    async simulateRageClick(x, y, count) {
      const sq = window.SentientIQUnified;

      for (let i = 0; i < count; i++) {
        sq.track('click', { x, y });
        await this.sleep(100);
      }

      sq.track('rage_click', { count, area: 10 });
    }

    /**
     * Simulate circular motion
     */
    async simulateCircularMotion(center, radius, rotations) {
      const steps = 20 * rotations;
      const angleStep = (2 * Math.PI * rotations) / steps;

      for (let i = 0; i < steps; i++) {
        const angle = i * angleStep;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);

        this.injectMouseEvent(x, y, 300);
        await this.sleep(50);
      }

      window.SentientIQUnified?.track('circular_motion', {
        radius,
        duration: steps * 50,
        circularity: 0.95
      });
    }

    /**
     * Simulate scrolling
     */
    async simulateScroll(direction, amount, speed = 'normal') {
      const sq = window.SentientIQUnified;
      const scrollSpeeds = { slow: 10, steady: 20, normal: 30, fast: 50 };
      const scrollSpeed = scrollSpeeds[speed] || 30;

      sq.track('scroll', {
        direction,
        scrollSpeed,
        scrollPercentage: amount / 10
      });

      await this.sleep(amount * 10 / scrollSpeed);
    }

    /**
     * Simulate hover
     */
    async simulateHover(x, y, duration, element) {
      this.virtualMouse.x = x;
      this.virtualMouse.y = y;

      if (element === 'price') {
        window.SentientIQUnified?.track('price_proximity', {
          element: 'price',
          distance: 0,
          isOver: true
        });
      } else if (element === 'cta') {
        window.SentientIQUnified?.track('cta_proximity', {
          distance: 0,
          isOver: true
        });
      }

      await this.sleep(duration);
    }

    /**
     * Inject mouse event directly into SentientIQ
     */
    injectMouseEvent(x, y, velocity = 200) {
      const sq = window.SentientIQUnified;
      if (!sq) return;

      const dx = x - this.virtualMouse.x;
      const dy = y - this.virtualMouse.y;
      const dt = 0.05; // 50ms time delta

      sq.track('mouse', {
        x: Math.round(x),
        y: Math.round(y),
        vx: Math.round(dx / dt),
        vy: Math.round(dy / dt),
        speed: Math.round(velocity)
      });
    }

    /**
     * Simulate clicking
     */
    simulateClick(x, y) {
      window.SentientIQUnified?.track('click', { x, y });
    }

    /**
     * Simulate text selection
     */
    async simulateTextSelection(start, end) {
      await this.simulateMouseMove(start.x, start.y, 'normal');
      await this.sleep(100);

      window.SentientIQUnified?.track('text_selection', {
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        text: 'simulated text selection'
      });
    }

    /**
     * Simulate zigzag movement
     */
    async simulateZigzag(points) {
      for (const point of points) {
        await this.simulateMouseMove(point.x, point.y, 'fast');
        await this.sleep(100);
      }
    }

    /**
     * Simulate random movements
     */
    async simulateRandomMoves(count, area) {
      for (let i = 0; i < count; i++) {
        const x = area.x + Math.random() * area.w;
        const y = area.y + Math.random() * area.h;
        await this.simulateMouseMove(x, y, 'jerky');
        await this.sleep(50);
      }
    }

    /**
     * Simulate micro movements (tremor/hesitation)
     */
    async simulateMicroMovements(center, radius, duration) {
      const startTime = Date.now();

      while (Date.now() - startTime < duration) {
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.random() * radius;
        const x = center.x + r * Math.cos(angle);
        const y = center.y + r * Math.sin(angle);

        this.injectMouseEvent(x, y, 50);
        await this.sleep(30);
      }
    }

    /**
     * Run all patterns in sequence
     */
    async runAllPatterns() {
      console.log('[TestHarness] Starting full test suite...');
      const results = [];

      for (const patternName of Object.keys(this.patterns)) {
        console.log(`[TestHarness] Testing: ${patternName}`);
        const result = await this.runPattern(patternName);
        results.push(result);

        // Wait between patterns
        await this.sleep(3000);
      }

      console.log('[TestHarness] All patterns complete!');
      console.table(results.map(r => ({
        pattern: r.pattern,
        duration: `${r.duration}ms`,
        expected: r.expected.join(', '),
        events: r.events.length
      })));

      return results;
    }

    /**
     * Run demo mode - continuous patterns for audience
     */
    async runDemoMode(loops = 1) {
      console.log('[TestHarness] Starting demo mode...');

      for (let i = 0; i < loops; i++) {
        console.log(`[TestHarness] Demo loop ${i + 1}/${loops}`);

        // Run showcase patterns in order
        const showcasePatterns = [
          'engagement',      // Start positive
          'hesitation',      // Show doubt
          'price_shock',     // Price reaction
          'comparison_shopping', // Research behavior
          'frustration',     // Problem encounter
          'confusion',       // Lost user
          'exit_intent'      // Abandonment
        ];

        for (const pattern of showcasePatterns) {
          await this.runPattern(pattern);
          await this.sleep(2000); // Pause between patterns
        }
      }

      console.log('[TestHarness] Demo mode complete!');
    }

    /**
     * Utility: sleep function
     */
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Stop current pattern execution
     */
    stop() {
      this.isRunning = false;
      console.log('[TestHarness] Stopped');
    }
  }

  // Export to window
  window.BehavioralTestHarness = BehavioralTestHarness;

  // Auto-initialize if flag is set
  if (window.SENTIENTIQ_TEST_MODE) {
    window.behavioralTest = new BehavioralTestHarness();
    console.log('[TestHarness] Ready! Use behavioralTest.runPattern(name) or behavioralTest.runDemoMode()');
    console.log('[TestHarness] Available patterns:', Object.keys(window.behavioralTest.patterns).join(', '));
  }

})(window, document);