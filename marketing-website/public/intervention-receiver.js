/**
 * SentientIQ Intervention Receiver v2
 * Clean WebSocket client for intervention delivery
 */

(function() {
  'use strict';

  // Configuration
  const API_ENDPOINT = 'wss://api.sentientiq.app/ws';
  const CHANNEL = 'interventions';

  // Session ID will be set from telemetry or created as fallback
  let sessionId = null;

  // Get tenant ID from window.SentientIQ (set by GTM) or script tag
  const scriptTag = document.currentScript || document.querySelector('script[src*="intervention-receiver"]');
  const tenantId = window.SentientIQ?.tenantId ||
    scriptTag?.getAttribute('data-tenant-id') ||
    localStorage.getItem('tenantId') ||
    'unknown';

  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnects = 5;
  let reconnectTimer = null;

  function connect() {
    // Always use the session ID from sessionStorage (set by telemetry)
    const currentSessionId = sessionStorage.getItem('sq_session_id');

    if (!currentSessionId) {
      console.error('❌ No session ID found, cannot connect to interventions');
      return;
    }

    // Build connection URL with parameters
    const wsUrl = `${API_ENDPOINT}?channel=${CHANNEL}&session=${currentSessionId}&tenant=${tenantId}`;

    console.log('🔌 Connecting to SentientIQ interventions...');
    console.log('📍 Session ID:', currentSessionId);
    console.log('🏢 Tenant ID:', tenantId);

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ Connected to intervention system');
        reconnectAttempts = 0;
        clearTimeout(reconnectTimer);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        ws = null;
        attemptReconnect();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      attemptReconnect();
    }
  }

  function attemptReconnect() {
    if (reconnectAttempts >= maxReconnects) {
      console.log('Max reconnection attempts reached');
      return;
    }

    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    console.log(`Reconnecting in ${delay/1000}s... (attempt ${reconnectAttempts}/${maxReconnects})`);

    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  }

  function handleMessage(data) {
    switch(data.type) {
      case 'connected':
        console.log('✅ Intervention channel ready');
        break;

      case 'intervention':
        console.log(`🎯 Intervention received: ${data.intervention_type || data.intervention}`);
        showIntervention(data.intervention_type || data.intervention);
        break;

      case 'pong':
        // Keep-alive response
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  function showIntervention(type) {
    // Send acknowledgment
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'intervention_shown',
        intervention: type,
        timestamp: new Date().toISOString()
      }));
    }

    // Remove any existing interventions
    document.querySelectorAll('.sq-intervention').forEach(el => el.remove());

    // Display intervention based on type
    switch(type) {
      case 'exit_intent':
        showExitModal();
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
      // CART ABANDONMENT INTERVENTIONS
      case 'save_cart_urgent':
        showCartSaveUrgent();
        break;
      case 'discount_offer':
        showDiscountOffer();
        break;
      case 'free_shipping':
        showFreeShipping();
        break;
      case 'value_proposition':
        showValueProp();
        break;
      case 'comparison_chart':
        showComparisonChart();
        break;
      case 'limited_offer':
        showLimitedOffer();
        break;
      // NEW MAPPED INTERVENTIONS
      case 'cart_save_modal':
        showCartSaveUrgent();
        break;
      case 'discount_modal':
        showDiscountOffer();
        break;
      case 'shipping_offer':
        showFreeShipping();
        break;
      case 'live_chat':
        showHelpTooltip();
        break;
      case 'value_popup':
        showValueProp();
        break;
      case 'comparison_modal':
        showComparisonChart();
        break;
      case 'urgency_banner':
        showUrgencyBanner();
        break;
      case 'payment_plan_modal':
        showPaymentPlanModal();
        break;
      case 'time_limited_discount':
        showLimitedOffer();
        break;
      case 'installments_modal':
        showInstallmentsModal();
        break;
      case 'guarantee_badge':
        showGuaranteeBadge();
        break;
      case 'trial_offer_modal':
        showTrialOfferModal();
        break;
      case 'testimonial_popup':
        showTestimonialPopup();
        break;
      default:
        console.log('Unknown intervention type:', type);
    }
  }

  function showExitModal() {
    const modal = document.createElement('div');
    modal.className = 'sq-intervention sq-modal';
    modal.innerHTML = `
      <div class="sq-modal-overlay"></div>
      <div class="sq-modal-content">
        <button class="sq-close">&times;</button>
        <h2>Wait! Before You Go...</h2>
        <p>Get 15% off your first month with code <strong>STAY15</strong></p>
        <button class="sq-cta">Claim Discount</button>
      </div>
    `;

    document.body.appendChild(modal);
    addStyles();

    modal.querySelector('.sq-close').onclick = () => {
      modal.remove();
      trackInteraction('exit_intent', false);
    };

    modal.querySelector('.sq-cta').onclick = () => {
      modal.remove();
      trackInteraction('exit_intent', true);
    };
  }

  function showHelpTooltip() {
    const tooltip = document.createElement('div');
    tooltip.className = 'sq-intervention sq-tooltip';
    tooltip.innerHTML = `
      <div class="sq-tooltip-content">
        <button class="sq-close">&times;</button>
        <p>Need help? Chat with our team.</p>
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
      if (window.Intercom) {
        window.Intercom('show');
      }
    };
  }

  function showPriceAssistant() {
    const assistant = document.createElement('div');
    assistant.className = 'sq-intervention sq-assistant';
    assistant.innerHTML = `
      <div class="sq-assistant-content">
        <button class="sq-close">&times;</button>
        <h3>Interested in Pricing?</h3>
        <p>See how SentientIQ fits your budget</p>
        <button class="sq-demo">View Pricing</button>
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
      window.location.href = '/pricing';
    };
  }

  function showGuidanceHelper() {
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
      // Start tour or navigate to help
      window.location.href = '/tour';
    };
  }

  function trackInteraction(intervention, clicked) {
    // Send to WebSocket
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
        session_id: sessionStorage.getItem('sq_session_id') || sessionId,
        intervention_type: intervention,
        interacted: clicked,
        converted: false
      })
    }).catch(console.error);
  }

  function addStyles() {
    if (document.getElementById('sq-intervention-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'sq-intervention-styles';
    styles.innerHTML = `
      /* Base intervention styles - glassmorphic design system */
      .sq-intervention {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
        z-index: 999999;
      }

      /* Glassmorphic modal overlay */
      .sq-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 999998;
        animation: fadeIn 0.2s ease;
      }

      /* Glassmorphic modal content */
      .sq-modal-content {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.18);
        padding: 40px;
        border-radius: 16px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        max-width: 420px;
        width: 90%;
        text-align: center;
        color: #ffffff;
        z-index: 999999;
        animation: slideUpModal 0.3s ease;
      }

      .sq-modal-content h2, .sq-modal-content h3 {
        color: #ffffff;
        margin: 0 0 16px 0;
        font-weight: 600;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .sq-modal-content p {
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 20px 0;
        line-height: 1.6;
      }

      /* Glassmorphic tooltip */
      .sq-tooltip {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
        padding: 20px;
        max-width: 320px;
        animation: slideUp 0.3s ease;
        color: #ffffff;
      }

      .sq-tooltip p {
        color: rgba(255, 255, 255, 0.95);
        margin: 0 0 16px 0;
      }

      /* Glassmorphic assistant */
      .sq-assistant {
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 340px;
        box-shadow: 0 8px 32px 0 rgba(102, 126, 234, 0.3);
        animation: slideLeft 0.3s ease;
      }

      .sq-assistant h3 {
        margin: 0 0 12px 0;
        font-weight: 600;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .sq-assistant p {
        margin: 0 0 16px 0;
        opacity: 0.95;
        line-height: 1.5;
      }

      /* Glassmorphic helper */
      .sq-helper {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 12px;
        padding: 20px;
        max-width: 280px;
        box-shadow: 0 8px 32px 0 rgba(59, 130, 246, 0.2);
        animation: slideRight 0.3s ease;
        color: #ffffff;
      }

      .sq-helper p {
        color: rgba(255, 255, 255, 0.95);
        margin: 0 0 16px 0;
      }

      /* Close button - glassmorphic */
      .sq-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.8);
        transition: all 0.2s ease;
      }

      .sq-close:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
        transform: scale(1.1);
      }

      /* Primary CTA buttons - glassmorphic */
      .sq-cta, .sq-chat, .sq-demo, .sq-guide, .sq-claim {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        margin-top: 16px;
        width: 100%;
        transition: all 0.2s ease;
        box-shadow: 0 4px 16px 0 rgba(59, 130, 246, 0.3);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .sq-cta:hover, .sq-chat:hover, .sq-demo:hover, .sq-guide:hover, .sq-claim:hover {
        background: linear-gradient(135deg, rgba(37, 99, 235, 1) 0%, rgba(29, 78, 216, 1) 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px 0 rgba(59, 130, 246, 0.4);
      }

      /* Urgency banners - glassmorphic */
      .sq-urgent-cart .sq-urgent-content,
      .sq-urgency-banner > div {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px 0 rgba(239, 68, 68, 0.3);
      }

      /* Value proposition cards - glassmorphic */
      .sq-value > div {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(34, 197, 94, 0.3);
        color: #ffffff;
        box-shadow: 0 8px 32px 0 rgba(34, 197, 94, 0.2);
      }

      .sq-value ul {
        color: rgba(255, 255, 255, 0.95);
      }

      /* Comparison modal - glassmorphic update */
      .sq-comparison .sq-modal-content {
        max-width: 540px;
      }

      .sq-comparison table {
        color: rgba(255, 255, 255, 0.95);
      }

      .sq-comparison th {
        padding: 12px;
        font-weight: 600;
      }

      .sq-comparison td {
        padding: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .sq-comparison tr:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      /* Discount offers - glassmorphic */
      .sq-discount-content {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* Limited offer - glassmorphic */
      .sq-limited > div {
        background: linear-gradient(135deg, rgba(240, 147, 251, 0.95) 0%, rgba(245, 87, 108, 0.95) 100%);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* Shipping banner - glassmorphic */
      .sq-shipping-bar {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(34, 197, 94, 0.95) 100%);
        backdrop-filter: blur(12px) saturate(180%);
        -webkit-backdrop-filter: blur(12px) saturate(180%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* Guarantee badge - glassmorphic */
      .sq-guarantee > div {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(16, 185, 129, 0.95) 100%);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* Secondary buttons */
      .sq-intervention button.secondary {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
      }

      .sq-intervention button.secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* Highlight boxes */
      .sq-highlight {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 12px;
        margin: 16px 0;
      }

      /* Animations */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes slideUpModal {
        from { transform: translate(-50%, -45%); opacity: 0; }
        to { transform: translate(-50%, -50%); opacity: 1; }
      }

      @keyframes slideLeft {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slideRight {
        from { transform: translateX(-100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      /* Responsive adjustments */
      @media (max-width: 640px) {
        .sq-modal-content {
          padding: 24px;
          width: 95%;
        }

        .sq-assistant, .sq-tooltip, .sq-helper {
          left: 10px;
          right: 10px;
          max-width: calc(100% - 20px);
        }
      }

      /* Dark mode detection support */
      @media (prefers-color-scheme: light) {
        .sq-modal-content,
        .sq-tooltip,
        .sq-helper {
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%);
        }
      }
    `;

    document.head.appendChild(styles);
  }

  // CART ABANDONMENT INTERVENTIONS - THE MONEY MAKERS

  function showCartSaveUrgent() {
    const urgent = document.createElement('div');
    urgent.className = 'sq-intervention sq-urgent-cart';
    urgent.innerHTML = `
      <div class="sq-urgent-content" style="
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 24px;
        border-radius: 16px;
        max-width: 360px;
        animation: slideLeft 0.4s ease-out;
        z-index: 10000;
      ">
        <button class="sq-close">&times;</button>
        <h3 style="margin: 0 0 12px 0; color: white; font-weight: 600;">⚡ Wait! Don't leave yet!</h3>
        <p style="margin: 0 0 16px 0; color: rgba(255, 255, 255, 0.95);">Complete your order in the next 5 minutes and get:</p>
        <div class="sq-highlight">
          <strong style="font-size: 20px; color: #fbbf24;">15% OFF</strong>
          <span style="color: rgba(255, 255, 255, 0.9);">your entire order</span><br>
          <small style="opacity: 0.8;">Code: SAVE15NOW</small>
        </div>
        <button class="sq-claim" style="
          background: rgba(255, 255, 255, 0.95);
          color: #dc2626;
          font-weight: 600;
        ">Apply Discount & Checkout</button>
      </div>
    `;
    document.body.appendChild(urgent);
    addStyles();

    urgent.querySelector('.sq-close').onclick = () => {
      urgent.remove();
      trackInteraction('save_cart_urgent', false);
    };

    urgent.querySelector('.sq-claim').onclick = () => {
      urgent.remove();
      trackInteraction('save_cart_urgent', true);
      // Apply discount code and redirect to checkout
      if (window.applyDiscount) window.applyDiscount('SAVE15NOW');
    };
  }

  async function showDiscountOffer() {
    const discount = document.createElement('div');
    discount.className = 'sq-intervention sq-discount';

    // Generate dynamic discount code
    const sessionId = window.sentientSession || 'guest';
    const discountCode = `SAVE10_${sessionId.slice(-6).toUpperCase()}`;

    discount.innerHTML = `
      <div class="sq-discount-content" style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 24px 40px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 24px;
        box-shadow:
          0 8px 32px 0 rgba(31, 38, 135, 0.37),
          0 0 0 1px rgba(255, 255, 255, 0.1) inset,
          0 2px 8px -2px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.4s ease-out;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 24px;
      ">
        <div style="
          font-size: 40px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          animation: pulse 2s infinite;
        ">💰</div>
        <div>
          <strong style="
            color: rgba(255, 255, 255, 0.95);
            font-size: 18px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          ">Price too high?</strong>
          <div style="
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin-top: 4px;
          ">Here's 10% off with code: <span style="
            background: rgba(255, 255, 255, 0.2);
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-weight: bold;
          ">${discountCode}</span></div>
          <div style="
            opacity: 0.7;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 4px;
          ">Click to copy • Valid for 24 hours</div>
        </div>
        <button style="
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s ease;
          box-shadow:
            0 4px 12px rgba(124, 58, 237, 0.3),
            0 1px 2px rgba(0, 0, 0, 0.2) inset;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Apply Discount</button>
      </div>
    `;
    document.body.appendChild(discount);
    addStyles();

    setTimeout(() => discount.remove(), 12000);

    discount.querySelector('button').onclick = () => {
      // Copy code to clipboard
      navigator.clipboard.writeText(discountCode).then(() => {
        const button = discount.querySelector('button');
        button.textContent = 'Copied! ✓';
        button.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(34, 197, 94, 0.9) 100%)';
        setTimeout(() => discount.remove(), 1500);
      }).catch(() => {
        // Fallback if clipboard API fails
        alert(`Discount code: ${discountCode}`);
        discount.remove();
      });
      trackInteraction('discount_offer', true, { code: discountCode });

      // Track discount generation
      fetch('https://api.sentientiq.app/api/track-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCode,
          session_id: sessionId,
          intervention: 'price_shock_recovery'
        })
      }).catch(() => {}); // Silent fail
    };
  }

  function showFreeShipping() {
    const shipping = document.createElement('div');
    shipping.className = 'sq-intervention sq-shipping';
    shipping.innerHTML = `
      <div class="sq-shipping-bar" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        padding: 12px;
        text-align: center;
        font-weight: 600;
        color: white;
        animation: slideDown 0.3s ease-out;
        z-index: 10000;
      ">
        🚚 FREE SHIPPING unlocked for the next 10 minutes! No minimum order.
        <button style="
          margin-left: 20px;
          background: rgba(255, 255, 255, 0.95);
          color: #059669;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        ">Checkout Now</button>
      </div>
    `;
    document.body.appendChild(shipping);
    addStyles();

    shipping.querySelector('button').onclick = () => {
      shipping.remove();
      trackInteraction('free_shipping', true);
    };
  }

  function showValueProp() {
    // Show value proposition for sticker shock
    const value = document.createElement('div');
    value.className = 'sq-intervention sq-value';
    value.innerHTML = `
      <div style="
        position: fixed;
        bottom: 80px;
        right: 20px;
        padding: 20px;
        border-radius: 12px;
        max-width: 320px;
        z-index: 10000;
        animation: slideUp 0.3s ease-out;
      ">
        <div style="color: #10b981; font-weight: 600; margin-bottom: 12px; font-size: 16px;">
          ✓ Why it's worth it:
        </div>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
          <li>Save 10+ hours per week</li>
          <li>30-day money-back guarantee</li>
          <li>Trusted by 10,000+ businesses</li>
        </ul>
      </div>
    `;
    document.body.appendChild(value);
    addStyles();
    setTimeout(() => value.remove(), 10000);
  }

  function showComparisonChart() {
    // Show comparison for comparison shoppers
    const comparison = document.createElement('div');
    comparison.className = 'sq-intervention sq-comparison';
    comparison.innerHTML = `
      <div class="sq-modal-overlay"></div>
      <div class="sq-modal-content">
        <button class="sq-close">&times;</button>
        <h3>Why Choose Us?</h3>
        <table style="width: 100%; margin: 20px 0;">
          <tr>
            <th style="text-align: left; padding: 8px;"></th>
            <th style="color: #10b981; padding: 8px;">Us ✓</th>
            <th style="color: rgba(255, 255, 255, 0.5); padding: 8px;">Competitor A</th>
            <th style="color: rgba(255, 255, 255, 0.5); padding: 8px;">Competitor B</th>
          </tr>
          <tr>
            <td style="padding: 8px;">Real-time Emotions</td>
            <td style="padding: 8px; text-align: center; color: #10b981;">✓</td>
            <td style="padding: 8px; text-align: center; color: rgba(255, 255, 255, 0.5);">✗</td>
            <td style="padding: 8px; text-align: center; color: rgba(255, 255, 255, 0.5);">✗</td>
          </tr>
          <tr>
            <td style="padding: 8px;">Pattern Learning</td>
            <td style="padding: 8px; text-align: center; color: #10b981;">✓</td>
            <td style="padding: 8px; text-align: center; color: rgba(255, 255, 255, 0.5);">✗</td>
            <td style="padding: 8px; text-align: center; color: #10b981;">✓</td>
          </tr>
          <tr>
            <td style="padding: 8px;">Auto Interventions</td>
            <td style="padding: 8px; text-align: center; color: #10b981;">✓</td>
            <td style="padding: 8px; text-align: center; color: rgba(255, 255, 255, 0.5);">✗</td>
            <td style="padding: 8px; text-align: center; color: rgba(255, 255, 255, 0.5);">✗</td>
          </tr>
        </table>
        <button class="sq-cta">Continue with the Best Choice</button>
      </div>
    `;
    document.body.appendChild(comparison);
    addStyles();

    // Close button
    comparison.querySelector('.sq-close').onclick = () => {
      comparison.remove();
      trackInteraction('comparison_chart', false);
    };

    // Overlay click to close
    comparison.querySelector('.sq-modal-overlay').onclick = () => {
      comparison.remove();
      trackInteraction('comparison_chart', false);
    };

    // CTA button
    const ctaButton = comparison.querySelector('.sq-cta');
    if (ctaButton) {
      ctaButton.onclick = () => {
        comparison.remove();
        trackInteraction('comparison_chart', true);
      };
    }
  }

  function showLimitedOffer() {
    // Second chance offer for returning users
    const limited = document.createElement('div');
    limited.className = 'sq-intervention sq-limited';
    limited.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        padding: 28px;
        border-radius: 16px;
        max-width: 340px;
        z-index: 10000;
        animation: slideLeft 0.3s ease-out;
      ">
        <div style="font-size: 24px; margin-bottom: 12px; color: white;">🎁 Welcome Back!</div>
        <p style="color: rgba(255, 255, 255, 0.95); margin-bottom: 16px;">We saved your cart and added something special...</p>
        <div class="sq-highlight">
          <strong style="font-size: 18px; color: #fbbf24;">20% OFF</strong>
          <span style="color: rgba(255, 255, 255, 0.9);"> - Expires in 1 hour</span>
        </div>
        <button class="sq-claim" style="
          background: rgba(255, 255, 255, 0.95);
          color: #ec4899;
          font-weight: 600;
        ">Claim My Discount</button>
      </div>
    `;
    document.body.appendChild(limited);
    addStyles();

    limited.querySelector('.sq-claim').onclick = () => {
      limited.remove();
      trackInteraction('limited_offer', true);
    };
  }

  // Additional intervention functions for mapped types
  function showUrgencyBanner() {
    const banner = document.createElement('div');
    banner.className = 'sq-intervention sq-urgency-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(90deg, #ff6b6b, #ff5252);
        color: white;
        padding: 12px;
        text-align: center;
        font-weight: bold;
        z-index: 10000;
        animation: slideDown 0.3s ease-out;
      ">
        ⏰ Limited Time: Free shipping ends in 2 hours!
        <button style="
          margin-left: 20px;
          background: white;
          color: #ff5252;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">Shop Now</button>
      </div>
    `;
    document.body.appendChild(banner);
    addStyles();

    setTimeout(() => banner.remove(), 10000); // Auto-remove after 10s
  }

  function showPaymentPlanModal() {
    const modal = document.createElement('div');
    modal.className = 'sq-intervention sq-payment-plan';
    modal.innerHTML = `
      <div class="sq-modal-overlay"></div>
      <div class="sq-modal-content">
        <button class="sq-close">&times;</button>
        <h2>Split Your Payment</h2>
        <p>Make it easier with our payment plans:</p>
        <div class="sq-highlight">
          <strong style="font-size: 18px; color: #60a5fa;">3 Easy Payments</strong>
          <div style="margin-top: 4px;">of $33/month</div>
        </div>
        <button class="sq-cta">Choose Payment Plan</button>
      </div>
    `;
    document.body.appendChild(modal);
    addStyles();

    modal.querySelector('.sq-close').onclick = () => modal.remove();
    modal.querySelector('.sq-modal-overlay').onclick = () => modal.remove();
  }

  function showInstallmentsModal() {
    showPaymentPlanModal(); // Reuse payment plan modal
  }

  function showGuaranteeBadge() {
    const badge = document.createElement('div');
    badge.className = 'sq-intervention sq-guarantee';
    badge.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideLeft 0.4s ease-out;
      ">
        <div style="font-size: 24px; color: white;">✓</div>
        <div>
          <strong style="color: white;">30-Day Money Back Guarantee</strong>
          <div style="font-size: 13px; opacity: 0.9; color: rgba(255, 255, 255, 0.9);">No questions asked</div>
        </div>
      </div>
    `;
    document.body.appendChild(badge);
    addStyles();

    setTimeout(() => badge.remove(), 8000); // Auto-remove after 8s
  }

  function showTrialOfferModal() {
    const modal = document.createElement('div');
    modal.className = 'sq-intervention sq-trial';
    modal.innerHTML = `
      <div class="sq-modal-overlay"></div>
      <div class="sq-modal-content">
        <button class="sq-close">&times;</button>
        <div style="font-size: 48px; margin-bottom: 12px;">🎯</div>
        <h2>Try Risk-Free for 14 Days</h2>
        <p>No credit card required. Full access to all features.</p>
        <button class="sq-cta">Start Free Trial</button>
      </div>
    `;
    document.body.appendChild(modal);
    addStyles();

    modal.querySelector('.sq-close').onclick = () => modal.remove();
    modal.querySelector('.sq-modal-overlay').onclick = () => modal.remove();
  }

  function showTestimonialPopup() {
    const popup = document.createElement('div');
    popup.className = 'sq-intervention sq-testimonial';
    popup.innerHTML = `
      <div class="sq-tooltip" style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: auto;
        animation: slideRight 0.4s ease-out;
      ">
        <button class="sq-close">&times;</button>
        <div style="display: flex; gap: 10px; margin-bottom: 12px;">
          <div style="filter: grayscale(0%) brightness(1.2);">⭐⭐⭐⭐⭐</div>
        </div>
        <p style="font-style: italic; color: rgba(255, 255, 255, 0.95); line-height: 1.5;">
          "SentientIQ increased our conversion rate by 34% in just 2 weeks!"
        </p>
        <div style="font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-top: 10px;">
          — Sarah Chen, VP Product
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    popup.querySelector('.sq-close').onclick = () => popup.remove();
    setTimeout(() => popup.remove(), 10000); // Auto-remove after 10s
  }

  // Keep connection alive
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);

  // Initialize connection - wait for telemetry to set session ID
  function waitForSessionAndConnect(attempts = 0) {
    const storedSessionId = sessionStorage.getItem('sq_session_id');

    if (storedSessionId) {
      sessionId = storedSessionId; // Update the global sessionId variable
      console.log('✅ Session ID found from telemetry, connecting...', sessionId);
      connect();
    } else if (attempts < 50) { // Try for up to 5 seconds
      // Telemetry hasn't set the session yet, wait and retry
      setTimeout(() => waitForSessionAndConnect(attempts + 1), 100);
    } else {
      // Fallback: create our own session if telemetry never loads
      console.warn('⚠️ Telemetry session not found after 5s, using fallback');
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem('sq_session_id', sessionId);
      connect();
    }
  }

  // Start initialization
  waitForSessionAndConnect();

  // Export for debugging
  window.SentientIQInterventions = {
    ws: () => ws,
    getSessionId: () => sessionStorage.getItem('sq_session_id'),
    getTenantId: () => tenantId,
    reconnect: connect,
    showIntervention: showIntervention,
    // Backwards compatibility
    sessionId: () => sessionStorage.getItem('sq_session_id')
  };

})();