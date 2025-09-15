/**
 * SentientIQ Telemetry v5.0 - Hybrid Approach
 * Lean behavioral telemetry collector - no emotion diagnosis
 * ~200 lines instead of 700+
 */

(function() {
  'use strict';

  // Configuration
  const scriptTag = document.currentScript || document.querySelector('script[src*="telemetry"]');
  const config = {
    endpoint: (window.SentientIQ?.apiEndpoint ? window.SentientIQ.apiEndpoint + '/api/telemetry/stream' : 'https://api.sentientiq.app/api/telemetry/stream'),
    apiKey: window.SentientIQ?.apiKey || scriptTag?.getAttribute('data-api-key') || 'sq_demo_v5',
    tenantId: window.SentientIQ?.tenantId || scriptTag?.getAttribute('data-tenant-id') || 'unknown',
    sessionId: `sq_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    batchSize: 20,
    flushInterval: 1000, // Send every second
    debug: scriptTag?.getAttribute('data-debug') === 'true'
  };

  // Telemetry buffer
  const buffer = [];
  let lastFlush = Date.now();
  let flushTimer = null;

  // State tracking
  const state = {
    lastClick: { x: 0, y: 0, t: 0 },
    lastMove: { x: 0, y: 0, t: 0, v: 0 },
    lastScroll: { y: 0, t: 0 },
    clickSequence: [],
    hoverStart: null,
    hoverElement: null,
    mouseOffCanvas: false,
    suspended: false,
    velocityHistory: [], // Track velocity for deceleration detection
    exitDirection: null // Track where mouse left viewport
  };

  // Record telemetry event
  function record(type, data) {
    if (state.suspended) return;

    const event = {
      t: Date.now(),
      type,
      ...data,
      url: window.location.href,
      vp: { w: window.innerWidth, h: window.innerHeight } // viewport
    };

    // Add element context if available
    if (data.el) {
      const el = typeof data.el === 'string' ? document.querySelector(data.el) : data.el;
      if (el) {
        event.ctx = getElementContext(el);
        delete event.el; // Don't send the element itself
      }
    }

    buffer.push(event);

    // Auto-flush if buffer is full
    if (buffer.length >= config.batchSize) {
      flush();
    }
  }

  // Get element context (what user is interacting with)
  function getElementContext(el) {
    const ctx = {};

    // Element type
    if (el.tagName) ctx.tag = el.tagName.toLowerCase();

    // Special elements
    if (el.href) ctx.href = el.href;
    if (el.classList.contains('price') || el.classList.contains('pricing')) ctx.pricing = true;
    if (el.type === 'submit' || el.role === 'button') ctx.cta = true;

    // Cart/checkout detection
    const cartIndicators = ['cart', 'basket', 'checkout', 'payment', 'shipping', 'billing'];
    const elementText = (el.textContent + ' ' + el.className + ' ' + el.id).toLowerCase();
    if (cartIndicators.some(indicator => elementText.includes(indicator))) {
      ctx.cart = true;
      // Detect specific cart stage
      if (elementText.includes('checkout') || elementText.includes('payment')) ctx.stage = 'checkout';
      else if (elementText.includes('shipping')) ctx.stage = 'shipping';
      else if (elementText.includes('billing')) ctx.stage = 'billing';
      else ctx.stage = 'cart';
    }

    // Form field detection (critical for checkout forms)
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
      ctx.form = true;
      ctx.fieldType = el.type;
      ctx.fieldName = el.name || el.id;
    }

    // Text content (first 50 chars)
    const text = el.textContent?.trim().slice(0, 50);
    if (text) ctx.text = text;

    // Data attributes
    if (el.dataset.sqRole) ctx.role = el.dataset.sqRole;

    return ctx;
  }

  // Detect click patterns
  function processClick(x, y, target) {
    const now = Date.now();
    const timeSinceLastClick = now - state.lastClick.t;
    const distance = Math.hypot(x - state.lastClick.x, y - state.lastClick.y);

    // Track click sequence for rage detection
    if (timeSinceLastClick < 1000 && distance < 50) {
      state.clickSequence.push({ x, y, t: now });
    } else {
      state.clickSequence = [{ x, y, t: now }];
    }

    // Record behavior, not emotion
    const behavior = state.clickSequence.length >= 3 ? 'rage_click' :
                     timeSinceLastClick < 500 ? 'double_click' : 'click';

    record(behavior, {
      x, y,
      count: state.clickSequence.length,
      el: target
    });

    state.lastClick = { x, y, t: now };
  }

  // Detect movement patterns
  function processMove(x, y) {
    const now = Date.now();
    const dt = now - state.lastMove.t;
    if (dt < 50) return; // Throttle to 20Hz

    const distance = Math.hypot(x - state.lastMove.x, y - state.lastMove.y);
    const velocity = distance / (dt / 100);

    // Track velocity history for deceleration detection
    state.velocityHistory.push({ v: velocity, t: now });
    if (state.velocityHistory.length > 10) state.velocityHistory.shift();

    // Detect sudden deceleration (sticker shock indicator)
    if (state.velocityHistory.length >= 3) {
      const recent = state.velocityHistory.slice(-3);
      const avgRecent = recent.reduce((sum, h) => sum + h.v, 0) / 3;
      const avgPrevious = state.lastMove.v || avgRecent;

      // Sudden deceleration (>70% drop in velocity)
      if (avgPrevious > 10 && avgRecent < 3 && avgRecent < avgPrevious * 0.3) {
        const el = document.elementFromPoint(x, y);
        record('sudden_stop', {
          x, y,
          v_before: avgPrevious,
          v_after: avgRecent,
          el: el
        });
      }
    }

    // Check for hover
    const el = document.elementFromPoint(x, y);
    if (el && velocity < 0.5) {
      if (el !== state.hoverElement) {
        state.hoverStart = now;
        state.hoverElement = el;
      } else if (now - state.hoverStart > 2000) {
        // Long hover detected
        record('hover', {
          x, y,
          duration: now - state.hoverStart,
          el: el
        });
        state.hoverStart = now; // Reset to avoid spam
      }
    } else {
      state.hoverElement = null;
      state.hoverStart = null;
    }

    // Detect exit trajectory (moving toward viewport edges)
    if (velocity > 5) {
      const edgeProximity = Math.min(x, y, window.innerWidth - x, window.innerHeight - y);
      if (edgeProximity < 100) {
        state.exitDirection =
          y < 100 ? 'top' :
          x < 100 ? 'left' :
          x > window.innerWidth - 100 ? 'right' :
          y > window.innerHeight - 100 ? 'bottom' : null;
      }
    }

    // Only record significant movements
    if (distance > 10) {
      record('move', { x, y, v: velocity });
    }

    state.lastMove = { x, y, t: now, v: velocity };
  }

  // Detect scroll patterns
  function processScroll() {
    const now = Date.now();
    const y = window.scrollY;
    const dt = now - state.lastScroll.t;
    if (dt < 100) return; // Throttle

    const velocity = (y - state.lastScroll.y) / (dt / 100);

    // Detect rapid scroll to top (tab shopping behavior)
    if (y < 50 && velocity < -20) {
      record('scroll_to_tabs', {
        y,
        v: velocity,
        from_y: state.lastScroll.y
      });
    } else {
      record('scroll', {
        y,
        v: velocity,
        dir: velocity > 0 ? 'down' : 'up',
        at_top: y < 50,
        at_bottom: y > document.body.scrollHeight - window.innerHeight - 100
      });
    }

    state.lastScroll = { y, t: now };
  }

  // Send telemetry to backend
  function flush() {
    if (buffer.length === 0) return;

    const batch = buffer.splice(0, config.batchSize);
    const payload = {
      session_id: config.sessionId,
      tenant_id: config.tenantId,
      events: batch,
      timestamp: new Date().toISOString()
    };

    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(config.endpoint, blob);
    } else {
      // Fallback to fetch
      fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }

    if (config.debug) {
      console.log(`📡 Sent ${batch.length} telemetry events`);
    }

    lastFlush = Date.now();
  }

  // Event listeners
  document.addEventListener('click', e => processClick(e.clientX, e.clientY, e.target), { passive: true });
  document.addEventListener('pointermove', e => processMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener('scroll', processScroll, { passive: true });

  // Mouse leave/enter
  window.addEventListener('pointerleave', (e) => {
    state.mouseOffCanvas = true;

    // Determine exit direction
    const exitDir = state.exitDirection ||
      (e.clientY < 10 ? 'top' :
       e.clientX < 10 ? 'left' :
       e.clientX > window.innerWidth - 10 ? 'right' : 'bottom');

    record('mouse_exit', {
      dir: exitDir,
      x: e.clientX,
      y: e.clientY,
      after_pricing: state.hoverElement?.classList?.contains('price')
    });
  }, { passive: true });

  window.addEventListener('pointerenter', () => {
    if (state.mouseOffCanvas) {
      record('mouse_return', {});
      state.mouseOffCanvas = false;
      state.exitDirection = null;
    }
  }, { passive: true });

  // Visibility handling
  document.addEventListener('visibilitychange', () => {
    state.suspended = document.hidden;
    if (!document.hidden) {
      record('tab_return', {});
    }
  });

  // Periodic flush
  flushTimer = setInterval(flush, config.flushInterval);

  // Flush on unload
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);

  // Public API
  window.SentientIQTelemetry = {
    version: '5.0',
    flush,
    getSessionId: () => config.sessionId,
    destroy: () => {
      clearInterval(flushTimer);
      flush();
      state.suspended = true;
    }
  };

  if (config.debug) {
    console.log('🚀 SentientIQ Telemetry v5.0 initialized');
    console.log(`📊 Session: ${config.sessionId}`);
  }
})();