/**
 * SentientIQ Emotion Detection v4.0
 * Behavioral Taxonomy Engine
 *
 * Complete behavioral mapping with temporal context
 * Each behavior maps to ONE primary emotion with confidence modifiers
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
    sessionId: `sq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
    }

    detectClickBehavior(clicks) {
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
      if (moves.length < 3) return null;

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

      // Check for exit intent
      const lastMove = recent[recent.length - 1];
      if (lastMove.y < 20 && avgVelocity > 10) {
        if (debugMode) {
          console.log('🚪 Exit intent detected');
        }
        return { type: BEHAVIORS.EXIT_INTENT, confidence: 85 };
      }

      // Hover detection (stationary over element)
      if (avgVelocity < 0.5) {
        // Check if hovering over something meaningful
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
      if (scrolls.length < 2) return null;

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

    getContext(event) {
      const element = event?.target;
      const context = {
        element: null,
        duration: null,
        sequence: null
      };

      if (element) {
        // Check element type
        if (element.textContent?.includes('$') || element.closest('.price')) {
          context.element = 'PRICE_ELEMENT';
        } else if (element.tagName === 'BUTTON' || element.closest('button')) {
          context.element = 'CTA_BUTTON';
        } else if (element.closest('nav') || element.closest('[role="navigation"]')) {
          context.element = 'NAVIGATION';
        } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          context.element = 'FORM_FIELD';
        }
      }

      // Check recent emotion history for sequence
      if (this.behaviorHistory.length > 0) {
        const lastBehavior = this.behaviorHistory[this.behaviorHistory.length - 1];
        if (lastBehavior.emotion === 'frustration' && (Date.now() - lastBehavior.timestamp) < 5000) {
          context.sequence = 'AFTER_FRUSTRATION';
        }
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
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }

      this.idleTimer = setTimeout(() => {
        const idle = this.detectIdleBehavior();
        if (idle) {
          this.recordBehavior(idle, {});
        }
      }, 3000);
    }
  }

  // ==========================================
  // EMOTION ENGINE
  // ==========================================

  class EmotionEngine {
    constructor() {
      this.behaviorDetector = new BehaviorDetector();
      this.emotionHistory = [];
      this.lastEmotionTime = {};
      this.init();
    }

    init() {
      if (debugMode) {
        console.log('🚀 SentientIQ v4.0 initialized');
        console.log('📊 Behavioral Taxonomy Engine active');
        console.log('🔑 API Key:', config.apiKey.substring(0, 20) + '...');
      }

      this.showInitBanner();
      this.initListeners();

      // Process behaviors every second
      setInterval(() => this.processBehaviors(), 1000);
    }

    initListeners() {
      // Click tracking
      document.addEventListener('click', (e) => {
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
      });

      // Mouse movement tracking
      let lastMoveTime = 0;
      document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMoveTime < 50) return; // Throttle

        const move = {
          x: e.clientX,
          y: e.clientY,
          t: now,
          v: this.behaviorDetector.moveHistory.length > 0
            ? Math.sqrt(
                Math.pow(e.clientX - this.behaviorDetector.moveHistory[this.behaviorDetector.moveHistory.length-1].x, 2) +
                Math.pow(e.clientY - this.behaviorDetector.moveHistory[this.behaviorDetector.moveHistory.length-1].y, 2)
              ) / ((now - lastMoveTime) / 100)
            : 0
        };

        this.behaviorDetector.moveHistory.push(move);
        if (this.behaviorDetector.moveHistory.length > 50) {
          this.behaviorDetector.moveHistory.shift();
        }

        this.behaviorDetector.resetActivity();
        this.behaviorDetector.mouseOffCanvas = false;
        this.behaviorDetector.mouseOffCanvasStart = null;
        lastMoveTime = now;
      });

      // Mouse leave tracking
      document.addEventListener('mouseleave', () => {
        this.behaviorDetector.mouseOffCanvas = true;
        this.behaviorDetector.mouseOffCanvasStart = Date.now();

        if (debugMode) {
          console.log('🚪 Mouse left viewport');
        }
      });

      document.addEventListener('mouseenter', () => {
        if (this.behaviorDetector.mouseOffCanvas && this.behaviorDetector.mouseOffCanvasStart) {
          const duration = Date.now() - this.behaviorDetector.mouseOffCanvasStart;
          if (debugMode) {
            console.log(`🔙 Mouse returned after ${duration}ms`);
          }
        }
        this.behaviorDetector.mouseOffCanvas = false;
        this.behaviorDetector.mouseOffCanvasStart = null;
      });

      // Scroll tracking
      let lastScrollTime = 0;
      let lastScrollY = window.scrollY;
      document.addEventListener('scroll', () => {
        const now = Date.now();
        if (now - lastScrollTime < 100) return; // Throttle

        const scrollY = window.scrollY;
        const velocity = (scrollY - lastScrollY) / ((now - lastScrollTime) / 100);

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
      });
    }

    processBehaviors() {
      const behaviors = [];

      // Check click behaviors
      const clickBehavior = this.behaviorDetector.detectClickBehavior(this.behaviorDetector.clickHistory);
      if (clickBehavior) behaviors.push(clickBehavior);

      // Check move behaviors
      const moveBehavior = this.behaviorDetector.detectMoveBehavior(this.behaviorDetector.moveHistory);
      if (moveBehavior) behaviors.push(moveBehavior);

      // Check scroll behaviors
      const scrollBehavior = this.behaviorDetector.detectScrollBehavior(this.behaviorDetector.scrollHistory);
      if (scrollBehavior) behaviors.push(scrollBehavior);

      // Check idle behavior
      const idleBehavior = this.behaviorDetector.detectIdleBehavior();
      if (idleBehavior) behaviors.push(idleBehavior);

      // Check mouse off canvas
      const mouseOffBehavior = this.behaviorDetector.detectMouseOffCanvas();
      if (mouseOffBehavior) behaviors.push(mouseOffBehavior);

      // Process each detected behavior
      for (const behavior of behaviors) {
        const context = this.behaviorDetector.getContext({
          target: this.behaviorDetector.clickHistory[this.behaviorDetector.clickHistory.length - 1]?.target
        });

        const record = this.behaviorDetector.recordBehavior(behavior, context);
        if (record && this.shouldEmitEmotion(record)) {
          this.emitEmotion(record);
        }
      }
    }

    shouldEmitEmotion(record) {
      // Prevent emotion spam - same emotion needs cooldown
      const lastTime = this.lastEmotionTime[record.emotion];
      if (lastTime && (Date.now() - lastTime) < 5000) {
        return false;
      }

      // Confidence threshold
      return record.confidence > 50;
    }

    emitEmotion(record) {
      const event = {
        session_id: config.sessionId,
        user_id: config.apiKey,
        tenant_id: config.apiKey,
        emotion: record.emotion,
        confidence: record.confidence,
        behavior: record.behavior,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
        metadata: {
          behavior: record.behavior,
          context: record.context,
          confidence: record.confidence
        }
      };

      // Show notification
      this.showNotification(record.emotion, record.confidence);

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

      // Send to API
      if (config.apiKey && config.apiKey !== 'sq_demo_v4') {
        fetch(config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.apiKey
          },
          body: JSON.stringify(event)
        }).catch(err => {
          if (debugMode) {
            console.error('Failed to send emotion:', err);
          }
        });
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
              SentientIQ v4.0 Active
            </div>
            <div style="opacity: 0.8; line-height: 1.4;">
              Behavioral taxonomy engine monitoring user experience.
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
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  window.SentientIQInstance = new EmotionEngine();

  // Public API
  window.SentientIQ = {
    version: '4.0.0',

    getEmotionHistory: () => window.SentientIQInstance.emotionHistory,
    getBehaviorHistory: () => window.SentientIQInstance.behaviorDetector.behaviorHistory,

    debug: {
      getBehaviors: () => BEHAVIORS,
      getMapping: () => BEHAVIOR_EMOTION_MAP,
      getModifiers: () => CONTEXT_MODIFIERS
    }
  };

  // Show banner
  if (debugMode) {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   🧠 SENTIENTIQ v4.0 - BEHAVIORAL TAXONOMY ENGINE    ║
║                                                       ║
║   Every behavior mapped to primary emotion           ║
║   Context modifies confidence, not emotion           ║
║   Temporal patterns detected automatically           ║
║                                                       ║
║   Behaviors: ${Object.keys(BEHAVIORS).length} defined
║   Emotions: ${new Set(Object.values(BEHAVIOR_EMOTION_MAP).map(m => m.emotion)).size} unique
╚═══════════════════════════════════════════════════════╝
    `);
  }

})();