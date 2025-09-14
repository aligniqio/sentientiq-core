/**
 * SentientIQ Emotion Detection v4.0 - Production
 * Behavioral Taxonomy Engine with Emotional Forensics
 *
 * Complete behavioral mapping with temporal context
 * Each behavior maps to ONE primary emotion with confidence modifiers
 * Production-hardened with visibility awareness, proper cooldowns, and state machine
 */

(function() {
  'use strict';

  // ==========================================
  // CONFIGURATION
  // ==========================================

  const scripts = document.querySelectorAll('script[src*="detect"]');
  const scriptTag = Array.from(scripts).find(s => s.src.includes('/v4/') || s.src.includes('detect-v4')) || document.currentScript;

  const scriptUrl = scriptTag?.src || '';
  const urlParams = new URLSearchParams(scriptUrl.split('?')[1] || '');

  const apiKey = scriptTag?.getAttribute('data-api-key') ||
                 urlParams.get('key') ||
                 'sq_demo_v4';

  const debugMode = scriptTag?.getAttribute('data-debug') === 'true' ||
                    urlParams.get('debug') === 'true';

  if (!apiKey) {
    console.error('SentientIQ: No API key provided');
    return;
  }

  const config = {
    apiEndpoint: 'https://api.sentientiq.app/api/emotional/event',
    apiKey: apiKey,
    sessionId: crypto.randomUUID?.() || `sq_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    tenantId: scriptTag?.getAttribute('data-tenant-id') || urlParams.get('tenant') || apiKey.split('_')[0] || 'unknown',
    debug: debugMode
  };

  // ==========================================
  // BEHAVIORAL TAXONOMY
  // ==========================================

  const BEHAVIORS = {
    // Click Behaviors
    SINGLE_CLICK: 'single_click',
    DOUBLE_CLICK: 'double_click',
    RAGE_CLICK: 'rage_click',
    EXPLORATORY_CLICK: 'exploratory_click',

    // Movement Behaviors
    HOVER: 'hover',
    DRIFT: 'drift',
    SCAN: 'scan',
    SHAKE: 'shake',
    EXIT_INTENT: 'exit_intent',

    // Scroll Behaviors
    SLOW_SCROLL: 'slow_scroll',
    NORMAL_SCROLL: 'normal_scroll',
    FAST_SCROLL: 'fast_scroll',
    SKIM_SCROLL: 'skim_scroll',
    SCROLL_REVERSAL: 'scroll_reversal',
    SCROLL_HUNT: 'scroll_hunt',

    // Idle Behaviors
    IDLE_SHORT: 'idle_short',
    IDLE_LONG: 'idle_long',
    ABANDONED: 'abandoned',

    // Off-canvas Behaviors
    MOUSE_OFF_BRIEF: 'mouse_off_brief',
    MOUSE_OFF_SUSTAINED: 'mouse_off_sustained'
  };

  // Primary emotion mapping (one behavior -> one emotion)
  const BEHAVIOR_EMOTION_MAP = {
    [BEHAVIORS.RAGE_CLICK]: { emotion: 'frustration', confidence: 90 },
    [BEHAVIORS.SHAKE]: { emotion: 'frustration', confidence: 85 },
    [BEHAVIORS.SCROLL_HUNT]: { emotion: 'frustration', confidence: 70 },

    [BEHAVIORS.HOVER]: { emotion: 'interest', confidence: 60 },
    [BEHAVIORS.EXPLORATORY_CLICK]: { emotion: 'confusion', confidence: 65 },
    [BEHAVIORS.SCROLL_REVERSAL]: { emotion: 'confusion', confidence: 70 },

    [BEHAVIORS.SLOW_SCROLL]: { emotion: 'interest', confidence: 80 },
    [BEHAVIORS.NORMAL_SCROLL]: { emotion: 'engaged', confidence: 60 },
    [BEHAVIORS.DRIFT]: { emotion: 'satisfaction', confidence: 55 },

    [BEHAVIORS.EXIT_INTENT]: { emotion: 'abandonment_risk', confidence: 85 },
    [BEHAVIORS.IDLE_LONG]: { emotion: 'abandonment_risk', confidence: 70 },
    [BEHAVIORS.ABANDONED]: { emotion: 'abandonment_risk', confidence: 95 },
    [BEHAVIORS.MOUSE_OFF_SUSTAINED]: { emotion: 'abandonment_risk', confidence: 75 },

    [BEHAVIORS.FAST_SCROLL]: { emotion: 'scanning', confidence: 65 },
    [BEHAVIORS.SKIM_SCROLL]: { emotion: 'scanning', confidence: 75 },

    [BEHAVIORS.SINGLE_CLICK]: { emotion: 'engaged', confidence: 40 },
    [BEHAVIORS.DOUBLE_CLICK]: { emotion: 'interest', confidence: 50 },

    [BEHAVIORS.MOUSE_OFF_BRIEF]: { emotion: 'distracted', confidence: 45 },
    [BEHAVIORS.IDLE_SHORT]: { emotion: 'reading', confidence: 50 }
  };

  // Context modifiers
  const CONTEXT_MODIFIERS = {
    // Element-based modifiers
    PRICE_ELEMENT: { emotions: ['interest', 'engaged'], boost: 20, becomes: 'purchase_intent' },
    CTA_BUTTON: { emotions: ['interest'], boost: 15 },
    NAVIGATION: { emotions: ['confusion'], boost: 10 },
    FORM_FIELD: { emotions: ['engaged'], boost: 15 },

    // Duration-based modifiers
    BRIEF: { threshold: 1000, multiplier: 0.7 },
    SUSTAINED: { threshold: 3000, multiplier: 1.3 },
    EXTENDED: { threshold: 5000, multiplier: 1.5 },

    // Sequence-based modifiers (sticky emotions)
    AFTER_FRUSTRATION: { duration: 5000, boost: 10 },
    AFTER_SUCCESS: { duration: 3000, boost: -10 }
  };

  // ==========================================
  // BEHAVIORAL DETECTOR
  // ==========================================

  class BehaviorDetector {
    constructor() {
      this.clickHistory = [];
      this.moveHistory = [];
      this.scrollHistory = [];
      this.idleTimer = null;
      this.lastActivity = Date.now();
      this.currentBehaviors = new Map();
      this.behaviorHistory = [];
      this.mouseOffCanvas = false;
      this.mouseOffCanvasStart = null;
      this.hoverStart = null;
      this.hoverElement = null;
      this.suspended = false;
    }

    detectClickBehavior(clicks) {
      if (this.suspended) return null;

      const now = Date.now();
      const recentClicks = clicks.filter(c => now - c.t < 1000);

      if (recentClicks.length >= 3) {
        // Check if clicks are in same area (rage click)
        const firstClick = recentClicks[0];
        const isRageClick = recentClicks.every(click => {
          const dist = Math.sqrt(
            Math.pow(click.x - firstClick.x, 2) +
            Math.pow(click.y - firstClick.y, 2)
          );
          return dist < 50;
        });

        if (isRageClick) {
          if (debugMode) {
            console.log(`🔥 Rage click detected: ${recentClicks.length} clicks`);
          }
          return { type: BEHAVIORS.RAGE_CLICK, confidence: 90 + (recentClicks.length * 2) };
        }

        // Clicks spread out = exploratory
        return { type: BEHAVIORS.EXPLORATORY_CLICK, confidence: 65 };
      }

      if (recentClicks.length === 2 && (recentClicks[1].t - recentClicks[0].t) < 500) {
        return { type: BEHAVIORS.DOUBLE_CLICK, confidence: 50 };
      }

      if (recentClicks.length === 1) {
        return { type: BEHAVIORS.SINGLE_CLICK, confidence: 40 };
      }

      return null;
    }

    detectMoveBehavior(moves) {
      if (this.suspended || moves.length < 3) return null;

      const recent = moves.slice(-5);
      const avgVelocity = recent.reduce((sum, m) => sum + m.v, 0) / recent.length;

      // Check for shake (rapid direction changes)
      let directionChanges = 0;
      for (let i = 1; i < recent.length; i++) {
        const dx1 = recent[i].x - recent[i-1].x;
        const dx2 = i > 1 ? recent[i-1].x - recent[i-2].x : 0;
        if (dx1 * dx2 < 0) directionChanges++;
      }

      if (directionChanges >= 3) {
        if (debugMode) {
          console.log('🔀 Mouse shake detected');
        }
        return { type: BEHAVIORS.SHAKE, confidence: 85 };
      }

      // Enhanced exit intent with trend
      const last = recent.at(-1);
      const secondLast = recent.at(-2);
      if (last && secondLast) {
        const dy = last.y - secondLast.y;
        const upwardStreak = recent.slice(-4).every((m, i, a) => i === 0 || a[i].y < a[i-1].y);

        if (last.y < 8 && upwardStreak && avgVelocity > 12 && !document.hidden) {
          if (debugMode) {
            console.log('🚪 Exit intent detected');
          }
          return { type: BEHAVIORS.EXIT_INTENT, confidence: 85 };
        }
      }

      // Hover detection (stationary over element)
      if (avgVelocity < 0.5) {
        const lastMove = recent[recent.length - 1];
        const element = document.elementFromPoint(lastMove.x, lastMove.y);
        if (element && element !== document.body && element !== document.documentElement) {
          if (!this.hoverStart) {
            this.hoverStart = Date.now();
            this.hoverElement = element;
          } else if (element === this.hoverElement) {
            const hoverDuration = Date.now() - this.hoverStart;
            if (hoverDuration > 1000) {
              if (debugMode) {
                console.log(`👀 Hover detected for ${hoverDuration}ms`);
              }
              return { type: BEHAVIORS.HOVER, confidence: 60 + Math.min(30, hoverDuration / 100) };
            }
          }
        }
      } else {
        this.hoverStart = null;
        this.hoverElement = null;
      }

      // Categorize by velocity
      if (avgVelocity < 2) {
        return { type: BEHAVIORS.DRIFT, confidence: 55 };
      } else if (avgVelocity < 15) {
        return { type: BEHAVIORS.SCAN, confidence: 60 };
      }

      return null;
    }

    detectScrollBehavior(scrolls) {
      if (this.suspended || scrolls.length < 2) return null;

      const recent = scrolls.slice(-10);
      const avgVelocity = recent.reduce((sum, s) => sum + Math.abs(s.v), 0) / recent.length;

      // Check for scroll hunt (multiple direction changes)
      let directionChanges = 0;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].v * recent[i-1].v < 0) {
          directionChanges++;
        }
      }

      if (directionChanges >= 3) {
        if (debugMode) {
          console.log('🎯 Scroll hunt detected');
        }
        return { type: BEHAVIORS.SCROLL_HUNT, confidence: 70 };
      }

      if (directionChanges === 1 && recent.length < 5) {
        return { type: BEHAVIORS.SCROLL_REVERSAL, confidence: 70 };
      }

      // Categorize by velocity
      if (avgVelocity < 0.5) {
        return { type: BEHAVIORS.SLOW_SCROLL, confidence: 80 };
      } else if (avgVelocity < 2) {
        return { type: BEHAVIORS.NORMAL_SCROLL, confidence: 60 };
      } else if (avgVelocity < 10) {
        return { type: BEHAVIORS.FAST_SCROLL, confidence: 65 };
      } else {
        return { type: BEHAVIORS.SKIM_SCROLL, confidence: 75 };
      }
    }

    detectIdleBehavior() {
      if (this.suspended) return null;

      const idleTime = Date.now() - this.lastActivity;

      if (idleTime > 30000) {
        return { type: BEHAVIORS.ABANDONED, confidence: 95 };
      } else if (idleTime > 10000) {
        return { type: BEHAVIORS.IDLE_LONG, confidence: 70 };
      } else if (idleTime > 3000) {
        return { type: BEHAVIORS.IDLE_SHORT, confidence: 50 };
      }

      return null;
    }

    detectMouseOffCanvas() {
      if (this.suspended) return null;

      if (this.mouseOffCanvas && this.mouseOffCanvasStart) {
        const duration = Date.now() - this.mouseOffCanvasStart;

        if (duration > 3000) {
          if (debugMode) {
            console.log(`🚪 Mouse off canvas for ${duration}ms`);
          }
          return { type: BEHAVIORS.MOUSE_OFF_SUSTAINED, confidence: 75 };
        } else if (duration > 500) {
          return { type: BEHAVIORS.MOUSE_OFF_BRIEF, confidence: 45 };
        }
      }
      return null;
    }

    getContext(source) {
      // source: {kind:'click'|'move'|'scroll', x, y, target}
      let el = null;
      if (source?.kind === 'click') {
        el = source.target;
      } else if (source?.x != null && source?.y != null) {
        el = document.elementFromPoint(source.x, source.y);
      }

      const ctx = { element: null, sequence: null };

      if (el) {
        // Check element and its text content for context clues
        const elementText = el.textContent?.toLowerCase() || '';
        const href = el.getAttribute?.('href')?.toLowerCase() || '';

        // Check for pricing context
        if (elementText.includes('pric') || elementText.includes('$') ||
            href.includes('pric') || href.includes('#pric') ||
            el.closest('[data-sq-role="price"], .price, .pricing, [class*="price"], [id*="price"]')) {
          ctx.element = 'PRICE_ELEMENT';
        }
        // Check for CTA buttons
        else if (el.matches?.('button,[role="button"]') ||
                 el.closest('button,[role="button"]') ||
                 elementText.match(/get started|sign up|try|buy|purchase|subscribe/i)) {
          ctx.element = 'CTA_BUTTON';
        }
        // Check for navigation
        else if (el.closest('nav,[role="navigation"]')) {
          ctx.element = 'NAVIGATION';
        }
        // Check for form fields
        else if (el.closest('input,textarea,select,form')) {
          ctx.element = 'FORM_FIELD';
        }
      }

      // Sticky sequence context
      const last = this.behaviorHistory.at(-1);
      if (last?.emotion === 'frustration' && Date.now() - last.timestamp < 5000) {
        ctx.sequence = 'AFTER_FRUSTRATION';
      }

      return ctx;
    }

    recordBehavior(behavior, context) {
      const mapping = BEHAVIOR_EMOTION_MAP[behavior.type];
      if (!mapping) return null;

      let emotion = mapping.emotion;
      let confidence = behavior.confidence || mapping.confidence;

      // Apply context modifiers
      if (context.element && CONTEXT_MODIFIERS[context.element]) {
        const modifier = CONTEXT_MODIFIERS[context.element];
        if (modifier.becomes && modifier.emotions.includes(emotion)) {
          emotion = modifier.becomes;
        }
        if (modifier.boost) {
          confidence = Math.min(95, confidence + modifier.boost);
        }
      }

      if (context.sequence && CONTEXT_MODIFIERS[context.sequence]) {
        const modifier = CONTEXT_MODIFIERS[context.sequence];
        confidence = Math.min(95, confidence + modifier.boost);
      }

      const record = {
        behavior: behavior.type,
        emotion: emotion,
        confidence: confidence,
        timestamp: Date.now(),
        context: context
      };

      this.behaviorHistory.push(record);
      if (this.behaviorHistory.length > 100) {
        this.behaviorHistory.shift();
      }

      if (debugMode) {
        console.log(
          `📊 Behavior: ${behavior.type} → ${emotion} (${confidence}% confidence)`
        );
      }

      return record;
    }

    resetActivity() {
      this.lastActivity = Date.now();
      this.clearIdleTimer();

      if (!this.suspended) {
        this.idleTimer = setTimeout(() => {
          const idle = this.detectIdleBehavior();
          if (idle) {
            this.recordBehavior(idle, {});
          }
        }, 3000);
      }
    }

    clearIdleTimer() {
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
    }
  }

  // ==========================================
  // MINIMAL INTENT BRAIN - With Hysteresis
  // ==========================================

  const IntentBrain = (() => {
    let score = 0;
    let lockedUntil = 0;
    let last = Date.now();
    let decayInterval = null;

    const add = (v) => {
      score = Math.max(0, Math.min(100, score + v));
      last = Date.now();
    };

    const decay = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      score = Math.max(0, score - dt * 2.5); // decay ~2.5 pts/sec
      last = now;
    };

    const tick = () => {
      decay();
      if (Date.now() < lockedUntil) return null;

      // Intervention thresholds with hysteresis
      if (score >= 75) {
        lockedUntil = Date.now() + 15000; // 15s lock
        return { type: 'offer_help_or_incentive', score };
      }
      if (score >= 60) {
        lockedUntil = Date.now() + 8000; // 8s lock
        return { type: 'micro_assist_tooltip', score };
      }
      return null;
    };

    const processEmotion = (emotion, context) => {
      // Emotion boost values
      const boost = {
        interest: 8,
        engaged: 6,
        purchase_intent: 15,
        scanning: 3,
        reading: 2,
        satisfaction: 4,
        confusion: -6,
        frustration: -10,
        abandonment_risk: -15,
        distracted: -3
      }[emotion] ?? 0;

      // Context nudges
      const contextBoost =
        (context?.element === 'PRICE_ELEMENT') ? 6 :
        (context?.element === 'CTA_BUTTON') ? 4 :
        (context?.element === 'FORM_FIELD') ? 3 : 0;

      add(boost + contextBoost);
      return tick();
    };

    const init = () => {
      // Run decay check every second
      decayInterval = setInterval(() => decay(), 1000);
    };

    const destroy = () => {
      if (decayInterval) {
        clearInterval(decayInterval);
        decayInterval = null;
      }
    };

    const getScore = () => score;

    return { processEmotion, init, destroy, getScore };
  })();

  // ==========================================
  // EMOTION ENGINE
  // ==========================================

  class EmotionEngine {
    constructor() {
      this.behaviorDetector = new BehaviorDetector();
      this.emotionHistory = [];
      this.lastEmotionTime = Object.create(null);
      this.lastBehaviorTime = Object.create(null);
      this.behaviorCooldowns = {
        hover: 2000,
        shake: 5000,
        rage_click: 8000,
        exit_intent: 7000,
        slow_scroll: 2000,
        fast_scroll: 2000,
        skim_scroll: 3000
      };
      this.pending = [];
      this.bound = [];
      this.lastNotificationTime = 0;
      // Shadow mode by default in production
      this.shadowMode = !debugMode || config.shadowMode;
      this.init();
    }

    init() {
      if (debugMode) {
        console.log('🚀 SentientIQ v4.0 Production initialized');
        console.log('📊 Behavioral Taxonomy Engine active');
        console.log('🔑 Tenant:', config.tenantId);
      }

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Only show banner in debug mode, not shadow mode
      if (debugMode && !this.shadowMode && !prefersReducedMotion) {
        this.showInitBanner();
      }

      this.initListeners();
      IntentBrain.init();

      // Process behaviors every second
      setInterval(() => this.processBehaviors(), 1000);
    }

    initListeners() {
      // Visibility change handling
      this.on(document, 'visibilitychange', () => {
        const hidden = document.visibilityState === 'hidden';
        this.behaviorDetector.suspended = hidden;
        if (hidden) {
          this.behaviorDetector.clearIdleTimer();
        } else {
          this.behaviorDetector.resetActivity();
        }
      });

      // Click tracking
      this.on(document, 'click', (e) => {
        const click = {
          x: e.clientX,
          y: e.clientY,
          t: Date.now(),
          target: e.target
        };

        this.behaviorDetector.clickHistory.push(click);
        if (this.behaviorDetector.clickHistory.length > 20) {
          this.behaviorDetector.clickHistory.shift();
        }

        this.behaviorDetector.resetActivity();

        if (debugMode) {
          console.log('🖱️ Click:', { x: click.x, y: click.y });
        }
      }, { passive: true });

      // Pointer movement tracking (works with mouse and touch)
      let lastMoveTime = 0;
      this.on(document, 'pointermove', (e) => {
        const now = Date.now();
        const dt = Math.max(now - lastMoveTime, 16); // Minimum 1 frame
        if (dt < 50) return; // Throttle

        const prev = this.behaviorDetector.moveHistory.at(-1);
        const dist = prev ? Math.hypot(e.clientX - prev.x, e.clientY - prev.y) : 0;

        const move = {
          x: e.clientX,
          y: e.clientY,
          t: now,
          v: dist / (dt / 100)
        };

        this.behaviorDetector.moveHistory.push(move);
        if (this.behaviorDetector.moveHistory.length > 50) {
          this.behaviorDetector.moveHistory.shift();
        }

        this.behaviorDetector.resetActivity();
        this.behaviorDetector.mouseOffCanvas = false;
        this.behaviorDetector.mouseOffCanvasStart = null;
        lastMoveTime = now;
      }, { passive: true });

      // Pointer leave tracking
      this.on(window, 'pointerleave', () => {
        if (!this.behaviorDetector.suspended) {
          this.behaviorDetector.mouseOffCanvas = true;
          this.behaviorDetector.mouseOffCanvasStart = Date.now();

          if (debugMode) {
            console.log('🚪 Pointer left viewport');
          }
        }
      }, { passive: true });

      this.on(window, 'pointerenter', () => {
        if (this.behaviorDetector.mouseOffCanvas && this.behaviorDetector.mouseOffCanvasStart) {
          const duration = Date.now() - this.behaviorDetector.mouseOffCanvasStart;
          if (debugMode) {
            console.log(`🔙 Pointer returned after ${duration}ms`);
          }
        }
        this.behaviorDetector.mouseOffCanvas = false;
        this.behaviorDetector.mouseOffCanvasStart = null;
      }, { passive: true });

      // Scroll tracking
      let lastScrollTime = 0;
      let lastScrollY = window.scrollY;
      this.on(window, 'scroll', () => {
        const now = Date.now();
        const dt = Math.max(now - lastScrollTime, 16);
        if (dt < 100) return; // Throttle

        const scrollY = window.scrollY;
        const velocity = (scrollY - lastScrollY) / (dt / 100);

        const scroll = {
          y: scrollY,
          t: now,
          v: velocity
        };

        this.behaviorDetector.scrollHistory.push(scroll);
        if (this.behaviorDetector.scrollHistory.length > 50) {
          this.behaviorDetector.scrollHistory.shift();
        }

        this.behaviorDetector.resetActivity();
        lastScrollY = scrollY;
        lastScrollTime = now;
      }, { passive: true });

      // Page unload handling
      this.on(window, 'pagehide', () => {
        if (this.pending.length > 0 && navigator.sendBeacon) {
          const blob = new Blob(
            [JSON.stringify(this.pending)],
            { type: 'application/json' }
          );
          navigator.sendBeacon(config.apiEndpoint, blob);
        }
      });
    }

    on(el, evt, fn, opts) {
      el.addEventListener(evt, fn, opts);
      this.bound.push(() => el.removeEventListener(evt, fn, opts));
    }

    processBehaviors() {
      if (this.behaviorDetector.suspended) return;

      const behaviors = [];

      // Get current position for context
      const lastMove = this.behaviorDetector.moveHistory.at(-1);
      const currentSource = lastMove ? {
        kind: 'move',
        x: lastMove.x,
        y: lastMove.y
      } : null;

      // Check click behaviors
      const clickBehavior = this.behaviorDetector.detectClickBehavior(this.behaviorDetector.clickHistory);
      if (clickBehavior) {
        const lastClick = this.behaviorDetector.clickHistory.at(-1);
        behaviors.push({
          behavior: clickBehavior,
          source: lastClick ? { kind: 'click', x: lastClick.x, y: lastClick.y, target: lastClick.target } : null
        });
      }

      // Check move behaviors
      const moveBehavior = this.behaviorDetector.detectMoveBehavior(this.behaviorDetector.moveHistory);
      if (moveBehavior) {
        behaviors.push({ behavior: moveBehavior, source: currentSource });
      }

      // Check scroll behaviors
      const scrollBehavior = this.behaviorDetector.detectScrollBehavior(this.behaviorDetector.scrollHistory);
      if (scrollBehavior) {
        behaviors.push({ behavior: scrollBehavior, source: currentSource });
      }

      // Check idle behavior
      const idleBehavior = this.behaviorDetector.detectIdleBehavior();
      if (idleBehavior) {
        behaviors.push({ behavior: idleBehavior, source: null });
      }

      // Check mouse off canvas
      const mouseOffBehavior = this.behaviorDetector.detectMouseOffCanvas();
      if (mouseOffBehavior) {
        behaviors.push({ behavior: mouseOffBehavior, source: null });
      }

      // Process each detected behavior
      for (const { behavior, source } of behaviors) {
        const context = this.behaviorDetector.getContext(source);
        const record = this.behaviorDetector.recordBehavior(behavior, context);

        if (record && this.shouldEmitEmotion(record)) {
          this.emitEmotion(record);
        }
      }
    }

    shouldEmitEmotion(rec) {
      if (this.behaviorDetector.suspended) return false;
      if (rec.confidence <= 50) return false;

      const now = Date.now();

      // Check behavior cooldown
      const bt = this.lastBehaviorTime[rec.behavior] || 0;
      const bc = this.behaviorCooldowns[rec.behavior] ?? 1500;
      if (now - bt < bc) return false;

      // Check emotion cooldown
      const et = this.lastEmotionTime[rec.emotion] || 0;
      if (now - et < 5000) return false;

      this.lastBehaviorTime[rec.behavior] = now;
      return true;
    }

    emitEmotion(record) {
      const event = {
        session_id: config.sessionId,
        user_id: null, // Privacy: don't send user ID unless consented
        tenant_id: config.tenantId,
        emotion: record.emotion,
        confidence: record.confidence,
        behavior: record.behavior,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
        metadata: {
          behavior: record.behavior,
          context: {
            element: record.context.element,
            sequence: record.context.sequence
          },
          confidence: record.confidence
        }
      };

      // Queue for potential batch send
      this.pending.push(event);
      if (this.pending.length > 20) {
        this.pending.shift();
      }

      // Process through intent brain
      const intervention = IntentBrain.processEmotion(record.emotion, record.context);
      if (intervention && debugMode) {
        console.log(`🎯 Intervention: ${intervention.type} (score: ${intervention.score})`);
      }

      // Show notification only if not in shadow mode
      const now = Date.now();
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!this.shadowMode && !prefersReducedMotion && (now - this.lastNotificationTime > 60000)) {
        this.showNotification(record.emotion, record.confidence);
        this.lastNotificationTime = now;
      }

      // Track in history
      this.emotionHistory.push({
        emotion: record.emotion,
        timestamp: Date.now(),
        confidence: record.confidence,
        behavior: record.behavior
      });

      if (this.emotionHistory.length > 50) {
        this.emotionHistory.shift();
      }

      // Update last emotion time
      this.lastEmotionTime[record.emotion] = Date.now();

      // Send to API with rate limit awareness
      if (config.apiKey && config.apiKey !== 'sq_demo_v4') {
        // Check if we're rate limited
        const now = Date.now();
        if (this.rateLimitedUntil && now < this.rateLimitedUntil) {
          if (debugMode) {
            console.log('⏳ Rate limited, queuing event');
          }
          return; // Skip sending while rate limited
        }

        try {
          if (debugMode) {
            console.log('📤 Sending to API:', event);
          }
          fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': config.apiKey
            },
            body: JSON.stringify(event),
            keepalive: true
          }).then(res => {
            if (res.status === 429) {
              // Rate limited - back off for 30 seconds
              this.rateLimitedUntil = Date.now() + 30000;
              if (debugMode) {
                console.warn('⚠️ Rate limited! Backing off for 30s');
              }
            } else if (debugMode) {
              console.log('✅ API response:', res.status);
            }
          }).catch(err => {
            if (debugMode) {
              console.error('❌ API error:', err);
            }
          });
        } catch {}
      }

      if (debugMode) {
        console.log(
          `🎯 EMOTION: ${record.emotion} (${Math.round(record.confidence)}% confident)`,
          `via ${record.behavior}`
        );
      }
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

      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);

      banner.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <span style="font-size: 28px;">🧠</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 16px;">
              SentientIQ v4.0 Production
            </div>
            <div style="opacity: 0.8; line-height: 1.4;">
              Emotional forensics engine active.
              ${debugMode ? '<br><span style="color: #667eea;">🔍 Debug mode enabled</span>' : ''}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(banner);

      setTimeout(() => {
        banner.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
        banner.style.transform = 'translateY(100px)';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
      }, 5000);
    }

    showNotification(emotion, confidence) {
      const existing = document.getElementById('sentientiq-notification');
      if (existing) existing.remove();

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

      const emojiMap = {
        frustration: '😤',
        confusion: '🤔',
        interest: '👀',
        satisfaction: '😊',
        purchase_intent: '💳',
        abandonment_risk: '🚪',
        engaged: '✨',
        scanning: '👁️',
        reading: '📖',
        distracted: '💭'
      };

      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">${emojiMap[emotion] || '🎯'}</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">
              ${emotion.replace(/_/g, ' ').charAt(0).toUpperCase() + emotion.slice(1).replace(/_/g, ' ')}
            </div>
            <div style="opacity: 0.9; font-size: 12px;">
              ${confidence}% confidence • SentientIQ v4
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 4000);
    }

    destroy() {
      this.bound.forEach(fn => fn());
      this.behaviorDetector.clearIdleTimer();
      IntentBrain.destroy();
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  window.SentientIQInstance = new EmotionEngine();

  // Public API
  window.SentientIQ = {
    version: '4.1.0',

    getEmotionHistory: () => window.SentientIQInstance.emotionHistory,
    getBehaviorHistory: () => window.SentientIQInstance.behaviorDetector.behaviorHistory,
    getIntentScore: () => IntentBrain.getScore(),

    debug: {
      getBehaviors: () => BEHAVIORS,
      getMapping: () => BEHAVIOR_EMOTION_MAP,
      getModifiers: () => CONTEXT_MODIFIERS,
      getState: () => ({
        suspended: window.SentientIQInstance.behaviorDetector.suspended,
        intentScore: IntentBrain.getScore(),
        shadowMode: window.SentientIQInstance.shadowMode
      })
    },

    // Enable/disable shadow mode at runtime
    setShadowMode: (enabled) => {
      window.SentientIQInstance.shadowMode = enabled;
    },

    destroy: () => {
      window.SentientIQInstance?.destroy();
    }
  };

  // Show banner
  if (debugMode) {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   🧠 SENTIENTIQ v4.0 - PRODUCTION ENGINE             ║
║                                                       ║
║   Emotional forensics via cursor telemetry           ║
║   Visibility-aware • Privacy-safe • Intervention-ready║
║                                                       ║
║   Behaviors: ${Object.keys(BEHAVIORS).length} defined                              ║
║   Emotions: ${new Set(Object.values(BEHAVIOR_EMOTION_MAP).map(m => m.emotion)).size} unique                                 ║
║   State machine: Active                              ║
╚═══════════════════════════════════════════════════════╝
    `);
  }

})();