/**
 * SentientIQ Telemetry v5.0 - Hybrid Approach
 * Lean behavioral telemetry collector - no emotion diagnosis
 * Now with intelligent site mapping
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
    debug: scriptTag?.getAttribute('data-debug') === 'true',
    useMapping: scriptTag?.getAttribute('data-use-mapping') !== 'false' // Default true
  };

  // Site map storage
  let siteMap = null;

  // Telemetry buffer
  const buffer = [];
  let lastFlush = Date.now();
  let flushTimer = null;

  // State tracking
  const sessionStart = Date.now();
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
    exitDirection: null, // Track where mouse left viewport
    erraticHistory: [], // Track erratic movements over pricing
    lastDirectionChange: 0, // Track zigzag patterns
    lastPricingInteraction: 0 // Track when user last interacted with pricing
  };

  // Record telemetry event
  function record(type, data) {
    if (state.suspended || state.mouseOffCanvas) return; // HALT when mouse is off canvas

    const now = Date.now();
    const sessionAge = now - sessionStart;

    const event = {
      t: now,
      type,
      ...data,
      session_age: sessionAge,  // How long user has been on page
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

  // Initialize site mapping
  function initializeSiteMapping() {
    if (!config.useMapping) return;

    // Load site mapper if available
    if (window.SentientIQSiteMapper) {
      siteMap = window.SentientIQSiteMapper.init();
      if (config.debug) {
        console.log('📍 Site map loaded:', siteMap);
        if (siteMap.warnings?.length > 0) {
          console.warn('⚠️ Site map warnings:', siteMap.warnings);
        }
      }
    } else {
      // Fallback: load site mapper dynamically
      const script = document.createElement('script');
      script.src = scriptTag?.src?.replace('telemetry-v5.js', 'site-mapper.js') || '/site-mapper.js';
      script.onload = () => {
        if (window.SentientIQSiteMapper) {
          siteMap = window.SentientIQSiteMapper.init();
          if (config.debug) {
            console.log('📍 Site mapper loaded dynamically:', siteMap);
          }
        }
      };
      document.head.appendChild(script);
    }
  }

  // Check if element matches any mapped selector
  function checkMappedElement(el) {
    if (!siteMap) return null;

    const result = {
      isPricing: false,
      isCart: false,
      isCTA: false,
      isDemo: false,
      isForm: false,
      confidence: 0,
      type: null
    };

    // Check each category
    for (const category of ['pricing', 'cart', 'cta', 'demo', 'forms']) {
      if (!siteMap[category]) continue;

      for (const item of siteMap[category]) {
        try {
          // Check if element matches selector or is child of selector
          if (el.matches(item.selector) || el.closest(item.selector)) {
            switch (category) {
              case 'pricing':
                result.isPricing = true;
                result.type = item.type;
                break;
              case 'cart':
                result.isCart = true;
                result.type = item.type;
                break;
              case 'cta':
                result.isCTA = true;
                result.type = item.type;
                break;
              case 'demo':
                result.isDemo = true;
                result.type = item.type;
                break;
              case 'forms':
                result.isForm = true;
                result.type = item.type;
                break;
            }
            result.confidence = Math.max(result.confidence, item.confidence || 70);
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }
    }

    return result.confidence > 0 ? result : null;
  }

  // Get element context (what user is interacting with)
  function getElementContext(el) {
    const ctx = {};

    // First check mapped elements for high confidence
    const mapped = checkMappedElement(el);
    if (mapped) {
      Object.assign(ctx, {
        pricing: mapped.isPricing,
        cart: mapped.isCart,
        cta: mapped.isCTA,
        demo: mapped.isDemo,
        form: mapped.isForm,
        mapped_type: mapped.type,
        confidence: mapped.confidence
      });
    }

    // Fallback to heuristic detection if not mapped or low confidence
    if (!mapped || mapped.confidence < 70) {
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
    }

    // Always include text content
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

    // Get full context using site map
    const fullContext = getElementContext(target);

    // Build target string for debugging
    const elText = (target.textContent || '').toLowerCase();
    const elClass = (target.className || '').toLowerCase();
    const targetStr = `${elClass} ${elText}`.substring(0, 100);

    record(behavior, {
      x, y,
      count: state.clickSequence.length,
      target: targetStr,
      ctx: fullContext
    });

    state.lastClick = { x, y, t: now };
  }

  // Detect movement patterns
  function processMove(x, y) {
    // Stop processing if mouse is off canvas
    if (state.mouseOffCanvas) return;

    const now = Date.now();
    const dt = now - state.lastMove.t;
    if (dt < 50) return; // Throttle to 20Hz

    const distance = Math.hypot(x - state.lastMove.x, y - state.lastMove.y);
    const velocity = distance / (dt / 100);

    // Track velocity history for deceleration detection
    state.velocityHistory.push({ v: velocity, t: now });
    if (state.velocityHistory.length > 10) state.velocityHistory.shift();

    // Detect erratic behavior (rapid direction changes)
    if (state.lastMove.x !== 0 && state.lastMove.y !== 0) {
      const dx = x - state.lastMove.x;
      const dy = y - state.lastMove.y;
      const lastDx = state.lastMove.dx || 0;
      const lastDy = state.lastMove.dy || 0;

      // Check for direction reversal
      const directionChange = (dx * lastDx < 0) || (dy * lastDy < 0);

      if (directionChange && velocity > 5) {
        state.lastDirectionChange = now;
        state.erraticHistory.push({ t: now, v: velocity });

        // Keep only recent history (last 2 seconds)
        state.erraticHistory = state.erraticHistory.filter(h => now - h.t < 2000);

        // If 3+ direction changes in 2 seconds with high velocity = erratic
        if (state.erraticHistory.length >= 3) {
          const el = document.elementFromPoint(x, y);
          const elText = (el?.textContent || '').toLowerCase();
          const elClass = (el?.className || '').toLowerCase();

          const isPricingContext = elText.includes('$') ||
                                  elClass.includes('price') ||
                                  elClass.includes('tier') ||
                                  elClass.includes('plan');

          if (isPricingContext) {
            record('erratic_movement', {
              x, y,
              changes: state.erraticHistory.length,
              avg_velocity: state.erraticHistory.reduce((sum, h) => sum + h.v, 0) / state.erraticHistory.length,
              target: `${elClass} ${elText.substring(0, 50)}`,
              ctx: { pricing: true }
            });
            state.erraticHistory = []; // Reset after recording
          }
        }
      }

      state.lastMove.dx = dx;
      state.lastMove.dy = dy;
    }

    // Detect sudden deceleration (sticker shock indicator)
    if (state.velocityHistory.length >= 3) {
      const recent = state.velocityHistory.slice(-3);
      const avgRecent = recent.reduce((sum, h) => sum + h.v, 0) / 3;
      const avgPrevious = state.lastMove.v || avgRecent;

      // Sudden deceleration (>70% drop in velocity)
      if (avgPrevious > 10 && avgRecent < 3 && avgRecent < avgPrevious * 0.3) {
        const el = document.elementFromPoint(x, y);
        const elText = (el?.textContent || '').toLowerCase();
        const elClass = (el?.className || '').toLowerCase();

        record('sudden_stop', {
          x, y,
          v_before: avgPrevious,
          v_after: avgRecent,
          target: `${elClass} ${elText.substring(0, 50)}`,
          ctx: {
            pricing: elText.includes('$') ||
                    elClass.includes('price') ||
                    elClass.includes('tier') ||
                    elClass.includes('plan')
          }
        });
      }
    }

    // Check for hover
    const el = document.elementFromPoint(x, y);
    if (el && velocity < 0.5) {
      if (el !== state.hoverElement) {
        state.hoverStart = now;
        state.hoverElement = el;
      } else if (now - state.hoverStart > 500) {  // Reduced threshold for faster detection
        // Detect element context
        const elText = (el.textContent || '').toLowerCase();
        const elClass = (el.className || '').toLowerCase();
        const elId = (el.id || '').toLowerCase();
        const target = `${elClass} ${elId} ${el.tagName.toLowerCase()}`;

        // Detect price elements
        const isPricing = elText.includes('$') ||
                         elClass.includes('price') ||
                         elClass.includes('cost') ||
                         elId.includes('price') ||
                         el.closest('[class*="price"], [id*="price"], [data-price]');

        // Detect cart/checkout elements
        const isCart = elClass.includes('cart') ||
                      elId.includes('cart') ||
                      el.closest('[class*="cart"], [id*="cart"]');

        // Detect CTA buttons
        const isCTA = el.tagName === 'BUTTON' ||
                     el.tagName === 'A' ||
                     elClass.includes('btn') ||
                     elClass.includes('button');

        // Track pricing interactions
        if (isPricing) {
          state.lastPricingInteraction = now;
        }

        record('hover', {
          x, y,
          duration: now - state.hoverStart,
          target: target,
          ctx: {
            pricing: isPricing,
            cart: isCart,
            cta: isCTA
          }
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

    // Detect smooth/auto scroll (consistent velocity = programmatic)
    const isAutoScroll = state.lastScroll.v &&
                        Math.abs(velocity) > 10 &&
                        Math.abs(velocity - state.lastScroll.v) < 2;

    // Check what's visible in viewport - pricing elements?
    const viewportElements = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    const visibleText = viewportElements.map(el => (el.textContent || '').toLowerCase()).join(' ');
    const visibleClasses = viewportElements.map(el => (el.className || '').toLowerCase()).join(' ');

    const isPricingVisible = visibleText.includes('$') ||
                            visibleText.includes('price') ||
                            visibleText.includes('tier') ||
                            visibleText.includes('plan') ||
                            visibleText.includes('month') ||
                            visibleText.includes('year') ||
                            visibleClasses.includes('price') ||
                            visibleClasses.includes('tier') ||
                            visibleClasses.includes('plan');

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
        at_bottom: y > document.body.scrollHeight - window.innerHeight - 100,
        ctx: {
          pricing: isPricingVisible,
          auto_scroll: isAutoScroll,  // Landing on pricing section
          // Track if user is going back and forth (comparison behavior)
          oscillating: state.lastScroll.v && Math.sign(velocity) !== Math.sign(state.lastScroll.v)
        }
      });
    }

    state.lastScroll = { y, t: now, v: velocity };
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
    const now = Date.now();

    // Check if user interacted with pricing in last 5 seconds
    const recentPricingInteraction = (now - state.lastPricingInteraction) < 5000;

    // Check what they were looking at BEFORE marking off canvas
    const wasViewingPricing = recentPricingInteraction ||
                             state.hoverElement?.classList?.contains('price') ||
                             state.hoverElement?.textContent?.includes('$');

    // Determine exit direction
    const exitDir = state.exitDirection ||
      (e.clientY < 10 ? 'top' :
       e.clientX < 10 ? 'left' :
       e.clientX > window.innerWidth - 10 ? 'right' : 'bottom');

    // Record exit BEFORE halting
    record('mouse_exit', {
      dir: exitDir,
      x: e.clientX,
      y: e.clientY,
      after_pricing: wasViewingPricing,
      time_since_pricing: now - state.lastPricingInteraction
    });

    // NOW halt all tracking
    state.mouseOffCanvas = true;
    state.hoverElement = null;
    state.hoverStart = null;
    state.velocityHistory = [];
    state.exitDirection = null;
  }, { passive: true });

  window.addEventListener('pointerenter', () => {
    if (state.mouseOffCanvas) {
      record('mouse_return', {});
      state.mouseOffCanvas = false;
      state.exitDirection = null;
    }
  }, { passive: true });

  // Copy/paste detection (high intent signals)
  document.addEventListener('copy', (e) => {
    const selection = window.getSelection().toString();
    if (selection) {
      const isPriceText = selection.includes('$') ||
                         selection.includes('price') ||
                         selection.includes('month') ||
                         selection.includes('year');

      record('copy', {
        length: selection.length,
        ctx: {
          pricing: isPriceText,
          url: selection.includes('http'),
          email: selection.includes('@')
        }
      });
    }
  }, { passive: true });

  // Form field interactions (critical for checkout/signup)
  let formStartTime = null;
  let currentField = null;

  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      const fieldType = e.target.type || e.target.tagName.toLowerCase();
      const fieldName = e.target.name || e.target.id || fieldType;

      currentField = fieldName;
      formStartTime = Date.now();

      record('field_focus', {
        field: fieldName,
        type: fieldType,
        ctx: {
          checkout: fieldName.includes('card') || fieldName.includes('payment') || fieldName.includes('cvv'),
          email: fieldType === 'email' || fieldName.includes('email'),
          pricing: e.target.closest('[class*="price"], [id*="price"], form[action*="checkout"]') !== null
        }
      });
    }
  }, { passive: true });

  document.addEventListener('focusout', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      const timeSpent = formStartTime ? Date.now() - formStartTime : 0;
      const hasValue = e.target.value && e.target.value.length > 0;

      record('field_blur', {
        field: currentField,
        duration: timeSpent,
        filled: hasValue,
        ctx: {
          abandoned: !hasValue && timeSpent > 1000, // Focused but left empty
          checkout: currentField?.includes('card') || currentField?.includes('payment')
        }
      });

      formStartTime = null;
      currentField = null;
    }
  }, { passive: true });

  // Visibility handling with rapid switching detection
  let lastTabHidden = 0;
  let tabSwitchCount = 0;

  document.addEventListener('visibilitychange', () => {
    state.suspended = document.hidden;

    if (document.hidden) {
      lastTabHidden = Date.now();
      record('tab_hidden', {});
    } else {
      const awayTime = Date.now() - lastTabHidden;

      // Track rapid tab switching (comparison shopping behavior)
      if (awayTime < 30000) {
        tabSwitchCount++;
      } else {
        tabSwitchCount = 0;
      }

      record('tab_return', {
        away_duration: awayTime,
        ctx: {
          quick_switch: awayTime < 5000,
          comparison_pattern: tabSwitchCount > 2
        }
      });
    }
  });

  // Periodic flush
  flushTimer = setInterval(flush, config.flushInterval);

  // Flush on unload
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);

  // Initialize site mapping on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSiteMapping);
  } else {
    initializeSiteMapping();
  }

  // Public API
  window.SentientIQTelemetry = {
    version: '5.0',
    flush,
    getSessionId: () => config.sessionId,
    getTenantId: () => config.tenantId,
    getSiteMap: () => siteMap,
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