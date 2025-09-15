/**
 * SentientIQ Intervention Receiver
 * Lightweight client that receives interventions from backend via WebSocket
 */

(function() {
  'use strict';

  // Configuration
  const WS_ENDPOINT = 'wss://api.sentientiq.app/ws';
  const sessionId = sessionStorage.getItem('sq_session_id') ||
    localStorage.getItem('sq_session_id') ||
    `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tenantId = localStorage.getItem('tenantId') || 'unknown';

  // Store session ID
  sessionStorage.setItem('sq_session_id', sessionId);

  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnects = 5;

  /**
   * Connect to WebSocket server
   */
  function connect() {
    try {
      ws = new WebSocket(`${WS_ENDPOINT}?session=${sessionId}&tenant=${tenantId}`);

      ws.onopen = () => {
        console.log('🔌 SentientIQ intervention channel open');
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 SentientIQ intervention channel closed');
        attemptReconnect();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  function attemptReconnect() {
    if (reconnectAttempts >= maxReconnects) {
      console.log('Max reconnection attempts reached');
      return;
    }

    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${reconnectAttempts})`);
      connect();
    }, delay);
  }

  /**
   * Handle incoming messages
   */
  function handleMessage(data) {
    switch (data.type) {
      case 'connected':
        console.log('✅ Connected to intervention system');
        break;

      case 'intervention':
        showIntervention(data.intervention);
        break;

      case 'pong':
        // Keep-alive response
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Display intervention to user
   */
  function showIntervention(type) {
    console.log(`🎯 Intervention triggered: ${type}`);

    // Send acknowledgment
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'intervention_shown',
        intervention: type,
        timestamp: new Date().toISOString()
      }));
    }

    // Display based on type
    switch (type) {
      case 'exit_intent':
        showExitIntentModal();
        break;

      case 'help_offer':
        showHelpTooltip();
        break;

      case 'price_assist':
        showPriceAssistant();
        break;

      case 'guidance':
        showGuidanceHelper();
        break;

      default:
        console.log('Unknown intervention type:', type);
    }
  }

  /**
   * Exit Intent Modal
   */
  function showExitIntentModal() {
    removeExistingInterventions();

    const modal = document.createElement('div');
    modal.className = 'sq-intervention sq-modal';
    modal.innerHTML = `
      <div class="sq-modal-overlay"></div>
      <div class="sq-modal-content">
        <button class="sq-close">&times;</button>
        <h2>Wait! Before You Go...</h2>
        <p>Get 15% off your first order with code <strong>STAY15</strong></p>
        <button class="sq-cta">Claim Discount</button>
      </div>
    `;

    document.body.appendChild(modal);
    addStyles();

    // Event handlers
    modal.querySelector('.sq-close').onclick = () => {
      modal.remove();
      trackInteraction('exit_intent', false);
    };

    modal.querySelector('.sq-cta').onclick = () => {
      modal.remove();
      trackInteraction('exit_intent', true);
      // Apply discount code logic here
    };
  }

  /**
   * Help Tooltip
   */
  function showHelpTooltip() {
    removeExistingInterventions();

    const tooltip = document.createElement('div');
    tooltip.className = 'sq-intervention sq-tooltip';
    tooltip.innerHTML = `
      <div class="sq-tooltip-content">
        <button class="sq-close">&times;</button>
        <p>Need help? Our team is here to assist you.</p>
        <button class="sq-chat">Start Chat</button>
      </div>
    `;

    document.body.appendChild(tooltip);
    addStyles();

    tooltip.querySelector('.sq-close').onclick = () => {
      tooltip.remove();
      trackInteraction('help_offer', false);
    };

    tooltip.querySelector('.sq-chat').onclick = () => {
      tooltip.remove();
      trackInteraction('help_offer', true);
      // Open chat widget
    };
  }

  /**
   * Price Assistant
   */
  function showPriceAssistant() {
    removeExistingInterventions();

    const assistant = document.createElement('div');
    assistant.className = 'sq-intervention sq-assistant';
    assistant.innerHTML = `
      <div class="sq-assistant-content">
        <button class="sq-close">&times;</button>
        <h3>Interested in Pricing?</h3>
        <p>We have flexible plans starting at $497/month</p>
        <button class="sq-demo">See Demo</button>
      </div>
    `;

    document.body.appendChild(assistant);
    addStyles();

    assistant.querySelector('.sq-close').onclick = () => {
      assistant.remove();
      trackInteraction('price_assist', false);
    };

    assistant.querySelector('.sq-demo').onclick = () => {
      assistant.remove();
      trackInteraction('price_assist', true);
      // Navigate to demo
    };
  }

  /**
   * Guidance Helper
   */
  function showGuidanceHelper() {
    removeExistingInterventions();

    const helper = document.createElement('div');
    helper.className = 'sq-intervention sq-helper';
    helper.innerHTML = `
      <div class="sq-helper-content">
        <button class="sq-close">&times;</button>
        <p>Looking for something specific?</p>
        <button class="sq-guide">Show Me Around</button>
      </div>
    `;

    document.body.appendChild(helper);
    addStyles();

    helper.querySelector('.sq-close').onclick = () => {
      helper.remove();
      trackInteraction('guidance', false);
    };

    helper.querySelector('.sq-guide').onclick = () => {
      helper.remove();
      trackInteraction('guidance', true);
      // Start guided tour
    };
  }

  /**
   * Track intervention interaction
   */
  function trackInteraction(intervention, clicked) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'intervention_clicked',
        intervention: intervention,
        clicked: clicked,
        timestamp: new Date().toISOString()
      }));
    }

    // Also send to API
    fetch('https://api.sentientiq.app/api/emotional/intervention-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        intervention_type: intervention,
        interacted: clicked,
        converted: false // Will be updated later if conversion happens
      })
    }).catch(console.error);
  }

  /**
   * Remove existing interventions
   */
  function removeExistingInterventions() {
    document.querySelectorAll('.sq-intervention').forEach(el => el.remove());
  }

  /**
   * Add styles (only once)
   */
  function addStyles() {
    if (document.getElementById('sq-intervention-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'sq-intervention-styles';
    styles.innerHTML = `
      .sq-intervention {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        z-index: 999999;
      }

      /* Modal */
      .sq-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
      }

      .sq-modal-content {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        max-width: 400px;
        width: 90%;
      }

      /* Tooltip */
      .sq-tooltip {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        padding: 20px;
        max-width: 300px;
        animation: slideUp 0.3s ease;
      }

      /* Assistant */
      .sq-assistant {
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 320px;
        animation: slideLeft 0.3s ease;
      }

      /* Helper */
      .sq-helper {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #f8f9fa;
        border: 2px solid #007bff;
        border-radius: 8px;
        padding: 20px;
        max-width: 280px;
        animation: slideRight 0.3s ease;
      }

      /* Common styles */
      .sq-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        opacity: 0.6;
      }

      .sq-close:hover {
        opacity: 1;
      }

      .sq-cta, .sq-chat, .sq-demo, .sq-guide {
        background: #007bff;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 16px;
        width: 100%;
      }

      .sq-cta:hover, .sq-chat:hover, .sq-demo:hover, .sq-guide:hover {
        background: #0056b3;
      }

      /* Animations */
      @keyframes slideUp {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes slideLeft {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slideRight {
        from { transform: translateX(-100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;

    document.head.appendChild(styles);
  }

  // Keep connection alive
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);

  // Initialize connection
  connect();

  // Export for debugging
  window.SentientIQInterventions = {
    ws: ws,
    sessionId: sessionId,
    showIntervention: showIntervention,
    connect: connect
  };

})();