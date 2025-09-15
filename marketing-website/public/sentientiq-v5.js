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

        if (this.buffer.length >= this.batchSize) {
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
        // Click tracking
        document.addEventListener('click', (e) => {
          const target = e.target.closest('a, button, [role="button"]');
          if (target) {
            this.track('click', {
              el: target.tagName.toLowerCase(),
              text: target.textContent?.slice(0, 50),
              href: target.href
            });
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

        // Price hover tracking
        document.addEventListener('mouseover', (e) => {
          const target = e.target.closest('[class*="price"], [class*="pricing"], [data-price]');
          if (target) {
            const hoverStart = Date.now();
            const handleMouseOut = () => {
              const duration = Date.now() - hoverStart;
              if (duration > 500) {
                this.track('hover', {
                  el: 'price',
                  duration,
                  text: target.textContent?.slice(0, 50)
                });
              }
              target.removeEventListener('mouseout', handleMouseOut);
            };
            target.addEventListener('mouseout', handleMouseOut);
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
        // Remove existing
        document.querySelectorAll('.sq-intervention').forEach(el => el.remove());

        // Add styles if needed
        if (!document.getElementById('sq-styles')) {
          const style = document.createElement('style');
          style.id = 'sq-styles';
          style.textContent = `
            .sq-intervention { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .sq-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999998; }
            .sq-modal-content { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 40px; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 999999; max-width: 500px; }
            .sq-toast { position: fixed; top: 20px; right: 20px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 999999; max-width: 380px; }
          `;
          document.head.appendChild(style);
        }

        // Create intervention
        const container = document.createElement('div');
        container.className = 'sq-intervention';

        // Simple interventions
        const templates = {
          exit_intent: `
            <div class="sq-modal-overlay"></div>
            <div class="sq-modal-content">
              <button onclick="this.closest('.sq-intervention').remove()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
              <h2>We noticed you're comparing options</h2>
              <p>See what makes us different - real patterns from real users.</p>
              <button onclick="window.location.href='/demo'" style="background: #4CAF50; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer;">See Demo</button>
            </div>
          `,
          save_cart_urgent: `
            <div class="sq-toast">
              <h4>Your cart is saved</h4>
              <p>Complete checkout when ready</p>
            </div>
          `,
          value_proposition: `
            <div class="sq-toast" style="bottom: 20px; top: auto;">
              <h4>About our pricing</h4>
              <p>Average ROI within 2 weeks</p>
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