/**
 * SentientIQ Complete Bundle - v1.0
 * Single script for automotive retailers
 * Configure in GTM with Variables
 */

(function() {
  'use strict';

  // ============= CONFIGURATION FROM GTM VARIABLES =============
  // Get config from GTM variables or window object (set by GTM script)
  const config = {
    tenantId: window.SENTIENTIQ_TENANT_ID || localStorage.getItem('tenantId') || 'demo',
    enableTelemetry: true, // Always on
    enableInterventions: window.SENTIENTIQ_ENABLE_INTERVENTIONS !== false,
    apiEndpoint: 'https://api.sentientiq.app',
    debug: window.SENTIENTIQ_DEBUG === true
  };

  // Debug what we're getting
  console.log('Config tenantId:', config.tenantId);
  console.log('Window var:', window.SENTIENTIQ_TENANT_ID);
  console.log('LocalStorage:', localStorage.getItem('tenantId'));

  // Safety check - must have tenant ID
  if (!config.tenantId || config.tenantId === 'demo') {
    console.warn('SentientIQ: No Tenant ID configured');
    return;
  }

  // Generate or retrieve session ID
  const sessionId = sessionStorage.getItem('sq_session_id') ||
    `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem('sq_session_id', sessionId);

  if (config.debug) {
    console.log('🚀 SentientIQ Bundle Loaded');
    console.log('Configuration:', config);
    console.log('Session:', sessionId);
  }

  // ============= PART 1: TELEMETRY MODULE =============
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

        // Scroll tracking with throttle
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

        // Mouse movement for exit intent
        document.addEventListener('mouseout', (e) => {
          if (!e.toElement && !e.relatedTarget) {
            this.track('mouse_exit', {
              exit_y: e.clientY,
              page_time: Date.now() - this.sessionStart
            });
          }
        });

        // Hover tracking for price elements
        document.addEventListener('mouseover', (e) => {
          const target = e.target.closest('[class*="price"], [class*="pricing"], [data-price]');
          if (target) {
            const hoverStart = Date.now();
            const handleMouseOut = () => {
              const duration = Date.now() - hoverStart;
              if (duration > 500) { // Only track meaningful hovers
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

        // Form field tracking
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

        // Flush on page unload
        window.addEventListener('pagehide', () => this.flush());
        window.addEventListener('beforeunload', () => this.flush());

        if (config.debug) {
          console.log('✅ Telemetry module active');
        }
      }
    };

    telemetry.init();
    window.SentientIQTelemetry = telemetry;
  }

  // ============= PART 2: INTERVENTION MODULE =============
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
            if (config.debug) console.log('✅ Intervention system connected');
            this.reconnectAttempts = 0;
          };

          this.ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'intervention') {
                this.show(data);
              }
            } catch (e) {
              if (config.debug) console.error('Intervention parse error:', e);
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
        // Remove existing interventions
        document.querySelectorAll('.sq-intervention').forEach(el => el.remove());

        // Create intervention container
        const container = document.createElement('div');
        container.className = 'sq-intervention';
        container.setAttribute('data-intervention-type', data.intervention_type);

        // Inject styles if not present
        if (!document.getElementById('sq-styles')) {
          const style = document.createElement('style');
          style.id = 'sq-styles';
          style.textContent = `
            .sq-intervention {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .sq-modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.5);
              z-index: 999998;
              animation: sq-fade-in 0.3s ease-out;
            }
            .sq-modal-content {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              z-index: 999999;
              max-width: 500px;
              width: 90%;
              animation: sq-slide-up 0.3s ease-out;
            }
            .sq-toast {
              position: fixed;
              top: 20px;
              right: 20px;
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
              z-index: 999999;
              max-width: 380px;
              animation: sq-slide-in 0.4s ease-out;
            }
            .sq-close {
              position: absolute;
              top: 15px;
              right: 15px;
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #999;
              padding: 0;
              width: 30px;
              height: 30px;
            }
            @keyframes sq-fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes sq-slide-up {
              from { transform: translate(-50%, -40%); opacity: 0; }
              to { transform: translate(-50%, -50%); opacity: 1; }
            }
            @keyframes sq-slide-in {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `;
          document.head.appendChild(style);
        }

        // Build intervention based on type
        const templates = {
          exit_intent: () => `
            <div class="sq-modal-overlay"></div>
            <div class="sq-modal-content">
              <button class="sq-close" onclick="this.closest('.sq-intervention').remove()">×</button>
              <h2 style="margin: 0 0 20px; color: #333;">We see you're comparing options</h2>
              <p style="color: #666; margin: 0 0 25px;">
                Here's what actual dealers say: "SentientIQ helped us understand why customers leave our VDP pages.
                Now we catch them before they go to Cars.com"
              </p>
              <button onclick="
                window.location.href='/case-studies';
                this.closest('.sq-intervention').remove();
              " style="
                background: #4CAF50;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                font-weight: bold;
              ">See dealer results</button>
            </div>
          `,

          cart_abandonment: () => `
            <div class="sq-toast">
              <button class="sq-close" onclick="this.closest('.sq-intervention').remove()">×</button>
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="flex: 1;">
                  <h4 style="margin: 0 0 8px; color: #333;">Your cart is saved</h4>
                  <p style="margin: 0; color: #666; font-size: 14px;">
                    Most dealers see results within 48 hours of installation
                  </p>
                </div>
                <button onclick="
                  window.location.href='/checkout';
                  this.closest('.sq-intervention').remove();
                " style="
                  background: #4CAF50;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 6px;
                  font-weight: bold;
                  cursor: pointer;
                  white-space: nowrap;
                ">Complete setup</button>
              </div>
            </div>
          `,

          price_shock: () => `
            <div class="sq-toast" style="bottom: 20px; top: auto; right: 20px;">
              <button class="sq-close" onclick="this.closest('.sq-intervention').remove()">×</button>
              <h4 style="margin: 0 0 10px; color: #333;">About our pricing</h4>
              <p style="margin: 0 0 15px; color: #666;">
                Average dealer increases conversion by 23% in first month.
                ROI typically within 2 weeks.
              </p>
              <a href="/roi-calculator" style="color: #4CAF50; text-decoration: none; font-weight: bold;">
                Calculate your ROI →
              </a>
            </div>
          `,

          trust_hesitation: () => `
            <div class="sq-toast" style="bottom: 20px; left: 20px; right: auto;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <svg width="32" height="32" fill="#4CAF50" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
                <div>
                  <p style="margin: 0; color: #333; font-weight: bold;">Bank-level security</p>
                  <p style="margin: 0; color: #666; font-size: 14px;">
                    Used by 500+ automotive retailers nationwide
                  </p>
                </div>
              </div>
            </div>
          `
        };

        // Use template or default
        const template = templates[data.intervention_type] || templates.exit_intent;
        container.innerHTML = template();

        // Add to page
        document.body.appendChild(container);

        // Send acknowledgment
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'intervention_shown',
            intervention: data.intervention_type,
            timestamp: Date.now()
          }));
        }

        // Track with telemetry if available
        if (window.SentientIQTelemetry) {
          window.SentientIQTelemetry.track('intervention_shown', {
            intervention_type: data.intervention_type
          });
        }

        // Auto-dismiss if specified
        if (data.auto_dismiss) {
          setTimeout(() => container.remove(), data.auto_dismiss);
        }

        if (config.debug) {
          console.log(`🎯 Intervention shown: ${data.intervention_type}`);
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

        if (config.debug) {
          console.log('✅ Intervention module active');
        }
      }
    };

    interventions.init();
    window.SentientIQInterventions = interventions;
  }

  // ============= PUBLIC API =============
  window.SentientIQ = {
    version: '1.0',
    sessionId: sessionId,
    tenantId: config.tenantId,
    telemetryEnabled: config.enableTelemetry,
    interventionsEnabled: config.enableInterventions,
    debug: config.debug
  };

})();// Updated Mon Sep 15 13:46:02 PDT 2025
