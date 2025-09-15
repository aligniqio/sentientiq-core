/*
 * SentientIQ Emotion Detection v4.1 (patched, Intent Brain enabled)
 * Behavioral Taxonomy Engine — cursor/scroll/timing emotional inference
 *
 * Key improvements over v4.0:
 *  - Visibility-aware idle suspension (no ghost emotions on tab change)
 *  - Pointer Events support + safer velocity math
 *  - Exit-intent debounced with upward-trend filter
 *  - Context derived per-behavior (elementFromPoint for non-click)
 *  - Per-behavior cooldowns in addition to per-emotion cooldowns
 *  - sendBeacon/keepalive for reliable delivery on unload
 *  - SPA-safe init/destroy; idempotent event binding
 *  - PII hygiene (no apiKey as identity; optional tenantId)
 *  - Minimal "Intent Brain" with hysteresis for intervention gating
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

  // Check for GTM-injected config first, then fallback to script attributes/params
  const apiKey = window.SentientIQ?.apiKey || scriptTag?.getAttribute('data-api-key') || urlParams.get('key') || 'sq_demo_v4';
  const tenantIdAttr = window.SentientIQ?.tenantId || scriptTag?.getAttribute('data-tenant-id') || urlParams.get('tenant') || 'unknown';
  const debugMode = (scriptTag?.getAttribute('data-debug') === 'true') || (urlParams.get('debug') === 'true');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!apiKey) {
    console.error('SentientIQ: No API key provided');
    return;
  }

  const sessionId = (window.crypto?.randomUUID?.() || `sq_${Date.now()}_${Math.random().toString(36).slice(2,9)}`);

  const config = {
    apiEndpoint: 'https://api.sentientiq.app/api/emotional/event',
    apiKey: apiKey,
    sessionId: sessionId,
    tenantId: tenantIdAttr,
    debug: debugMode,
    ui: { showBanners: debugMode && !reduceMotion },
    cadenceMs: 2000, // processing cadence (2 seconds to reduce noise)
    intentBrain: true // ✅ enabled by default
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
    HESITATION: 'hesitation',
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
    [BEHAVIORS.HESITATION]: { emotion: 'hesitation', confidence: 75 },
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
  // UTILITIES
  // ==========================================

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function safeElementRole(el) {
    try {
      if (!el) return null;
      const root = el.closest?.('[data-sq-role], button, nav, form, .price, .pricing, [role="navigation"], [href*="pricing"], [href*="price"]');
      if (!root) return null;
      // Check for pricing elements including navigation links
      if (root.matches?.('[data-sq-role="price"], .price, .pricing, [href*="pricing"], [href*="price"]')) return 'PRICE_ELEMENT';
      if (root.textContent?.toLowerCase().includes('pricing') || root.textContent?.toLowerCase().includes('price')) return 'PRICE_ELEMENT';
      if (root.matches?.('button,[role="button"]')) return 'CTA_BUTTON';
      if (root.matches?.('nav,[role="navigation"]')) return 'NAVIGATION';
      if (root.closest?.('input,textarea,select,form')) return 'FORM_FIELD';
      return null;
    } catch { return null; }
  }

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
      this.behaviorHistory = [];
      this.mouseOffCanvas = false;
      this.mouseOffCanvasStart = null;
      this.hoverStart = null;
      this.hoverElement = null;
      this.suspended = false; // visibility-aware
    }

    clearIdleTimer() { if (this.idleTimer) clearTimeout(this.idleTimer); this.idleTimer = null; }

    resetActivity() {
      this.lastActivity = Date.now();
      this.clearIdleTimer();
      // Start short idle watcher; long idle is checked in detectIdleBehavior
      this.idleTimer = setTimeout(() => {
        const idle = this.detectIdleBehavior();
        if (idle) this.recordBehavior(idle, {});
      }, 3000);
    }

    detectClickBehavior(clicks) {
      const now = Date.now();
      const recentClicks = clicks.filter(c => now - c.t < 1000);

      if (recentClicks.length >= 3) {
        const firstClick = recentClicks[0];
        const isRageClick = recentClicks.every(click => {
          const dist = Math.hypot(click.x - firstClick.x, click.y - firstClick.y);
          return dist < 50;
        });
        if (isRageClick) {
          if (config.debug) console.log(`🔥 Rage click detected: ${recentClicks.length} clicks`);
          return { type: BEHAVIORS.RAGE_CLICK, confidence: clamp(90 + (recentClicks.length * 2), 0, 95), _source: { kind:'click', ...firstClick } };
        }
        return { type: BEHAVIORS.EXPLORATORY_CLICK, confidence: 65, _source: { kind:'click', ...recentClicks.at(-1) } };
      }

      if (recentClicks.length === 2 && (recentClicks[1].t - recentClicks[0].t) < 500) {
        return { type: BEHAVIORS.DOUBLE_CLICK, confidence: 50, _source: { kind:'click', ...recentClicks[1] } };
      }

      if (recentClicks.length === 1) {
        return { type: BEHAVIORS.SINGLE_CLICK, confidence: 40, _source: { kind:'click', ...recentClicks[0] } };
      }

      return null;
    }

    detectMoveBehavior(moves) {
      if (moves.length < 3) return null;
      const recent = moves.slice(-5);
      const avgVelocity = recent.reduce((sum, m) => sum + m.v, 0) / recent.length;

      // Shake: rapid horizontal direction changes
      let directionChanges = 0;
      for (let i = 2; i < recent.length; i++) {
        const dx1 = recent[i-0].x - recent[i-1].x;
        const dx2 = recent[i-1].x - recent[i-2].x;
        if (dx1 * dx2 < 0) directionChanges++;
      }
      if (directionChanges >= 3) {
        if (config.debug) console.log('🔀 Mouse shake detected');
        return { type: BEHAVIORS.SHAKE, confidence: 85, _source: { kind:'move', x: recent.at(-1).x, y: recent.at(-1).y } };
      }

      // Exit intent: sustained upward trend near top + brisk
      const last = recent.at(-1);
      const upwardStreak = recent.slice(-4).every((m,i,a) => i===0 || a[i].y < a[i-1].y);
      if (last.y < 8 && upwardStreak && avgVelocity > 12 && !document.hidden) {
        if (config.debug) console.log('🚪 Exit intent detected');
        return { type: BEHAVIORS.EXIT_INTENT, confidence: 85, _source: { kind:'move', x: last.x, y: last.y } };
      }

      // Hover: low velocity over same element
      if (avgVelocity < 0.5) {
        const element = document.elementFromPoint(last.x, last.y);
        if (element && element !== document.body && element !== document.documentElement) {
          if (!this.hoverStart || element !== this.hoverElement) {
            this.hoverStart = Date.now();
            this.hoverElement = element;
          } else {
            const hoverDuration = Date.now() - this.hoverStart;
            if (hoverDuration > 1000) {
              if (config.debug) console.log(`👀 Hover detected for ${hoverDuration}ms`);
              // Long hover (3+ seconds) = hesitation, especially on pricing
              if (hoverDuration > 3000) {
                const elementRole = safeElementRole(element);
                const confidence = elementRole === 'PRICE_ELEMENT' ? 85 : 75;
                return { type: BEHAVIORS.HESITATION, confidence, _source: { kind:'move', x: last.x, y: last.y } };
              }
              // Short hover (1-3 seconds) = interest
              return { type: BEHAVIORS.HOVER, confidence: clamp(60 + Math.min(30, hoverDuration / 100), 0, 95), _source: { kind:'move', x: last.x, y: last.y } };
            }
          }
        }
      } else {
        this.hoverStart = null; this.hoverElement = null;
      }

      // Velocity buckets (require minimum movement distance to avoid noise)
      const totalDistance = recent.reduce((sum, p, i) => {
        if (i === 0) return 0;
        const dx = p.x - recent[i-1].x;
        const dy = p.y - recent[i-1].y;
        return sum + Math.sqrt(dx*dx + dy*dy);
      }, 0);

      // Only emit drift/scan if there's meaningful movement
      if (totalDistance > 50) {
        if (avgVelocity < 0.3) return { type: BEHAVIORS.DRIFT, confidence: 55, _source: { kind:'move', x: last.x, y: last.y } };
        if (avgVelocity > 5 && avgVelocity < 15) return { type: BEHAVIORS.SCAN, confidence: 60, _source: { kind:'move', x: last.x, y: last.y } };
      }
      return null;
    }

    detectScrollBehavior(scrolls) {
      if (scrolls.length < 2) return null;
      const recent = scrolls.slice(-10);
      const avgVelocity = recent.reduce((s, sc) => s + Math.abs(sc.v), 0) / recent.length;

      let directionChanges = 0;
      for (let i = 1; i < recent.length; i++) if (recent[i].v * recent[i-1].v < 0) directionChanges++;

      if (directionChanges >= 3) { if (config.debug) console.log('🎯 Scroll hunt detected'); return { type: BEHAVIORS.SCROLL_HUNT, confidence: 70, _source: { kind:'scroll' } }; }
      if (directionChanges === 1 && recent.length < 5) return { type: BEHAVIORS.SCROLL_REVERSAL, confidence: 70, _source: { kind:'scroll' } };

      if (avgVelocity < 0.5) return { type: BEHAVIORS.SLOW_SCROLL, confidence: 80, _source: { kind:'scroll' } };
      if (avgVelocity < 2) return { type: BEHAVIORS.NORMAL_SCROLL, confidence: 60, _source: { kind:'scroll' } };
      if (avgVelocity < 10) return { type: BEHAVIORS.FAST_SCROLL, confidence: 65, _source: { kind:'scroll' } };
      return { type: BEHAVIORS.SKIM_SCROLL, confidence: 75, _source: { kind:'scroll' } };
    }

    detectIdleBehavior() {
      const idleTime = Date.now() - this.lastActivity;
      if (this.suspended) return null;
      if (idleTime > 60000) return { type: BEHAVIORS.ABANDONED, confidence: 95 };
      if (idleTime > 30000) return { type: BEHAVIORS.IDLE_LONG, confidence: 70 };
      if (idleTime > 10000) return { type: BEHAVIORS.IDLE_SHORT, confidence: 50 };
      return null;
    }

    detectMouseOffCanvas() {
      if (this.mouseOffCanvas && this.mouseOffCanvasStart) {
        const duration = Date.now() - this.mouseOffCanvasStart;
        if (duration > 3000) { if (config.debug) console.log(`🚪 Mouse off canvas for ${duration}ms`); return { type: BEHAVIORS.MOUSE_OFF_SUSTAINED, confidence: 75 }; }
        if (duration > 500) return { type: BEHAVIORS.MOUSE_OFF_BRIEF, confidence: 45 };
      }
      return null;
    }

    getContext(source) {
      let el = null;
      if (source?.kind === 'click') el = source.target;
      else if (source?.kind === 'move' && source.x != null && source.y != null) el = document.elementFromPoint(source.x, source.y);
      else if (source?.kind === 'scroll') {
        // Use a point near center-top as reading focus proxy
        const x = Math.floor(window.innerWidth / 2);
        const y = Math.max(80, Math.floor(window.innerHeight * 0.25));
        el = document.elementFromPoint(x, y);
      }

      const context = { element: safeElementRole(el), sequence: null };

      const lastBehavior = this.behaviorHistory.at(-1);
      if (lastBehavior?.emotion === 'frustration' && (Date.now() - lastBehavior.timestamp) < 5000) {
        context.sequence = 'AFTER_FRUSTRATION';
      }
      return context;
    }

    recordBehavior(behavior, context) {
      const mapping = BEHAVIOR_EMOTION_MAP[behavior.type];
      if (!mapping) return null;
      let emotion = mapping.emotion;
      let confidence = behavior.confidence || mapping.confidence;

      // Apply context modifiers
      if (context.element && CONTEXT_MODIFIERS[context.element]) {
        const modifier = CONTEXT_MODIFIERS[context.element];
        if (modifier.becomes && modifier.emotions.includes(emotion)) emotion = modifier.becomes;
        if (modifier.boost) confidence = Math.min(95, confidence + modifier.boost);
      }
      if (context.sequence && CONTEXT_MODIFIERS[context.sequence]) {
        const modifier = CONTEXT_MODIFIERS[context.sequence];
        confidence = Math.min(95, confidence + modifier.boost);
      }

      const record = { behavior: behavior.type, emotion, confidence, timestamp: Date.now(), context };
      this.behaviorHistory.push(record);
      if (this.behaviorHistory.length > 100) this.behaviorHistory.shift();

      if (config.debug) console.log(`📊 Behavior: ${behavior.type} → ${emotion} (${confidence}% confidence)`);
      return record;
    }
  }

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
        hover: 2000, hesitation: 5000, shake: 5000, rage_click: 8000, exit_intent: 7000,
        slow_scroll: 2000, normal_scroll: 1500, fast_scroll: 2000, skim_scroll: 3000,
        scroll_reversal: 2500, scroll_hunt: 4000,
        single_click: 1200, double_click: 1500,
        idle_short: 4000, idle_long: 6000, abandoned: 12000,
        mouse_off_brief: 3000, mouse_off_sustained: 8000
      };
      this.pending = [];
      this.bound = [];

      this.init();
    }

    // ---------- binding helpers ----------
    on(el, evt, fn, opts) { el.addEventListener(evt, fn, opts); this.bound.push(() => el.removeEventListener(evt, fn, opts)); }
    destroy() { this.bound.forEach(fn => fn()); this.behaviorDetector.clearIdleTimer(); if (this._interval) clearInterval(this._interval); }

    init() {
      if (config.debug) {
        console.log('🚀 SentientIQ v4.1 initialized');
        console.log('📊 Behavioral Taxonomy Engine active');
        console.log('🔑 API Key:', (config.apiKey||'').toString().substring(0, 20) + '...');
      }

      if (config.ui.showBanners) this.showInitBanner();
      this.initListeners();

      // Enable optional intent brain when configured
      if (config.intentBrain && !this.intentBrainEnabled) {
        try { this.enableIntentBrain(); } catch (e) { if (config.debug) console.warn('Intent brain init failed', e); }
      }

      // Process behaviors on cadence
      this._interval = setInterval(() => this.processBehaviors(), config.cadenceMs);

      // Visibility-aware suspension
      this.on(document, 'visibilitychange', () => {
        const hidden = document.visibilityState === 'hidden';
        this.behaviorDetector.suspended = hidden;
        if (hidden) this.behaviorDetector.clearIdleTimer(); else this.behaviorDetector.resetActivity();
      });

      // Beacon on unload
      const flush = () => {
        if (!this.pending.length) return;
        try {
          const blob = new Blob([JSON.stringify(this.pending)], { type: 'application/json' });
          if (navigator.sendBeacon) navigator.sendBeacon(config.apiEndpoint, blob);
          this.pending.length = 0;
        } catch {}
      };
      this.on(window, 'pagehide', flush, { passive: true });
      this.on(window, 'beforeunload', flush, { passive: true });
    }

    initListeners() {
      // CLICK
      this.on(document, 'click', (e) => {
        const click = { x: e.clientX, y: e.clientY, t: Date.now(), target: e.target };
        const h = this.behaviorDetector.clickHistory; h.push(click); if (h.length > 24) h.shift();
        this.behaviorDetector.resetActivity();
        if (config.debug) console.log('🖱️ Click:', { x: click.x, y: click.y });
      }, { passive: true });

      // POINTER MOVE (works for mouse/stylus/touch)
      let lastMoveTime = 0;
      this.on(document, 'pointermove', (e) => {
        const now = Date.now();
        if (now - lastMoveTime < 16) return; // ~60fps throttle
        const dt = Math.max(now - lastMoveTime, 16);
        const prev = this.behaviorDetector.moveHistory.at(-1);
        const dist = prev ? Math.hypot(e.clientX - prev.x, e.clientY - prev.y) : 0;
        const move = { x: e.clientX, y: e.clientY, t: now, v: dist / (dt / 100) };
        const mh = this.behaviorDetector.moveHistory; mh.push(move); if (mh.length > 60) mh.shift();
        this.behaviorDetector.resetActivity();
        this.behaviorDetector.mouseOffCanvas = false;
        this.behaviorDetector.mouseOffCanvasStart = null;
        lastMoveTime = now;
      }, { passive: true });

      // POINTER LEAVE/ENTER
      this.on(window, 'pointerleave', () => {
        this.behaviorDetector.mouseOffCanvas = true;
        this.behaviorDetector.mouseOffCanvasStart = Date.now();
        if (config.debug) console.log('🚪 Pointer left viewport');
      }, { passive: true });

      this.on(window, 'pointerenter', () => {
        if (this.behaviorDetector.mouseOffCanvas && this.behaviorDetector.mouseOffCanvasStart && config.debug) {
          console.log(`🔙 Pointer returned after ${Date.now() - this.behaviorDetector.mouseOffCanvasStart}ms`);
        }
        this.behaviorDetector.mouseOffCanvas = false;
        this.behaviorDetector.mouseOffCanvasStart = null;
      }, { passive: true });

      // SCROLL
      let lastScrollTime = 0; let lastScrollY = window.scrollY;
      this.on(window, 'scroll', () => {
        const now = Date.now();
        if (now - lastScrollTime < 50) return; // throttle
        const scrollY = window.scrollY;
        const dt = Math.max(now - lastScrollTime, 16);
        const velocity = (scrollY - lastScrollY) / (dt / 100);
        const sh = this.behaviorDetector.scrollHistory; sh.push({ y: scrollY, t: now, v: velocity }); if (sh.length > 60) sh.shift();
        this.behaviorDetector.resetActivity();
        lastScrollY = scrollY; lastScrollTime = now;
      }, { passive: true });
    }

    processBehaviors() {
      if (this.behaviorDetector.suspended) return;

      const behaviors = [];

      const clickBehavior = this.behaviorDetector.detectClickBehavior(this.behaviorDetector.clickHistory);
      if (clickBehavior) behaviors.push(clickBehavior);

      const moveBehavior = this.behaviorDetector.detectMoveBehavior(this.behaviorDetector.moveHistory);
      if (moveBehavior) behaviors.push(moveBehavior);

      const scrollBehavior = this.behaviorDetector.detectScrollBehavior(this.behaviorDetector.scrollHistory);
      if (scrollBehavior) behaviors.push(scrollBehavior);

      const idleBehavior = this.behaviorDetector.detectIdleBehavior();
      if (idleBehavior) behaviors.push(idleBehavior);

      const mouseOffBehavior = this.behaviorDetector.detectMouseOffCanvas();
      if (mouseOffBehavior) behaviors.push(mouseOffBehavior);

      for (const behavior of behaviors) {
        const context = this.behaviorDetector.getContext(behavior._source);
        const record = this.behaviorDetector.recordBehavior(behavior, context);
        if (record && this.shouldEmitEmotion(record)) this.emitEmotion(record);
      }
    }

    shouldEmitEmotion(record) {
      // Confidence threshold
      if (record.confidence <= 50) return false;

      // Per-behavior cooldown
      const now = Date.now();
      const bt = this.lastBehaviorTime[record.behavior] || 0;
      const bc = this.behaviorCooldowns[record.behavior] ?? 1500;
      if (now - bt < bc) return false;

      // Per-emotion cooldown (increased to 10 seconds to reduce spam)
      const et = this.lastEmotionTime[record.emotion] || 0;
      if (now - et < 10000) return false;

      this.lastBehaviorTime[record.behavior] = now;
      return true;
    }

    emitEmotion(record) {
      const event = {
        session_id: config.sessionId,
        user_id: null, // do not send PII; fill with consented hashed ID if available
        tenant_id: config.tenantId,
        emotion: record.emotion,
        confidence: record.confidence,
        behavior: record.behavior,
        page_url: location.href,
        timestamp: new Date().toISOString(),
        metadata: {
          behavior: record.behavior,
          context: { element: record.context.element, sequence: record.context.sequence },
          ua: navigator.userAgent
        }
      };

      // Track in history
      this.emotionHistory.push({ emotion: record.emotion, timestamp: Date.now(), confidence: record.confidence, behavior: record.behavior });
      if (this.emotionHistory.length > 60) this.emotionHistory.shift();

      // Update last emotion time
      this.lastEmotionTime[record.emotion] = Date.now();

      // UI (debug only)
      if (config.ui.showBanners) this.showNotification(record.emotion, Math.round(record.confidence));

      // Send to API (always send for demo key during testing)
      if (config.apiKey) {
        this.pending.push(event); if (this.pending.length > 50) this.pending.shift();
        try {
          fetch(config.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': config.apiKey },
            body: JSON.stringify(event),
            keepalive: true
          }).catch(() => {});
        } catch {}
      }

      if (config.debug) console.log(`🎯 EMOTION: ${record.emotion} (${Math.round(record.confidence)}% via ${record.behavior})`);

      // Optional: pipe into simple intent brain
      if (config.intentBrain && typeof this.intentOnEmotion === 'function') {
        try { this.intentOnEmotion({ emotion: record.emotion, behavior: record.behavior, context: record.context }); } catch {}
      }
    }

    showInitBanner() {
      try {
        const banner = document.createElement('div');
        banner.id = 'sentientiq-init-banner';
        banner.style.cssText = `position:fixed;bottom:20px;left:20px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;padding:20px 24px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;z-index:999999;animation:slideUp .4s ease-out;max-width:360px;border:1px solid rgba(102,126,234,.3);`;
        const style = document.createElement('style');
        style.textContent = `@keyframes slideUp{from{transform:translateY(100px);opacity:0}to{transform:translateY(0);opacity:1}}`;
        document.head.appendChild(style);
        banner.innerHTML = `
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:28px;">🧠</span>
            <div>
              <div style="font-weight:600;margin-bottom:8px;font-size:16px;">SentientIQ v4.1 Active</div>
              <div style="opacity:.8;line-height:1.4;">Behavioral taxonomy engine monitoring user experience.${config.debug ? '<br><span style="color:#667eea;">🔍 Debug mode enabled</span>' : ''}</div>
            </div>
          </div>`;
        document.body.appendChild(banner);
        setTimeout(() => { banner.style.transition='transform .3s ease-in, opacity .3s ease-in'; banner.style.transform='translateY(100px)'; banner.style.opacity='0'; setTimeout(()=>banner.remove(), 300); }, 5000);
      } catch {}
    }

    showNotification(emotion, confidence) {
      try {
        const existing = document.getElementById('sentientiq-notification'); if (existing) existing.remove();
        const note = document.createElement('div');
        note.id = 'sentientiq-notification';
        note.style.cssText = `position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:16px 24px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.2);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;z-index:999999;animation:slideIn .3s ease-out;max-width:320px;`;
        const emojiMap = { frustration:'😤', confusion:'🤔', interest:'👀', satisfaction:'😊', purchase_intent:'💳', abandonment_risk:'🚪', engaged:'✨', scanning:'👁️', reading:'📖', distracted:'💭', hesitation:'🤷' };
        note.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:24px;">${emojiMap[emotion] || '🎯'}</span>
            <div>
              <div style="font-weight:600;margin-bottom:4px;">${emotion.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase())}</div>
              <div style="opacity:.9;font-size:12px;">${confidence}% confidence • SentientIQ v4.1</div>
            </div>
          </div>`;
        document.body.appendChild(note);
        setTimeout(() => { note.style.transition='transform .3s ease-in, opacity .3s ease-in'; note.style.transform='translateX(400px)'; note.style.opacity='0'; setTimeout(()=>note.remove(), 300); }, 4000);
      } catch {}
    }

    // ---------- Minimal Intent Brain with hysteresis ----------
    enableIntentBrain() {
      const self = this;
      let score = 0, lockedUntil = 0, last = Date.now();
      const add = (v) => { score = clamp(score + v, 0, 100); };
      const decay = () => { const now = Date.now(); const dt = (now - last) / 1000; score = Math.max(0, score - dt * 2.5); last = now; };
      const tick = () => {
        decay(); if (Date.now() < lockedUntil) return null;
        if (score >= 75) { lockedUntil = Date.now() + 15000; return 'offer_help_or_incentive'; }
        if (score >= 60) { lockedUntil = Date.now() + 8000; return 'micro_assist_tooltip'; }
        return null;
      };
      this.intentOnEmotion = ({ emotion, behavior, context }) => {
        const boost = { interest:+8, engaged:+6, purchase_intent:+15, scanning:+3, reading:+2, confusion:-6, frustration:-10, abandonment_risk:-15 }[emotion] ?? 0;
        const ctx = (context?.element === 'PRICE_ELEMENT') ? +6 : (context?.element === 'CTA_BUTTON') ? +4 : 0;
        add(boost + ctx);
        const action = tick(); if (!action) return;
        if (config.debug) console.log('🧭 Intent action:', action, 'score=', Math.round(score));
        // hook for userland: window.SentientIQ?.actions?.[action]?.();
      };
      this.intentBrainEnabled = true;
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  // Avoid double init in SPAs
  if (window.SentientIQInstance?.destroy) {
    try { window.SentientIQInstance.destroy(); } catch {}
  }
  window.SentientIQInstance = new EmotionEngine();

  // Public API
  window.SentientIQ = {
    version: '4.1.0',
    enableIntentBrain: () => window.SentientIQInstance.enableIntentBrain(),
    getEmotionHistory: () => window.SentientIQInstance.emotionHistory,
    getBehaviorHistory: () => window.SentientIQInstance.behaviorDetector.behaviorHistory,
    destroy: () => window.SentientIQInstance.destroy(),
    debug: {
      getBehaviors: () => BEHAVIORS,
      getMapping: () => BEHAVIOR_EMOTION_MAP,
      getModifiers: () => CONTEXT_MODIFIERS
    },
    actions: { /* user can register handlers keyed by intent action names */ }
  };

  if (config.debug) {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   🧠 SENTIENTIQ v4.1 - BEHAVIORAL TAXONOMY ENGINE    ║
║   Intent Brain: ENABLED                               ║
║                                                       ║
║   One behavior → primary emotion                      ║
║   Context modifies confidence, not emotion            ║
║   Visibility-aware; pointer events; beacons           ║
║                                                       ║
║   Behaviors: ${Object.keys(BEHAVIORS).length} defined
║   Emotions: ${new Set(Object.values(BEHAVIOR_EMOTION_MAP).map(m => m.emotion)).size} unique
╚═══════════════════════════════════════════════════════╝
    `);
  }
})();