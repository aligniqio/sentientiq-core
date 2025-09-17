/**
 * SentientIQ Bundle v5 - FIXED VERSION
 * Single script for telemetry + interventions
 */

(function() {
  'use strict';

  // Only run once
  if (window.SentientIQ) {
    console.log('SentientIQ already loaded');
    return;
  }

  // Get tenant ID from multiple sources
  const tenantId = window.SENTIENTIQ_TENANT_ID || localStorage.getItem('tenantId');

  if (!tenantId || tenantId === 'demo') {
    console.error('SentientIQ: No tenant ID found. Set window.SENTIENTIQ_TENANT_ID or localStorage tenantId');
    return;
  }

  // Configuration
  const config = {
    tenantId: tenantId,
    enableTelemetry: true,
    enableInterventions: window.SENTIENTIQ_ENABLE_INTERVENTIONS !== false,
    apiEndpoint: 'https://api.sentientiq.app',
    debug: window.SENTIENTIQ_DEBUG === true
  };

  console.log('🚀 SentientIQ v5 Starting');
  console.log('Tenant:', config.tenantId);
  console.log('Interventions:', config.enableInterventions ? 'Enabled' : 'Disabled');

  // Generate session ID
  const sessionId = sessionStorage.getItem('sq_session_id') ||
    `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem('sq_session_id', sessionId);

  // ============= TELEMETRY MODULE =============
  if (config.enableTelemetry) {
    const telemetry = {
      buffer: [],
      batchSize: 10,
      flushInterval: 5000,
      sessionStart: Date.now(),
      flushTimer: null,

      track(type, data = {}) {
        const now = Date.now();
        const event = {
          t: now,
          type,
          ...data,
          session_age: now - this.sessionStart,
          url: window.location.href,
          vp: { w: window.innerWidth, h: window.innerHeight }
        };

        this.buffer.push(event);

        // CRITICAL EVENTS - SEND IMMEDIATELY
        const criticalEvents = ['click', 'hover', 'rage_click', 'mouse_exit'];
        const criticalTargets = ['price', 'pricing', 'buy', 'checkout', 'demo', 'cart'];

        const isCritical = criticalEvents.includes(type) ||
          (data.el && criticalTargets.some(t =>
            data.el.toLowerCase().includes(t) ||
            (data.text && data.text.toLowerCase().includes(t)) ||
            (data.href && data.href.toLowerCase().includes(t))
          ));

        if (isCritical) {
          // Send immediately for critical events
          this.flush();
        } else if (this.buffer.length >= this.batchSize) {
          // Normal batching for non-critical
          this.flush();
        }
      },

      flush() {
        if (this.buffer.length === 0) return;

        const events = [...this.buffer];
        this.buffer = [];

        const payload = {
          session_id: sessionId,
          tenant_id: config.tenantId,
          events: events
        };

        // Send to backend
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(`${config.apiEndpoint}/api/telemetry/stream`, blob);
        } else {
          fetch(`${config.apiEndpoint}/api/telemetry/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(err => {
            if (config.debug) console.error('Telemetry error:', err);
            this.buffer = events.concat(this.buffer);
          });
        }
      },

      init() {
        // Click tracking with rage click detection
        const clickHistory = [];
        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"], [class*="price"], [class*="pricing"], input, select, textarea');
          if (target) {
            const now = Date.now();
            const clickData = {
              time: now,
              x: e.clientX,
              y: e.clientY,
              target: target
            };

            // Add to history
            clickHistory.push(clickData);

            // Keep only last 10 clicks
            if (clickHistory.length > 10) {
              clickHistory.shift();
            }

            // Check for rage clicks (3+ clicks within 1 second on same element)
            const recentClicks = clickHistory.filter(c =>
              now - c.time < 1000 &&
              c.target === target
            );

            if (recentClicks.length >= 3) {
              // Rage click detected!
              this.track('rage_click', {
                el: target.tagName.toLowerCase(),
                text: target.textContent?.slice(0, 50),
                href: target.href,
                count: recentClicks.length,
                ctx: { frustration: true }
              });

              // Clear history to prevent multiple rage events
              clickHistory.length = 0;
            } else {
              // Normal click
              this.track('click', {
                el: target.tagName.toLowerCase(),
                text: target.textContent?.slice(0, 50),
                href: target.href
              });
            }
          }
        });

        // Scroll tracking
        let scrollTimer;
        let lastScrollY = 0;
        window.addEventListener('scroll', () => {
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(() => {
            const scrollY = window.scrollY;
            const direction = scrollY > lastScrollY ? 'down' : 'up';
            const depth = Math.round((scrollY / document.body.scrollHeight) * 100);

            this.track('scroll', {
              direction,
              depth,
              velocity: Math.abs(scrollY - lastScrollY)
            });

            lastScrollY = scrollY;
          }, 150);
        });

        // Mouse exit tracking
        document.addEventListener('mouseout', (e) => {
          if (!e.toElement && !e.relatedTarget) {
            this.track('mouse_exit', {
              exit_y: e.clientY,
              page_time: Date.now() - this.sessionStart
            });
          }
        });

        // Enhanced hover tracking for all important elements
        let hoverTarget = null;
        let hoverStart = 0;

        document.addEventListener('mouseover', (e) => {
          // Track hovers on links, buttons, and pricing elements
          const target = e.target.closest('a, button, [role="button"], [class*="price"], [class*="pricing"], [data-price], [href*="#pricing"]');

          if (target && target !== hoverTarget) {
            // End previous hover if exists
            if (hoverTarget && hoverStart) {
              const duration = Date.now() - hoverStart;
              if (duration > 300) {
                const targetInfo = {
                  el: hoverTarget.tagName.toLowerCase(),
                  duration,
                  text: hoverTarget.textContent?.slice(0, 50),
                  href: hoverTarget.href,
                  target: hoverTarget.className || hoverTarget.id || hoverTarget.textContent?.slice(0, 20)
                };

                // Mark as pricing-related if applicable
                const isPricing = (hoverTarget.textContent?.toLowerCase().includes('pric') ||
                                  hoverTarget.href?.includes('pricing') ||
                                  hoverTarget.className?.includes('pric'));

                if (isPricing) {
                  targetInfo.ctx = { pricing: true };
                }

                this.track('hover', targetInfo);
              }
            }

            // Start new hover tracking
            hoverTarget = target;
            hoverStart = Date.now();
          }
        });

        // End hover when mouse leaves element
        document.addEventListener('mouseout', (e) => {
          if (hoverTarget && !hoverTarget.contains(e.relatedTarget)) {
            const duration = Date.now() - hoverStart;
            if (duration > 300) {
              const targetInfo = {
                el: hoverTarget.tagName.toLowerCase(),
                duration,
                text: hoverTarget.textContent?.slice(0, 50),
                href: hoverTarget.href,
                target: hoverTarget.className || hoverTarget.id || hoverTarget.textContent?.slice(0, 20)
              };

              // Mark as pricing-related if applicable
              const isPricing = (hoverTarget.textContent?.toLowerCase().includes('pric') ||
                                hoverTarget.href?.includes('pricing') ||
                                hoverTarget.className?.includes('pric'));

              if (isPricing) {
                targetInfo.ctx = { pricing: true };
              }

              this.track('hover', targetInfo);
            }
            hoverTarget = null;
            hoverStart = 0;
          }
        });

        // Form tracking
        document.addEventListener('focusin', (e) => {
          if (e.target.matches('input, select, textarea')) {
            const fieldStart = Date.now();
            const field = e.target;

            const handleBlur = () => {
              const duration = Date.now() - fieldStart;
              this.track('field_interaction', {
                field_type: field.type,
                field_name: field.name || field.id,
                duration,
                filled: !!field.value,
                is_checkout: !!field.closest('[class*="checkout"], [class*="payment"]')
              });
              field.removeEventListener('blur', handleBlur);
            };

            field.addEventListener('blur', handleBlur);
          }
        });

        // TEXT SELECTION TRACKING - The killer feature
        let selectionTimer = null;
        document.addEventListener('mouseup', () => {
          clearTimeout(selectionTimer);
          selectionTimer = setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText && selectedText.length > 3) {
              // Get the parent element to understand context
              const range = selection.getRangeAt(0);
              const container = range.commonAncestorContainer;
              const parentEl = container.nodeType === 3 ?
                container.parentElement : container;

              // Check if it's pricing-related text
              const isPricing = selectedText.match(/\$|\d+|price|tier|plan|month|year/i) ||
                               parentEl.className?.includes('pric') ||
                               parentEl.closest('[class*="pric"], [class*="tier"], [class*="plan"]');

              this.track('text_selection', {
                selected_text: selectedText.slice(0, 100),
                length: selectedText.length,
                ctx: {
                  pricing: !!isPricing,
                  comparison: selectedText.length > 20
                }
              });

              console.log('📝 Text selected:', selectedText.slice(0, 50) + '...');
            }
          }, 500); // Wait 500ms to ensure selection is complete
        });

        // Periodic flush
        this.flushTimer = setInterval(() => this.flush(), this.flushInterval);

        // Flush on unload
        window.addEventListener('pagehide', () => this.flush());
        window.addEventListener('beforeunload', () => this.flush());

        if (config.debug) {
          console.log('✅ Telemetry active');
        }
      }
    };

    telemetry.init();
    window.SentientIQTelemetry = telemetry;
  }

  // ============= INTERVENTION MODULE =============
  if (config.enableInterventions) {
    const interventions = {
      ws: null,
      reconnectAttempts: 0,
      maxReconnects: 5,

      connect() {
        const wsUrl = `wss://api.sentientiq.app/ws?channel=interventions&session=${sessionId}&tenant=${config.tenantId}`;

        try {
          this.ws = new WebSocket(wsUrl);

          this.ws.onopen = () => {
            if (config.debug) console.log('✅ Interventions connected');
            this.reconnectAttempts = 0;
          };

          this.ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'intervention') {
                this.show(data);
              }
            } catch (e) {
              if (config.debug) console.error('Intervention error:', e);
            }
          };

          this.ws.onclose = () => {
            this.ws = null;
            if (this.reconnectAttempts < this.maxReconnects) {
              this.reconnectAttempts++;
              setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
            }
          };

        } catch (e) {
          if (config.debug) console.error('WebSocket failed:', e);
        }
      },

      show(data) {
        // Remove ANY existing interventions first
        document.querySelectorAll('.sq-intervention').forEach(el => el.remove());

        // Prevent duplicate interventions within 30 seconds
        const now = Date.now();
        if (this.lastInterventionTime && (now - this.lastInterventionTime < 30000)) {
          console.log('Intervention cooldown active, skipping');
          return;
        }
        this.lastInterventionTime = now;

        // Add styles if needed
        if (!document.getElementById('sq-styles')) {
          const style = document.createElement('style');
          style.id = 'sq-styles';
          style.textContent = `
            .sq-intervention {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #ffffff;
            }
            .sq-modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.7);
              backdrop-filter: blur(10px);
              z-index: 999998;
            }
            .sq-modal-content {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(15, 15, 35, 0.8);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4), inset 0 0 30px rgba(255, 255, 255, 0.05);
              z-index: 999999;
              max-width: 500px;
            }
            .sq-modal-content h2 {
              color: #ffffff;
              margin: 0 0 15px 0;
              font-size: 28px;
              font-weight: 600;
            }
            .sq-modal-content p {
              color: rgba(255, 255, 255, 0.8);
              margin: 0 0 25px 0;
              font-size: 16px;
              line-height: 1.5;
            }
            .sq-modal-content button {
              transition: all 0.3s ease;
            }
            .sq-modal-content button:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 30px rgba(76, 175, 80, 0.3);
            }
            .sq-toast {
              position: fixed;
              top: 20px;
              right: 20px;
              background: rgba(15, 15, 35, 0.9);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              padding: 20px;
              border-radius: 12px;
              box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.03);
              z-index: 999999;
              max-width: 380px;
              animation: slideIn 0.4s ease;
            }
            .sq-toast h4 {
              color: #ffffff;
              margin: 0 0 8px 0;
              font-size: 18px;
              font-weight: 600;
            }
            .sq-toast p {
              color: rgba(255, 255, 255, 0.7);
              margin: 0;
              font-size: 14px;
            }
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateX(100px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `;
          document.head.appendChild(style);
        }

        // Create intervention
        const container = document.createElement('div');
        container.className = 'sq-intervention';

        // Simple interventions
        const templates = {
          exit_intent: `
            <div class="sq-modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="sq-modal-content">
              <button onclick="event.stopPropagation(); this.closest('.sq-intervention').remove()" style="position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); font-size: 20px; cursor: pointer; color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s; z-index: 1000000;">&times;</button>
              <h2>We noticed you're comparing options</h2>
              <p>See what makes us different - real patterns from real users.</p>
              <button onclick="window.location.href='/demo'" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 30px; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">See Live Demo</button>
            </div>
          `,
          save_cart_urgent: `
            <div class="sq-toast">
              <h4>✓ Your cart is saved</h4>
              <p>Complete checkout when ready</p>
            </div>
          `,
          value_proposition: `
            <div class="sq-toast" style="bottom: 20px; top: auto;">
              <h4>💡 About our pricing</h4>
              <p>Average ROI within 2 weeks. See how we compare.</p>
            </div>
          `
        };

        container.innerHTML = templates[data.intervention_type] || templates.exit_intent;
        document.body.appendChild(container);

        // Send acknowledgment
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'intervention_shown',
            intervention: data.intervention_type,
            timestamp: Date.now()
          }));
        }

        if (config.debug) {
          console.log(`🎯 Intervention: ${data.intervention_type}`);
        }
      },

      init() {
        this.connect();

        // Heartbeat
        setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      }
    };

    interventions.init();
    window.SentientIQInterventions = interventions;
  }

  // Public API
  window.SentientIQ = {
    version: '5.0',
    sessionId: sessionId,
    tenantId: config.tenantId,
    telemetryEnabled: config.enableTelemetry,
    interventionsEnabled: config.enableInterventions
  };

  console.log('✅ SentientIQ v5 Ready');

})();