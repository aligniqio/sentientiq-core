/**
 * SentientIQ Intervention Receiver - GTM Version
 * Standalone WebSocket client for receiving interventions
 * Load this as a separate GTM tag
 */

(function() {
  'use strict';

  // Only run once
  if (window.SentientIQInterventions) {
    console.log('SentientIQ Interventions already loaded');
    return;
  }

  // Configuration
  const config = {
    wsEndpoint: 'wss://api.sentientiq.app/ws',
    channel: 'interventions',
    tenantId: window.SENTIENTIQ_TENANT_ID || localStorage.getItem('tenantId') || 'unknown',
    sessionId: sessionStorage.getItem('sq_session_id') || null,
    debug: localStorage.getItem('sq_debug') === 'true'
  };

  // Wait for session ID from telemetry
  if (!config.sessionId) {
    // Check every 100ms for session ID (set by telemetry-v5.js)
    const checkInterval = setInterval(() => {
      config.sessionId = sessionStorage.getItem('sq_session_id');
      if (config.sessionId) {
        clearInterval(checkInterval);
        initialize();
      }
    }, 100);

    // Give up after 10 seconds
    setTimeout(() => clearInterval(checkInterval), 10000);
  } else {
    initialize();
  }

  function initialize() {
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnects = 5;
    let reconnectTimer = null;

    function connect() {
      const wsUrl = `${config.wsEndpoint}?channel=${config.channel}&session=${config.sessionId}&tenant=${config.tenantId}`;

      if (config.debug) {
        console.log('🔌 Connecting to interventions:', wsUrl);
      }

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (config.debug) {
            console.log('✅ Intervention system connected');
          }
          reconnectAttempts = 0;
          clearTimeout(reconnectTimer);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleMessage(data);
          } catch (error) {
            console.error('Failed to parse intervention message:', error);
          }
        };

        ws.onclose = (event) => {
          if (config.debug) {
            console.log('WebSocket closed:', event.code, event.reason);
          }
          ws = null;
          attemptReconnect();
        };

        ws.onerror = (error) => {
          if (config.debug) {
            console.error('WebSocket error:', error);
          }
        };

      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        attemptReconnect();
      }
    }

    function attemptReconnect() {
      if (reconnectAttempts >= maxReconnects) return;

      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

      reconnectTimer = setTimeout(connect, delay);
    }

    function handleMessage(data) {
      switch(data.type) {
        case 'intervention':
          if (config.debug) {
            console.log(`🎯 Intervention: ${data.intervention}`);
          }
          showIntervention(data.intervention, data.metadata || {});
          // Send acknowledgment
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'intervention_shown',
              intervention: data.intervention,
              timestamp: new Date().toISOString()
            }));
          }
          break;
        case 'pong':
          // Keep-alive
          break;
      }
    }

    function showIntervention(type, metadata) {
      // Remove any existing interventions
      document.querySelectorAll('.sq-intervention').forEach(el => el.remove());

      // Create intervention based on type
      const intervention = createIntervention(type, metadata);
      if (intervention) {
        document.body.appendChild(intervention);

        // Track display
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'sentientiq_intervention_shown',
            intervention_type: type,
            tenant_id: config.tenantId,
            session_id: config.sessionId
          });
        }
      }
    }

    function createIntervention(type, metadata) {
      const interventions = {
        // Exit intent after price shock
        exit_intent: () => {
          const modal = document.createElement('div');
          modal.className = 'sq-intervention sq-modal';
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.5);
            animation: fadeIn 0.3s ease-out;
          `;

          modal.innerHTML = `
            <div style="
              background: white;
              padding: 40px;
              border-radius: 12px;
              max-width: 500px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              position: relative;
            ">
              <button onclick="this.closest('.sq-intervention').remove()" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
              ">&times;</button>
              <h2 style="margin: 0 0 20px; color: #333;">We noticed you're comparing prices</h2>
              <p style="color: #666; margin: 0 0 25px;">Here's what makes us different: No hidden fees, no surprise charges. The price you see is what you pay.</p>
              <button onclick="
                window.dataLayer && window.dataLayer.push({
                  event: 'sentientiq_intervention_clicked',
                  intervention_type: 'exit_intent'
                });
                window.location.href='/pricing';
              " style="
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                font-weight: bold;
              ">See transparent pricing</button>
            </div>
          `;
          return modal;
        },

        // Cart abandonment - urgency based on real patterns
        save_cart_urgent: () => {
          const toast = document.createElement('div');
          toast.className = 'sq-intervention sq-toast';
          toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff6b6b, #ff5252);
            color: white;
            padding: 20px 25px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            max-width: 380px;
            z-index: 999999;
            animation: slideInRight 0.4s ease-out;
          `;

          toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="flex: 1;">
                <h4 style="margin: 0 0 8px; font-size: 16px;">Your cart is still here</h4>
                <p style="margin: 0; opacity: 0.95; font-size: 14px;">Users who complete checkout now typically see results within 24 hours</p>
              </div>
              <button onclick="
                window.dataLayer && window.dataLayer.push({
                  event: 'sentientiq_intervention_clicked',
                  intervention_type: 'save_cart_urgent'
                });
                this.closest('.sq-intervention').remove();
              " style="
                background: white;
                color: #ff5252;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                white-space: nowrap;
              ">Complete now</button>
            </div>
          `;

          // Auto-dismiss after 10 seconds
          setTimeout(() => toast.remove(), 10000);
          return toast;
        },

        // Trust hesitation - show real security
        trust_badges: () => {
          const badges = document.createElement('div');
          badges.className = 'sq-intervention sq-trust';
          badges.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: white;
            border: 2px solid #4CAF50;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            z-index: 999999;
            animation: slideInLeft 0.4s ease-out;
          `;

          badges.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
              <svg width="24" height="24" fill="#4CAF50" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
              <div>
                <p style="margin: 0; color: #333; font-weight: bold;">Bank-level encryption</p>
                <p style="margin: 0; color: #666; font-size: 14px;">Your data is secure and never shared</p>
              </div>
            </div>
          `;

          setTimeout(() => badges.remove(), 8000);
          return badges;
        },

        // Value proposition for price shock
        value_proposition: () => {
          const value = document.createElement('div');
          value.className = 'sq-intervention sq-value';
          value.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: white;
            border-left: 4px solid #4CAF50;
            padding: 20px;
            border-radius: 8px;
            max-width: 320px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.15);
            z-index: 999999;
            animation: slideInRight 0.4s ease-out;
          `;

          value.innerHTML = `
            <h4 style="margin: 0 0 10px; color: #333;">Why this price?</h4>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
              <li>Unlimited team members</li>
              <li>Real-time emotional analytics</li>
              <li>Pattern learning AI</li>
              <li>No setup fees</li>
            </ul>
            <button onclick="this.closest('.sq-intervention').remove()" style="
              margin-top: 15px;
              background: #4CAF50;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
            ">Got it</button>
          `;

          return value;
        },

        // Demo trigger for curious but not engaged
        demo_trigger: () => {
          const demo = document.createElement('div');
          demo.className = 'sq-intervention sq-demo';
          demo.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 20px;
            border-radius: 50px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 999999;
            animation: pulse 2s infinite;
            cursor: pointer;
          `;

          demo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: bold;">See it in action</span>
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          `;

          demo.onclick = () => {
            window.dataLayer && window.dataLayer.push({
              event: 'sentientiq_intervention_clicked',
              intervention_type: 'demo_trigger'
            });
            window.location.href = '/demo';
          };

          return demo;
        }
      };

      // Add CSS animations
      if (!document.querySelector('#sq-intervention-styles')) {
        const style = document.createElement('style');
        style.id = 'sq-intervention-styles';
        style.textContent = `
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `;
        document.head.appendChild(style);
      }

      return interventions[type] ? interventions[type]() : null;
    }

    // Start connection
    connect();

    // Keep-alive ping
    setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Public API
    window.SentientIQInterventions = {
      version: '1.0',
      getSessionId: () => config.sessionId,
      getTenantId: () => config.tenantId,
      isConnected: () => ws && ws.readyState === WebSocket.OPEN
    };
  }

})();