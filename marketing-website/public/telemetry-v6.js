/**
 * SentientIQ Telemetry v6
 * The complete intervention intelligence stack
 * This is where behavior becomes emotion becomes intervention becomes conversion
 */

(function() {
  'use strict';

  // Import our modules (in production these would be bundled)
  const modules = {
    choreographer: '/intervention-choreographer.js',
    renderer: '/intervention-renderer.js',
    diagnostics: '/intervention-diagnostics.js'
  };

  class SentientIQTelemetry {
    constructor() {
      this.config = window.SentientIQ || {};
      this.sessionId = this.generateSessionId();
      this.tenantId = this.config.tenantId || document.querySelector('script[data-tenant-id]')?.dataset.tenantId;
      this.apiEndpoint = this.config.apiEndpoint || 'https://api.sentientiq.app';
      this.wsEndpoint = this.apiEndpoint.replace('http', 'ws') + '/ws';

      this.ws = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 1000;

      // Component instances (will be loaded dynamically)
      this.choreographer = null;
      this.renderer = null;
      this.diagnostics = null;

      // Telemetry batch
      this.eventQueue = [];
      this.batchSize = 10;
      this.batchInterval = 2000;

      // Tenant branding (will be fetched)
      this.tenantBranding = null;

      this.init();
    }

    generateSessionId() {
      const stored = sessionStorage.getItem('sentientiq_session');
      if (stored) return stored;

      const id = 'siq_' + Date.now() + '_' + Math.random().toString(36).substring(2);
      sessionStorage.setItem('sentientiq_session', id);
      return id;
    }

    async init() {
      try {
        console.log('🚀 SentientIQ Telemetry v6 initializing...');

        // Load diagnostics first for error catching
        await this.loadDiagnostics();

        // Fetch tenant configuration
        await this.fetchTenantConfig();

        // Load choreographer and renderer
        await this.loadChoreographer();
        await this.loadRenderer();

        // Connect to WebSocket
        this.connectWebSocket();

        // Start telemetry collection
        this.startTelemetryCollection();

        // Set up batch processing
        this.startBatchProcessor();

        // Log successful init
        this.diagnostics?.log('choreographer', 'initialized', {
          sessionId: this.sessionId,
          tenantId: this.tenantId,
          endpoint: this.apiEndpoint
        }, 'info');

        console.log('✅ SentientIQ ready');

      } catch (error) {
        console.error('Failed to initialize SentientIQ:', error);
        this.diagnostics?.log('choreographer', 'init_failed', error, 'critical');
      }
    }

    async loadDiagnostics() {
      // In production, this would be bundled
      // For now, create inline
      if (typeof window.InterventionDiagnostics !== 'undefined') {
        this.diagnostics = window.InterventionDiagnostics.getInstance();
        return;
      }

      // Inline minimal diagnostics
      this.diagnostics = {
        log: (component, event, data, level = 'info', correlationId) => {
          const emoji = {
            processor: '🧠',
            engine: '⚙️',
            websocket: '📡',
            choreographer: '🎭',
            renderer: '🎨'
          };

          const style = {
            debug: 'color: gray',
            info: 'color: blue',
            warn: 'color: orange',
            error: 'color: red',
            critical: 'background: red; color: white; padding: 2px'
          };

          console.log(
            `%c${emoji[component]} ${component}:${event}`,
            style[level],
            data
          );
        }
      };
    }

    async loadChoreographer() {
      // In production, this would be bundled
      // For now, create inline version with core functionality
      if (typeof window.InterventionChoreographer !== 'undefined') {
        this.choreographer = window.InterventionChoreographer.getInstance();
        return;
      }

      // Inline choreographer
      this.choreographer = {
        mouseTrail: [],
        hoverTimers: new Map(),

        init: () => {
          // Mouse tracking
          document.addEventListener('mousemove', (e) => {
            this.choreographer.mouseTrail.push({
              x: e.clientX,
              y: e.clientY,
              t: Date.now()
            });

            if (this.choreographer.mouseTrail.length > 50) {
              this.choreographer.mouseTrail.shift();
            }

            // Check for deceleration
            if (this.choreographer.mouseTrail.length > 2) {
              const recent = this.choreographer.mouseTrail.slice(-3);
              const v1 = this.calculateVelocity(recent[0], recent[1]);
              const v2 = this.calculateVelocity(recent[1], recent[2]);
              const deceleration = v2 - v1;

              if (deceleration < -100) {
                this.recordBehavior('mouse_deceleration', {
                  velocity: v2,
                  deceleration,
                  position: { x: e.clientX, y: e.clientY }
                });
              }
            }
          });

          // Hover tracking on key elements
          const trackables = ['[data-price]', '.pricing-tier', '.add-to-cart', 'button'];
          trackables.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
              element.addEventListener('mouseenter', () => {
                const key = element.id || element.className;
                this.choreographer.hoverTimers.set(key, Date.now());
              });

              element.addEventListener('mouseleave', () => {
                const key = element.id || element.className;
                const start = this.choreographer.hoverTimers.get(key);
                if (start) {
                  const duration = Date.now() - start;
                  if (duration > 2000) {
                    this.recordBehavior('significant_hover', {
                      element: key,
                      duration
                    });
                  }
                  this.choreographer.hoverTimers.delete(key);
                }
              });
            });
          });

          // Exit intent
          document.addEventListener('mouseout', (e) => {
            if (e.clientY <= 0) {
              this.recordBehavior('exit_intent', {
                mousePosition: { x: e.clientX, y: e.clientY }
              });
            }
          });

          // Scroll tracking
          let lastScroll = 0;
          window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollDepth = (currentScroll / docHeight) * 100;
            const scrollVelocity = Math.abs(currentScroll - lastScroll);

            if (scrollVelocity > 200) {
              this.recordBehavior('rage_scroll', {
                velocity: scrollVelocity,
                depth: scrollDepth
              });
            }

            lastScroll = currentScroll;
          });
        }
      };

      this.choreographer.init();
    }

    async loadRenderer() {
      // In production, this would be bundled
      if (typeof window.InterventionRenderer !== 'undefined') {
        this.renderer = window.InterventionRenderer.getInstance();
        return;
      }

      // Inline renderer
      this.renderer = {
        activeInterventions: new Map(),

        render: (intervention) => {
          const id = 'intervention-' + Date.now();

          // Create wrapper
          const wrapper = document.createElement('div');
          wrapper.id = id;
          wrapper.className = `sentientiq-intervention sentientiq-${intervention.type}`;

          // Style based on type
          const styles = {
            modal: `
              position: fixed; inset: 0; background: rgba(0,0,0,0.5);
              display: flex; align-items: center; justify-content: center;
              z-index: 999999; animation: fadeIn 0.3s;
            `,
            banner: `
              position: fixed; top: 0; left: 0; right: 0;
              background: linear-gradient(90deg, #667eea, #764ba2);
              color: white; padding: 16px; text-align: center;
              z-index: 999998; animation: slideDown 0.3s;
            `,
            toast: `
              position: fixed; bottom: 20px; right: 20px;
              background: white; border-radius: 8px; padding: 16px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              z-index: 999997; animation: slideIn 0.3s;
            `
          };

          wrapper.style.cssText = styles[intervention.type] || styles.toast;

          // Create content
          wrapper.innerHTML = `
            <div class="sentientiq-content">
              <h3>${intervention.content.headline}</h3>
              <p>${intervention.content.body}</p>
              <button class="sentientiq-cta">${intervention.content.cta}</button>
              ${intervention.type === 'modal' ? '<button class="sentientiq-close">×</button>' : ''}
            </div>
          `;

          // Add to page
          document.body.appendChild(wrapper);

          // Attach handlers
          wrapper.querySelector('.sentientiq-cta')?.addEventListener('click', () => {
            this.handleInteraction(id, intervention);
          });

          wrapper.querySelector('.sentientiq-close')?.addEventListener('click', () => {
            this.dismissIntervention(id);
          });

          // Track
          this.renderer.activeInterventions.set(id, intervention);

          // Auto-dismiss based on persistence
          if (intervention.timing.persistence === 'timed') {
            setTimeout(() => this.dismissIntervention(id), intervention.timing.duration);
          }

          this.diagnostics?.log('renderer', 'intervention_shown', {
            id,
            type: intervention.type
          }, 'info', intervention.correlationId);

          return id;
        }
      };
    }

    calculateVelocity(p1, p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dt = p2.t - p1.t;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance / dt * 1000; // pixels per second
    }

    async fetchTenantConfig() {
      try {
        const response = await fetch(`${this.apiEndpoint}/api/tenant-templates?tenantId=${this.tenantId}`);
        const data = await response.json();

        this.tenantBranding = data.config || {
          tier: 'starter',
          brand: {
            primaryColor: '#0066ff',
            companyName: 'Demo'
          }
        };

        // Apply generated CSS if available
        if (data.generatedCSS) {
          const style = document.createElement('style');
          style.textContent = data.generatedCSS.modal || '';
          document.head.appendChild(style);
        }

        this.diagnostics?.log('choreographer', 'tenant_config_loaded', {
          tier: this.tenantBranding.tier
        }, 'info');

      } catch (error) {
        console.error('Failed to fetch tenant config:', error);
        this.tenantBranding = { tier: 'starter', brand: {} };
      }
    }

    connectWebSocket() {
      const wsUrl = `${this.wsEndpoint}?session=${this.sessionId}&tenant=${this.tenantId}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('📡 WebSocket connected');
        this.reconnectAttempts = 0;

        this.diagnostics?.log('websocket', 'connected', {
          url: wsUrl
        }, 'info');

        // Register as intervention receiver
        this.ws.send(JSON.stringify({
          type: 'register',
          channel: 'interventions',
          sessionId: this.sessionId,
          tenantId: this.tenantId
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          this.diagnostics?.log('websocket', 'message_received', message, 'debug', message.correlationId);

          if (message.type === 'intervention') {
            this.handleIntervention(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        this.diagnostics?.log('websocket', 'error', error, 'error');
      };

      this.ws.onclose = () => {
        this.diagnostics?.log('websocket', 'disconnected', {
          attempts: this.reconnectAttempts
        }, 'warn');

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connectWebSocket();
          }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
      };
    }

    handleIntervention(message) {
      const correlationId = message.correlationId || 'int-' + Date.now();

      this.diagnostics?.log('choreographer', 'intervention_received', message, 'info', correlationId);

      // Create intervention object
      const intervention = {
        type: message.interventionType || 'toast',
        template: message.template || 'default',
        timing: {
          delay: message.timing?.delay || 0,
          duration: message.timing?.duration || 10000,
          persistence: message.timing?.persistence || 'timed'
        },
        content: {
          headline: message.content?.headline || 'Special Offer',
          body: message.content?.body || 'Just for you!',
          cta: message.content?.cta || 'Learn More',
          discount: message.discount
        },
        correlationId
      };

      // Schedule rendering
      setTimeout(() => {
        if (this.renderer) {
          const id = this.renderer.render(intervention);

          // Track impression
          this.recordBehavior('intervention_shown', {
            id,
            type: intervention.type,
            template: intervention.template
          });
        }
      }, intervention.timing.delay);
    }

    startTelemetryCollection() {
      // Click tracking
      document.addEventListener('click', (e) => {
        const target = e.target;
        const data = {
          tag: target.tagName,
          id: target.id,
          classes: target.className,
          text: target.innerText?.substring(0, 50),
          href: target.href,
          position: { x: e.clientX, y: e.clientY }
        };

        this.recordBehavior('click', data);
      });

      // Form tracking
      document.addEventListener('submit', (e) => {
        const form = e.target;
        this.recordBehavior('form_submit', {
          id: form.id,
          action: form.action,
          method: form.method
        });
      });

      // Page visibility
      document.addEventListener('visibilitychange', () => {
        this.recordBehavior('visibility_change', {
          hidden: document.hidden,
          timestamp: Date.now()
        });
      });

      // Unload warning for cart abandonment
      window.addEventListener('beforeunload', () => {
        if (this.eventQueue.length > 0) {
          this.flushEvents();
        }
      });
    }

    recordBehavior(event, data = {}) {
      const telemetryEvent = {
        event,
        data,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        tenantId: this.tenantId,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      this.eventQueue.push(telemetryEvent);

      // Send immediately for critical events
      if (['exit_intent', 'rage_scroll', 'form_submit'].includes(event)) {
        this.flushEvents();
      }
    }

    startBatchProcessor() {
      setInterval(() => {
        if (this.eventQueue.length >= this.batchSize) {
          this.flushEvents();
        }
      }, this.batchInterval);
    }

    async flushEvents() {
      if (this.eventQueue.length === 0) return;

      const events = [...this.eventQueue];
      this.eventQueue = [];

      try {
        const correlationId = 'batch-' + Date.now();

        this.diagnostics?.log('choreographer', 'sending_telemetry', {
          count: events.length
        }, 'debug', correlationId);

        const response = await fetch(`${this.apiEndpoint}/api/telemetry/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.sessionId,
            tenant_id: this.tenantId,
            events
          })
        });

        const result = await response.json();

        this.diagnostics?.log('processor', 'telemetry_processed', result, 'info', correlationId);

      } catch (error) {
        console.error('Failed to send telemetry:', error);
        // Re-queue events
        this.eventQueue.unshift(...events);
      }
    }

    handleInteraction(id, intervention) {
      this.diagnostics?.log('renderer', 'intervention_clicked', {
        id,
        type: intervention.type
      }, 'info', intervention.correlationId);

      // Track conversion
      this.recordBehavior('intervention_clicked', {
        id,
        type: intervention.type,
        template: intervention.template,
        discount: intervention.content.discount
      });

      // Send feedback
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'intervention_feedback',
          sessionId: this.sessionId,
          interventionType: intervention.type,
          interacted: true,
          timestamp: Date.now()
        }));
      }

      // Apply discount if present
      if (intervention.content.discount) {
        this.applyDiscount(intervention.content.discount);
      }

      // Dismiss after interaction
      this.dismissIntervention(id);
    }

    dismissIntervention(id) {
      const element = document.getElementById(id);
      if (element) {
        element.style.animation = 'fadeOut 0.3s';
        setTimeout(() => element.remove(), 300);
      }

      this.renderer?.activeInterventions.delete(id);
    }

    applyDiscount(percent) {
      // Generate discount code
      const code = 'SENTIENT' + percent + Math.random().toString(36).substring(2, 6).toUpperCase();

      // Store in session
      sessionStorage.setItem('sentientiq_discount', JSON.stringify({
        code,
        percent,
        timestamp: Date.now()
      }));

      // Try to apply to page (Shopify, WooCommerce, etc)
      const discountInputs = document.querySelectorAll('[name*="discount"], [name*="coupon"], [name*="promo"]');
      discountInputs.forEach(input => {
        input.value = code;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // Show confirmation
      this.showDiscountConfirmation(code, percent);
    }

    showDiscountConfirmation(code, percent) {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: #10b981; color: white;
        padding: 16px 24px; border-radius: 8px;
        font-weight: bold; z-index: 999999;
        animation: slideDown 0.3s;
      `;
      toast.innerHTML = `✅ ${percent}% discount applied! Code: ${code}`;
      document.body.appendChild(toast);

      setTimeout(() => toast.remove(), 5000);
    }
  }

  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .sentientiq-cta {
      background: #0066ff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }

    .sentientiq-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    }

    .sentientiq-content {
      background: white;
      padding: 32px;
      border-radius: 12px;
      max-width: 500px;
      text-align: center;
    }
  `;
  document.head.appendChild(style);

  // Initialize
  window.SentientIQTelemetry = new SentientIQTelemetry();

  // Expose for debugging
  window.sentientiq = window.SentientIQTelemetry;
  console.log('🔍 Debug: window.sentientiq');

})();