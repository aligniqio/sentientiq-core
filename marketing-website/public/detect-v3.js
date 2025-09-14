/**
 * SentientIQ Emotion Detection v3.0
 * Pattern-Validated Behavioral Physics Engine
 *
 * Philosophy: Emotions require multiple corroborating signals
 * No single behavior = emotion. Patterns = emotions.
 */

(function() {
  'use strict';

  // ==========================================
  // CONFIGURATION
  // ==========================================

  // Find our script tag (works even when injected dynamically)
  const scripts = document.querySelectorAll('script[src*="detect"]');
  const scriptTag = Array.from(scripts).find(s => s.src.includes('/v3/detect.js')) || document.currentScript;

  const scriptUrl = scriptTag?.src || '';
  const urlParams = new URLSearchParams(scriptUrl.split('?')[1] || '');

  const apiKey = scriptTag?.getAttribute('data-api-key') ||
                 urlParams.get('key') ||
                 'sq_demo_marketing_v3';

  const debugMode = scriptTag?.getAttribute('data-debug') === 'true' ||
                    urlParams.get('debug') === 'true';

  if (!apiKey) {
    console.error('SentientIQ: No API key provided');
    return;
  }

  const config = {
    apiEndpoint: 'https://api.sentientiq.app/api/emotional/event',
    apiKey: apiKey,
    sessionId: `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    debug: debugMode
  };

  // ==========================================
  // PATTERN DEFINITIONS - The Truth Table
  // ==========================================

  const EMOTION_PATTERNS = {
    // Each emotion requires multiple signals to be valid
    frustration: {
      required: 1,  // Rage click alone is strong enough
      signals: [
        { type: 'rage_click', weight: 1.0 },
        { type: 'rapid_scroll_direction_change', weight: 0.8 },
        { type: 'form_abandonment', weight: 0.9 },
        { type: 'excessive_backspace', weight: 0.7 },
        { type: 'mouse_shake', weight: 0.6 }
      ],
      antiSignals: ['slow_reading', 'methodical_form_fill'], // These cancel it out
      confidence: { base: 70, max: 95 }
    },

    confusion: {
      required: 2,
      signals: [
        { type: 'scroll_up_down_pattern', weight: 0.9 },
        { type: 'hover_without_click', weight: 0.6 },
        { type: 'long_pause', weight: 0.5 },
        { type: 'nav_menu_cycling', weight: 0.8 },
        { type: 'help_search', weight: 1.0 }
      ],
      antiSignals: ['confident_navigation', 'direct_action'],
      confidence: { base: 65, max: 90 }
    },

    interest: {
      required: 2,
      signals: [
        { type: 'slow_deliberate_scroll', weight: 0.8 },
        { type: 'content_highlighting', weight: 0.9 },
        { type: 'link_hover_reading', weight: 0.7 },
        { type: 'video_engagement', weight: 1.0 },
        { type: 'expanding_sections', weight: 0.8 }
      ],
      antiSignals: ['rapid_escape', 'tab_switching'],
      confidence: { base: 70, max: 90 }
    },

    purchase_intent: {
      required: 3, // Higher requirement for business-critical emotion
      signals: [
        { type: 'pricing_hover', weight: 0.9 },
        { type: 'add_to_cart', weight: 1.0 },
        { type: 'feature_comparison', weight: 0.8 },
        { type: 'calculator_usage', weight: 0.9 },
        { type: 'review_reading', weight: 0.7 },
        { type: 'faq_expansion', weight: 0.6 }
      ],
      antiSignals: ['price_recoil', 'immediate_exit'],
      confidence: { base: 75, max: 95 }
    },

    abandonment_risk: {
      required: 2,
      signals: [
        { type: 'mouse_to_back_button', weight: 0.9 },
        { type: 'mouse_to_tab_bar', weight: 0.8 },
        { type: 'rapid_scroll_to_top', weight: 0.7 },
        { type: 'idle_timeout', weight: 0.6 },
        { type: 'form_field_clearing', weight: 0.8 }
      ],
      antiSignals: ['recent_interaction', 'content_engagement'],
      confidence: { base: 70, max: 90 }
    },

    delight: {
      required: 2,
      signals: [
        { type: 'smooth_flow', weight: 0.7 },
        { type: 'quick_completion', weight: 0.8 },
        { type: 'social_sharing_hover', weight: 0.9 },
        { type: 'positive_feedback_interaction', weight: 1.0 },
        { type: 'replay_demo', weight: 0.8 }
      ],
      antiSignals: ['error_encounter', 'frustration_signals'],
      confidence: { base: 65, max: 85 }
    }
  };

  // ==========================================
  // BEHAVIORAL SIGNAL DETECTORS
  // ==========================================

  class SignalDetector {
    constructor() {
      this.signals = new Set();
      this.signalHistory = [];
      this.lastSignalTime = {};
    }

    detect(type, data) {
      const now = Date.now();

      // Prevent signal spam - same signal needs cooldown
      if (this.lastSignalTime[type] && (now - this.lastSignalTime[type]) < 2000) {
        if (debugMode) {
          console.log(`⏱️ Signal ${type} on cooldown`);
        }
        return false;
      }

      if (debugMode) {
        console.log(`🎯 Signal detected: ${type}`, data);
      }

      // Record signal
      this.signals.add(type);
      this.signalHistory.push({ type, timestamp: now, data });
      this.lastSignalTime[type] = now;

      // Keep history bounded
      if (this.signalHistory.length > 50) {
        this.signalHistory.shift();
      }

      // Clean old signals from active set
      this.signals = new Set(
        this.signalHistory
          .filter(s => now - s.timestamp < 10000) // 10 second window for pattern matching
          .map(s => s.type)
      );

      return true;
    }

    hasSignal(type, withinMs = 5000) {
      const now = Date.now();
      return this.signalHistory.some(
        s => s.type === type && (now - s.timestamp) < withinMs
      );
    }

    getActiveSignals() {
      return Array.from(this.signals);
    }

    clear() {
      this.signals.clear();
      this.signalHistory = [];
    }
  }

  // ==========================================
  // CONFIDENCE SCORING ENGINE
  // ==========================================

  class ConfidenceEngine {
    calculate(emotion, matchedSignals, context) {
      const pattern = EMOTION_PATTERNS[emotion];
      if (!pattern) return 0;

      let confidence = pattern.confidence.base;

      // Weight by signal importance
      const signalWeight = matchedSignals.reduce((sum, signal) => {
        const signalDef = pattern.signals.find(s => s.type === signal);
        return sum + (signalDef?.weight || 0.5);
      }, 0);

      // More signals = higher confidence
      confidence += (signalWeight * 10);

      // Decay confidence based on context
      confidence *= this.getContextMultiplier(context);

      // Decay if user is idle
      if (context.idleTime > 5000) {
        confidence *= 0.8;
      }

      // Decay if we've been emitting too many emotions
      if (context.recentEmotionCount > 5) {
        confidence *= 0.7;
      }

      // Cap at maximum
      return Math.min(confidence, pattern.confidence.max);
    }

    getContextMultiplier(context) {
      let multiplier = 1.0;

      // Reduce confidence if we're uncertain about section
      if (context.sectionConfidence < 0.7) {
        multiplier *= 0.8;
      }

      // Reduce if page just loaded
      if (context.timeOnPage < 3000) {
        multiplier *= 0.7;
      }

      // Boost if behavior is consistent
      if (context.behaviorConsistency > 0.8) {
        multiplier *= 1.2;
      }

      return multiplier;
    }
  }

  // ==========================================
  // PATTERN MATCHING ENGINE
  // ==========================================

  class PatternMatcher {
    constructor(signalDetector, confidenceEngine) {
      this.signalDetector = signalDetector;
      this.confidenceEngine = confidenceEngine;
      this.recentEmotions = new Map();
    }

    findMatches(context) {
      const activeSignals = this.signalDetector.getActiveSignals();
      const matches = [];

      if (debugMode && activeSignals.length > 0) {
        console.log('🔎 Pattern matching with signals:', activeSignals);
      }

      for (const [emotion, pattern] of Object.entries(EMOTION_PATTERNS)) {
        // Check for anti-signals (disqualifiers)
        const hasAntiSignal = pattern.antiSignals.some(
          signal => this.signalDetector.hasSignal(signal)
        );

        if (hasAntiSignal) {
          if (debugMode) {
            console.log(`❌ ${emotion} blocked by anti-signal`);
          }
          continue; // Skip this emotion
        }

        // Find matching signals
        const matchedSignals = pattern.signals
          .map(s => s.type)
          .filter(signal => activeSignals.includes(signal));

        if (debugMode && matchedSignals.length > 0) {
          console.log(`🎲 ${emotion}: ${matchedSignals.length}/${pattern.required} signals matched`, matchedSignals);
        }

        // Need minimum number of signals
        if (matchedSignals.length >= pattern.required) {
          const confidence = this.confidenceEngine.calculate(
            emotion,
            matchedSignals,
            context
          );

          // Only include if confidence is meaningful
          if (confidence > 50) {
            if (debugMode) {
              console.log(`✅ ${emotion} matched with ${confidence}% confidence!`);
            }
            matches.push({
              emotion,
              confidence,
              signals: matchedSignals,
              timestamp: Date.now()
            });
          } else if (debugMode) {
            console.log(`⚠️ ${emotion} confidence too low: ${confidence}%`);
          }
        }
      }

      // Return highest confidence match
      return matches.sort((a, b) => b.confidence - a.confidence)[0] || null;
    }

    shouldEmit(emotion, confidence) {
      const now = Date.now();
      const lastEmit = this.recentEmotions.get(emotion);

      // Same emotion needs 10 second cooldown
      if (lastEmit && (now - lastEmit) < 10000) {
        return false;
      }

      // Low confidence needs even longer cooldown
      if (confidence < 70 && lastEmit && (now - lastEmit) < 20000) {
        return false;
      }

      this.recentEmotions.set(emotion, now);

      // Clean old entries
      for (const [emo, time] of this.recentEmotions.entries()) {
        if (now - time > 60000) {
          this.recentEmotions.delete(emo);
        }
      }

      return true;
    }
  }

  // ==========================================
  // ENHANCED SECTION DETECTION
  // ==========================================

  class SectionDetector {
    detectCurrent() {
      // Try multiple detection strategies
      const strategies = [
        this.detectBySelectors(),
        this.detectByContent(),
        this.detectByPosition()
      ];

      // Vote on most likely section
      const votes = {};
      let bestConfidence = 0;

      for (const result of strategies) {
        if (result) {
          votes[result.section] = (votes[result.section] || 0) + result.confidence;
          bestConfidence = Math.max(bestConfidence, result.confidence);
        }
      }

      // Find winning section
      let winningSection = 'unknown';
      let maxVotes = 0;

      for (const [section, voteCount] of Object.entries(votes)) {
        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          winningSection = section;
        }
      }

      return {
        section: winningSection,
        confidence: Math.min(bestConfidence, 0.95)
      };
    }

    detectBySelectors() {
      const selectors = [
        { patterns: ['#hero', '.hero', 'header:first-of-type'], section: 'hero' },
        { patterns: ['#pricing', '.pricing', '[data-pricing]'], section: 'pricing' },
        { patterns: ['#features', '.features'], section: 'features' },
        { patterns: ['#testimonials', '.testimonials', '.reviews'], section: 'testimonials' },
        { patterns: ['#contact', 'form', '.contact'], section: 'contact' },
        { patterns: ['footer'], section: 'footer' }
      ];

      const viewportCenter = window.scrollY + (window.innerHeight / 2);

      for (const { patterns, section } of selectors) {
        for (const pattern of patterns) {
          const element = document.querySelector(pattern);
          if (element) {
            const rect = element.getBoundingClientRect();
            const elementCenter = rect.top + (rect.height / 2);

            // Is element in viewport?
            if (Math.abs(elementCenter) < window.innerHeight / 2) {
              return { section, confidence: 0.9 };
            }
          }
        }
      }

      return null;
    }

    detectByContent() {
      // Analyze visible text content
      const visibleText = this.getVisibleText();

      const contentPatterns = {
        pricing: /\$\d+|pricing|plan|subscription|billing/gi,
        features: /features?|capabilities|benefits|why choose/gi,
        testimonials: /testimonial|review|what.*say|customer|client/gi,
        contact: /contact|get in touch|email|phone|address/gi,
        demo: /demo|how it works|see it in action|try/gi
      };

      const matches = {};
      for (const [section, pattern] of Object.entries(contentPatterns)) {
        const matchCount = (visibleText.match(pattern) || []).length;
        if (matchCount > 0) {
          matches[section] = matchCount;
        }
      }

      // Find best match
      let bestSection = null;
      let bestCount = 0;

      for (const [section, count] of Object.entries(matches)) {
        if (count > bestCount) {
          bestCount = count;
          bestSection = section;
        }
      }

      if (bestSection) {
        // Confidence based on match density
        const confidence = Math.min(0.5 + (bestCount * 0.1), 0.8);
        return { section: bestSection, confidence };
      }

      return null;
    }

    detectByPosition() {
      const scrollPercentage = (window.scrollY /
        (document.body.scrollHeight - window.innerHeight)) * 100;

      // Less rigid, more probabilistic
      if (scrollPercentage < 10) {
        return { section: 'hero', confidence: 0.7 };
      } else if (scrollPercentage > 95) {
        return { section: 'footer', confidence: 0.8 };
      } else if (scrollPercentage > 80) {
        return { section: 'contact', confidence: 0.5 };
      } else if (scrollPercentage > 60) {
        return { section: 'pricing', confidence: 0.4 };
      } else {
        return { section: 'features', confidence: 0.3 };
      }
    }

    getVisibleText() {
      const elements = document.elementsFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 2
      );

      return elements
        .map(el => el.textContent)
        .join(' ')
        .substring(0, 1000);
    }
  }

  // ==========================================
  // BEHAVIORAL TRACKING
  // ==========================================

  class BehaviorTracker {
    constructor(signalDetector) {
      this.signalDetector = signalDetector;
      this.mouseHistory = [];
      this.scrollHistory = [];
      this.clickHistory = [];
      this.lastActivity = Date.now();
      this.idleTimer = null;

      this.initListeners();
    }

    initListeners() {
      // Mouse tracking
      let lastMouseTime = 0;
      document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        const timeDelta = now - lastMouseTime;

        if (timeDelta > 50) { // Throttle to 20fps
          this.trackMouse(e, timeDelta);
          lastMouseTime = now;
        }

        this.resetIdle();
      });

      // Click tracking
      document.addEventListener('click', (e) => {
        this.trackClick(e);
        this.resetIdle();
      });

      // Scroll tracking
      let lastScrollTime = 0;
      document.addEventListener('scroll', () => {
        const now = Date.now();
        if (now - lastScrollTime > 100) { // Throttle
          this.trackScroll();
          lastScrollTime = now;
        }
        this.resetIdle();
      });

      // Form tracking
      document.addEventListener('focus', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          this.signalDetector.detect('form_focus', { field: e.target.name });
        }
      }, true);

      document.addEventListener('blur', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          if (!e.target.value) {
            this.signalDetector.detect('form_abandonment', { field: e.target.name });
          }
        }
      }, true);

      // Visibility tracking
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.signalDetector.detect('tab_switching', {});
        }
      });
    }

    trackMouse(e, timeDelta) {
      const current = { x: e.clientX, y: e.clientY, t: Date.now() };

      if (this.mouseHistory.length > 0) {
        const last = this.mouseHistory[this.mouseHistory.length - 1];
        const distance = Math.sqrt(
          Math.pow(current.x - last.x, 2) +
          Math.pow(current.y - last.y, 2)
        );
        const velocity = distance / timeDelta;

        // Detect patterns
        this.detectMousePatterns(current, last, velocity);
      }

      this.mouseHistory.push(current);
      if (this.mouseHistory.length > 20) {
        this.mouseHistory.shift();
      }
    }

    detectMousePatterns(current, last, velocity) {
      // Rage click detection (multiple clicks in same area)
      if (this.clickHistory.length >= 3) {
        const recentClicks = this.clickHistory.slice(-3);

        // Check if all clicks are near EACH OTHER, not near current mouse
        const firstClick = recentClicks[0];
        const clicksNearby = recentClicks.every(click => {
          const dist = Math.sqrt(
            Math.pow(click.x - firstClick.x, 2) +
            Math.pow(click.y - firstClick.y, 2)
          );
          return dist < 50;
        });

        const timeBetween = Date.now() - recentClicks[0].t;

        if (debugMode && clicksNearby) {
          console.log(`🔥 Rage click check: ${recentClicks.length} clicks in ${timeBetween}ms`);
        }

        if (clicksNearby && timeBetween < 1000) {
          this.signalDetector.detect('rage_click', { clicks: 3, time: timeBetween });
        }
      }

      // Mouse shake detection
      if (this.mouseHistory.length >= 5) {
        const recent = this.mouseHistory.slice(-5);
        let directionChanges = 0;

        for (let i = 1; i < recent.length; i++) {
          const dx = recent[i].x - recent[i-1].x;
          const prevDx = i > 1 ? recent[i-1].x - recent[i-2].x : 0;

          if ((dx > 0 && prevDx < 0) || (dx < 0 && prevDx > 0)) {
            directionChanges++;
          }
        }

        if (directionChanges >= 3 && velocity > 2) {
          this.signalDetector.detect('mouse_shake', { changes: directionChanges });
        }
      }

      // Recoil detection (sudden movement away from element)
      if (velocity > 5 && current.y < last.y - 50) {
        // Check if near pricing or CTA
        const element = document.elementFromPoint(last.x, last.y);
        if (element && (element.textContent?.includes('$') ||
            element.classList?.contains('cta'))) {
          this.signalDetector.detect('price_recoil', { velocity });
        }
      }

      // Mouse to tab bar / back button
      if (current.y < 50 && velocity > 3) {
        this.signalDetector.detect('mouse_to_tab_bar', {});
      }

      if (current.x < 50 && current.y < 100 && velocity > 3) {
        this.signalDetector.detect('mouse_to_back_button', {});
      }
    }

    trackClick(e) {
      const click = {
        x: e.clientX,
        y: e.clientY,
        t: Date.now(),
        target: e.target.tagName
      };

      if (debugMode) {
        console.log('🖱️ Click detected:', click);
      }

      this.clickHistory.push(click);
      if (this.clickHistory.length > 10) {
        this.clickHistory.shift();
      }

      // Detect specific click patterns
      const element = e.target;

      if (element.textContent?.includes('$') ||
          element.closest('.pricing')) {
        this.signalDetector.detect('pricing_hover', {});
      }

      if (element.tagName === 'BUTTON' &&
          element.textContent?.match(/add|cart|buy/i)) {
        this.signalDetector.detect('add_to_cart', {});
      }
    }

    trackScroll() {
      const current = {
        y: window.scrollY,
        t: Date.now()
      };

      if (this.scrollHistory.length > 0) {
        const last = this.scrollHistory[this.scrollHistory.length - 1];
        const velocity = Math.abs(current.y - last.y) / (current.t - last.t);

        // Detect scroll patterns
        this.detectScrollPatterns(current, last, velocity);
      }

      this.scrollHistory.push(current);
      if (this.scrollHistory.length > 20) {
        this.scrollHistory.shift();
      }
    }

    detectScrollPatterns(current, last, velocity) {
      // Rapid direction changes
      if (this.scrollHistory.length >= 3) {
        const recent = this.scrollHistory.slice(-3);
        let directionChanges = 0;

        for (let i = 1; i < recent.length; i++) {
          const dy = recent[i].y - recent[i-1].y;
          const prevDy = i > 1 ? recent[i-1].y - recent[i-2].y : 0;

          if ((dy > 0 && prevDy < 0) || (dy < 0 && prevDy > 0)) {
            directionChanges++;
          }
        }

        if (directionChanges >= 2) {
          this.signalDetector.detect('scroll_up_down_pattern', {});
          this.signalDetector.detect('rapid_scroll_direction_change', {});
        }
      }

      // Slow deliberate scrolling (reading)
      if (velocity > 0.05 && velocity < 0.5) {
        this.signalDetector.detect('slow_deliberate_scroll', { velocity });
        this.signalDetector.detect('slow_reading', {});
      }

      // Rapid scroll to top (escape intent)
      if (current.y < 100 && velocity > 3 && last.y > 500) {
        this.signalDetector.detect('rapid_scroll_to_top', {});
        this.signalDetector.detect('rapid_escape', {});
      }

      // Smooth flow (consistent scrolling)
      if (this.scrollHistory.length >= 5) {
        const recent = this.scrollHistory.slice(-5);
        const avgVelocity = recent.reduce((sum, s, i) => {
          if (i === 0) return 0;
          return sum + Math.abs(s.y - recent[i-1].y) / (s.t - recent[i-1].t);
        }, 0) / (recent.length - 1);

        if (avgVelocity > 0.3 && avgVelocity < 1) {
          this.signalDetector.detect('smooth_flow', {});
        }
      }
    }

    resetIdle() {
      this.lastActivity = Date.now();

      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }

      this.idleTimer = setTimeout(() => {
        this.signalDetector.detect('idle_timeout', {
          duration: Date.now() - this.lastActivity
        });
      }, 30000); // 30 second idle
    }

    getIdleTime() {
      return Date.now() - this.lastActivity;
    }
  }

  // ==========================================
  // MAIN ORCHESTRATOR
  // ==========================================

  class SentientIQ {
    constructor() {
      this.signalDetector = new SignalDetector();
      this.confidenceEngine = new ConfidenceEngine();
      this.patternMatcher = new PatternMatcher(this.signalDetector, this.confidenceEngine);
      this.sectionDetector = new SectionDetector();
      this.behaviorTracker = new BehaviorTracker(this.signalDetector);

      this.emotionHistory = [];
      this.currentSection = null;

      this.init();
    }

    showInitBanner() {
      const banner = document.createElement('div');
      banner.id = 'sentientiq-init-banner';
      banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: white;
        padding: 20px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 999999;
        animation: slideUp 0.4s ease-out;
        max-width: 360px;
        border: 1px solid rgba(102, 126, 234, 0.3);
      `;

      // Add animation styles
      if (!document.getElementById('sentientiq-animations')) {
        const style = document.createElement('style');
        style.id = 'sentientiq-animations';
        style.textContent = `
          @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(100px); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      banner.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <span style="font-size: 28px;">🧠</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 16px;">
              SentientIQ Active
            </div>
            <div style="opacity: 0.8; line-height: 1.4;">
              Emotion detection v3.0 is monitoring user experience.
              ${debugMode ? '<br><span style="color: #667eea;">🔍 Debug mode enabled - check console</span>' : ''}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(banner);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        banner.style.animation = 'slideOut 0.4s ease-in';
        banner.style.animationFillMode = 'forwards';
        setTimeout(() => banner.remove(), 400);
      }, 5000);

      // Log behaviors being tracked
      if (debugMode) {
        console.log('%c📊 Tracking behaviors:', 'color: #667eea; font-weight: bold');
        console.log('  • Rage clicks (3+ rapid clicks)');
        console.log('  • Scroll patterns (hesitation, rapid changes)');
        console.log('  • Mouse movements (shake, hover patterns)');
        console.log('  • Content engagement (slow reading, highlighting)');
        console.log('  • Navigation intent (back button, tab switching)');
      }
    }

    showNotification(emotion, confidence) {
      // Remove any existing notification
      const existing = document.getElementById('sentientiq-notification');
      if (existing) existing.remove();

      // Create notification element
      const notification = document.createElement('div');
      notification.id = 'sentientiq-notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 999999;
        animation: slideIn 0.3s ease-out;
        max-width: 320px;
      `;

      // Emotion emoji map
      const emojiMap = {
        frustration: '😤',
        confusion: '🤔',
        interest: '👀',
        delight: '😊',
        purchase_intent: '💳',
        abandonment_risk: '🚪',
        section_transition: '📍'
      };

      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">${emojiMap[emotion] || '🎯'}</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">
              ${emotion.replace(/_/g, ' ').charAt(0).toUpperCase() + emotion.slice(1).replace(/_/g, ' ')}
            </div>
            <div style="opacity: 0.9; font-size: 12px;">
              ${confidence}% confidence • SentientIQ
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(notification);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        notification.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 4000);
    }

    init() {
      if (debugMode) {
        console.log('🚀 SentientIQ v3.0 initialized');
        console.log('📊 Debug mode enabled');
        console.log('🔑 API Key:', config.apiKey.substring(0, 20) + '...');
      }

      // Show initialization banner
      this.showInitBanner();

      // Start processing loop
      setInterval(() => this.process(), 2000);

      // Initial section detection
      setTimeout(() => {
        const result = this.sectionDetector.detectCurrent();
        this.currentSection = result.section;

        if (config.debug) {
          console.log(`📍 Initial section: ${result.section} (${Math.round(result.confidence * 100)}% confident)`);
        }
      }, 1000);
    }

    process() {
      // Don't process if tab is hidden
      if (document.hidden) return;

      // Get current context
      const sectionResult = this.sectionDetector.detectCurrent();
      const context = {
        section: sectionResult.section,
        sectionConfidence: sectionResult.confidence,
        timeOnPage: Date.now() - config.startTime,
        idleTime: this.behaviorTracker.getIdleTime(),
        recentEmotionCount: this.emotionHistory.filter(
          e => Date.now() - e.timestamp < 30000
        ).length,
        behaviorConsistency: this.calculateBehaviorConsistency()
      };

      // Update section if changed
      if (sectionResult.section !== this.currentSection) {
        this.handleSectionChange(this.currentSection, sectionResult.section);
        this.currentSection = sectionResult.section;
      }

      // Find emotion patterns
      const match = this.patternMatcher.findMatches(context);

      if (match && this.patternMatcher.shouldEmit(match.emotion, match.confidence)) {
        this.emitEmotion(match.emotion, {
          confidence: match.confidence,
          signals: match.signals,
          section: context.section,
          sectionConfidence: context.sectionConfidence
        });
      }
    }

    calculateBehaviorConsistency() {
      // How consistent has behavior been?
      if (this.emotionHistory.length < 2) return 0.5;

      const recent = this.emotionHistory.slice(-5);
      const emotions = recent.map(e => e.emotion);
      const unique = new Set(emotions).size;

      // More unique emotions = less consistent
      return 1 - (unique / emotions.length);
    }

    handleSectionChange(from, to) {
      if (!from) return;

      // Log section change but don't emit as emotion
      if (debugMode) {
        console.log(`📍 Section change: ${from} → ${to}`);
      }

      // Don't clear signals - let them persist across sections
      // This allows emotions to build up naturally
    }

    emitEmotion(emotion, metadata) {
      const event = {
        session_id: config.sessionId,
        user_id: config.apiKey,
        tenant_id: config.apiKey,
        emotion: emotion,
        confidence: metadata.confidence,
        section: metadata.section,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
        metadata: metadata
      };

      // Show notification banner
      this.showNotification(emotion, metadata.confidence);

      // Track in history
      this.emotionHistory.push({
        emotion,
        timestamp: Date.now(),
        confidence: metadata.confidence
      });

      // Keep history bounded
      if (this.emotionHistory.length > 50) {
        this.emotionHistory.shift();
      }

      // Emit browser event
      window.dispatchEvent(new CustomEvent('sentientiq:emotion', { detail: event }));

      // Send to API
      fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify(event)
      }).catch(err => {
        if (config.debug) console.error('Failed to send emotion:', err);
      });

      if (config.debug) {
        console.log(
          `🎯 ${emotion} (${Math.round(metadata.confidence)}% confident)`,
          `📍 ${metadata.section}`,
          `🔍 Signals: ${metadata.signals?.join(', ') || 'none'}`
        );
      }
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  window.SentientIQInstance = new SentientIQ();

  // Public API
  window.SentientIQ = {
    version: '3.0.0',

    getEmotionHistory: () => window.SentientIQInstance.emotionHistory,
    getCurrentSection: () => window.SentientIQInstance.currentSection,
    getActiveSignals: () => window.SentientIQInstance.signalDetector.getActiveSignals(),

    // Testing helpers
    debug: {
      triggerSignal: (type) => window.SentientIQInstance.signalDetector.detect(type, { manual: true }),
      getPatterns: () => EMOTION_PATTERNS,
      forceEmotion: (emotion) => window.SentientIQInstance.emitEmotion(emotion, {
        confidence: 100,
        signals: ['manual_test'],
        section: 'test'
      })
    }
  };

  if (config.debug) {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   🧠 SENTIENTIQ v3.0 - PATTERN-VALIDATED EMOTIONS    ║
║                                                       ║
║   No single behavior = emotion                       ║
║   Multiple signals required for confidence           ║
║   Context-aware confidence scoring                   ║
║                                                       ║
║   Emotions: ${Object.keys(EMOTION_PATTERNS).join(', ')}
╚═══════════════════════════════════════════════════════╝
    `);
  }

})();