/**
 * SentientIQ Intervention Receiver v2
 * Clean WebSocket client for intervention delivery
 */

(function() {
  'use strict';

  // Configuration
  const API_ENDPOINT = 'wss://api.sentientiq.app/ws';
  const CHANNEL = 'interventions';

  // Get session ID from telemetry (it should have already set it in sessionStorage)
  let sessionId = sessionStorage.getItem('sq_session_id');

  // If no session ID yet, create one (but telemetry should have set it)
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('sq_session_id', sessionId);
    console.warn('⚠️ Session ID not found from telemetry, creating new one:', sessionId);
  }

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
        session_id: sessionId,
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
      .sq-intervention {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 999999;
      }

      /* Modal styles */
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
        text-align: center;
      }

      /* Tooltip styles */
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

      /* Assistant styles */
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

      .sq-assistant h3 {
        margin: 0 0 10px 0;
      }

      /* Helper styles */
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
        color: inherit;
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

  // CART ABANDONMENT INTERVENTIONS - THE MONEY MAKERS

  function showCartSaveUrgent() {
    const urgent = document.createElement('div');
    urgent.className = 'sq-intervention sq-urgent-cart';
    urgent.innerHTML = `
      <div class="sq-urgent-content" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff6b6b, #ff5252);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        max-width: 350px;
        animation: slideLeft 0.4s ease-out;
        z-index: 10000;
      ">
        <button class="sq-close" style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        ">&times;</button>
        <h3 style="margin: 0 0 10px 0;">⚡ Wait! Don't leave yet!</h3>
        <p style="margin: 0 0 15px 0;">Complete your order in the next 5 minutes and get:</p>
        <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
          <strong style="font-size: 20px;">15% OFF</strong> your entire order<br>
          <small>Code: SAVE15NOW</small>
        </div>
        <button class="sq-claim" style="
          background: white;
          color: #ff5252;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          width: 100%;
        ">Apply Discount & Checkout</button>
      </div>
    `;
    document.body.appendChild(urgent);

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

  function showDiscountOffer() {
    const discount = document.createElement('div');
    discount.className = 'sq-intervention sq-discount';
    discount.innerHTML = `
      <div class="sq-discount-content" style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 20px 30px;
        border-radius: 50px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        animation: slideUp 0.4s ease-out;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 20px;
      ">
        <div style="font-size: 32px;">💰</div>
        <div>
          <strong>Price too high?</strong> Here's 10% off!
          <div style="opacity: 0.8; font-size: 14px;">Auto-applied at checkout</div>
        </div>
        <button style="
          background: white;
          color: #667eea;
          border: none;
          padding: 10px 20px;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
        ">Continue</button>
      </div>
    `;
    document.body.appendChild(discount);

    setTimeout(() => discount.remove(), 8000);

    discount.querySelector('button').onclick = () => {
      discount.remove();
      trackInteraction('discount_offer', true);
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
        background: linear-gradient(90deg, #00b09b, #96c93d);
        color: white;
        padding: 12px;
        text-align: center;
        font-weight: bold;
        animation: slideDown 0.3s ease-out;
        z-index: 10000;
      ">
        🚚 FREE SHIPPING unlocked for the next 10 minutes! No minimum order.
        <button style="
          margin-left: 20px;
          background: white;
          color: #00b09b;
          border: none;
          padding: 6px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">Checkout Now</button>
      </div>
    `;
    document.body.appendChild(shipping);

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
        background: white;
        border: 2px solid #4CAF50;
        padding: 15px;
        border-radius: 8px;
        max-width: 300px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        z-index: 10000;
      ">
        <div style="color: #4CAF50; font-weight: bold; margin-bottom: 10px;">
          ✓ Why it's worth it:
        </div>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
          <li>Save 10+ hours per week</li>
          <li>30-day money-back guarantee</li>
          <li>Trusted by 10,000+ businesses</li>
        </ul>
      </div>
    `;
    document.body.appendChild(value);
    setTimeout(() => value.remove(), 10000);
  }

  function showComparisonChart() {
    // Show comparison for comparison shoppers
    const comparison = document.createElement('div');
    comparison.className = 'sq-intervention sq-comparison';
    comparison.innerHTML = `
      <div class="sq-modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
      "></div>
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        max-width: 500px;
        z-index: 10000;
      ">
        <button class="sq-close" style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
        <h3 style="color: #333;">Why Choose Us?</h3>
        <table style="width: 100%; margin: 20px 0; color: #333;">
          <tr>
            <th style="text-align: left; padding: 8px;"></th>
            <th style="color: #4CAF50; padding: 8px;">Us ✓</th>
            <th style="color: #999; padding: 8px;">Competitor A</th>
            <th style="color: #999; padding: 8px;">Competitor B</th>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px;">Real-time Emotions</td>
            <td style="padding: 8px; text-align: center;">✓</td>
            <td style="padding: 8px; text-align: center;">✗</td>
            <td style="padding: 8px; text-align: center;">✗</td>
          </tr>
          <tr>
            <td style="padding: 8px;">Pattern Learning</td>
            <td style="padding: 8px; text-align: center;">✓</td>
            <td style="padding: 8px; text-align: center;">✗</td>
            <td style="padding: 8px; text-align: center;">✓</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px;">Auto Interventions</td>
            <td style="padding: 8px; text-align: center;">✓</td>
            <td style="padding: 8px; text-align: center;">✗</td>
            <td style="padding: 8px; text-align: center;">✗</td>
          </tr>
        </table>
        <button style="
          background: #4CAF50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
        ">Continue with the Best Choice</button>
      </div>
    `;
    document.body.appendChild(comparison);

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
    const ctaButton = comparison.querySelectorAll('button')[1]; // Second button is the CTA
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
        background: linear-gradient(135deg, #f093fb, #f5576c);
        color: white;
        padding: 25px;
        border-radius: 12px;
        max-width: 320px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        z-index: 10000;
      ">
        <div style="font-size: 24px; margin-bottom: 10px;">🎁 Welcome Back!</div>
        <p>We saved your cart and added something special...</p>
        <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; margin: 15px 0;">
          <strong>20% OFF</strong> - Expires in 1 hour
        </div>
        <button style="
          background: white;
          color: #f5576c;
          border: none;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
          font-weight: bold;
        ">Claim My Discount</button>
      </div>
    `;
    document.body.appendChild(limited);

    limited.querySelector('button').onclick = () => {
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

    setTimeout(() => banner.remove(), 10000); // Auto-remove after 10s
  }

  function showPaymentPlanModal() {
    const modal = document.createElement('div');
    modal.className = 'sq-intervention sq-payment-plan';
    modal.innerHTML = `
      <div class="sq-modal-overlay"></div>
      <div class="sq-modal-content" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        max-width: 400px;
        z-index: 10001;
      ">
        <button class="sq-close" style="position: absolute; top: 10px; right: 10px;">&times;</button>
        <h2 style="color: #333;">Split Your Payment</h2>
        <p>Make it easier with our payment plans:</p>
        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>3 Easy Payments</strong> of $33/month
        </div>
        <button style="
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
        ">Choose Payment Plan</button>
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
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideLeft 0.4s ease-out;
      ">
        <div style="font-size: 24px;">✓</div>
        <div>
          <strong>30-Day Money Back Guarantee</strong>
          <div style="font-size: 12px; opacity: 0.9;">No questions asked</div>
        </div>
      </div>
    `;
    document.body.appendChild(badge);

    setTimeout(() => badge.remove(), 8000); // Auto-remove after 8s
  }

  function showTrialOfferModal() {
    const modal = document.createElement('div');
    modal.className = 'sq-intervention sq-trial';
    modal.innerHTML = `
      <div class="sq-modal-overlay"></div>
      <div class="sq-modal-content" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
        max-width: 400px;
        z-index: 10001;
      ">
        <button class="sq-close" style="position: absolute; top: 10px; right: 10px;">&times;</button>
        <div style="font-size: 48px; margin-bottom: 10px;">🎯</div>
        <h2>Try Risk-Free for 14 Days</h2>
        <p>No credit card required. Full access to all features.</p>
        <button style="
          background: #28a745;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 20px;
        ">Start Free Trial</button>
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
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        max-width: 350px;
        z-index: 10000;
        animation: slideRight 0.4s ease-out;
      ">
        <button class="sq-close" style="position: absolute; top: 10px; right: 10px;">&times;</button>
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
          <div>⭐⭐⭐⭐⭐</div>
        </div>
        <p style="font-style: italic; color: #555;">
          "SentientIQ increased our conversion rate by 34% in just 2 weeks!"
        </p>
        <div style="font-weight: bold; color: #333; margin-top: 10px;">
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

  // Initialize connection with a small delay to ensure telemetry has loaded
  // This gives telemetry time to set the session ID in sessionStorage
  setTimeout(() => {
    const storedSessionId = sessionStorage.getItem('sq_session_id');
    if (!storedSessionId) {
      console.warn('⚠️ Telemetry may not have loaded yet, using fallback session');
    }
    connect();
  }, 100);

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