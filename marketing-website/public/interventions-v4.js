/**
 * SentientIQ Interventions Library v4.1
 * Client-side interventions that fire based on real emotions
 * Works with detect-v4.js emotion detection engine
 *
 * Interventions included:
 * - Exit Intent Modal (abandonment_risk)
 * - Confusion Helper Tooltip (confusion/frustration)
 * - Price Hover Assistant (high_consideration)
 * - Rage Click De-escalation (frustration)
 */

(function() {
  'use strict';

  // Check if detection engine is loaded
  if (!window.SentientIQ || !window.SentientIQ.emotions) {
    console.error('[SentientIQ Interventions] Detection engine not found. Please load detect-v4.js first.');
    return;
  }

  // Intervention configuration from CDN
  let config = {
    tenantId: null,
    branding: {
      companyName: 'Your Company',
      primaryColor: '#7f5af0',
      accentColor: '#22c55e'
    },
    offers: {},
    channels: {},
    interventions: [],
    cooldowns: {
      exitIntent: 86400000, // 24 hours
      confusion: 300000,    // 5 minutes
      priceHover: 600000,   // 10 minutes
      rageClick: 300000     // 5 minutes
    }
  };

  // Track intervention state
  const interventionState = {
    fired: {},
    interacted: {},
    cooldowns: {}
  };

  // Load configuration from CDN
  async function loadConfig() {
    try {
      const tenantId = window.SentientIQ?.config?.tenantId || extractTenantId();
      if (!tenantId) {
        console.warn('[SentientIQ Interventions] No tenant ID found');
        return;
      }

      const response = await fetch(`https://sentientiq.ai/configs/${tenantId}.json`);
      if (response.ok) {
        const cdnConfig = await response.json();
        config = { ...config, ...cdnConfig };
        console.log('[SentientIQ Interventions] Configuration loaded:', config.tenantId);
      }
    } catch (error) {
      console.error('[SentientIQ Interventions] Failed to load config:', error);
    }
  }

  // Extract tenant ID from script tag
  function extractTenantId() {
    const script = document.querySelector('script[data-tenant-id]');
    return script?.getAttribute('data-tenant-id');
  }

  // Check if intervention is on cooldown
  function isOnCooldown(interventionType) {
    const lastFired = interventionState.cooldowns[interventionType];
    if (!lastFired) return false;

    const cooldownPeriod = config.cooldowns[interventionType] || 300000;
    return Date.now() - lastFired < cooldownPeriod;
  }

  // Record intervention firing - THIS MAKES IT REAL
  function recordIntervention(type, triggered = false, emotion = null) {
    interventionState.fired[type] = (interventionState.fired[type] || 0) + 1;
    interventionState.cooldowns[type] = Date.now();

    if (triggered) {
      interventionState.interacted[type] = (interventionState.interacted[type] || 0) + 1;
    }

    // Get session and user IDs
    const sessionId = window.SentientIQ?.sessionId ||
      sessionStorage.getItem('sq_session_id') ||
      'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);

    const userId = window.SentientIQ?.userId ||
      localStorage.getItem('sq_user_id') ||
      'anon_' + Date.now() + '_' + Math.random().toString(36).substring(2);

    // Save IDs for consistency
    sessionStorage.setItem('sq_session_id', sessionId);
    localStorage.setItem('sq_user_id', userId);

    // POST to API - THE CRITICAL PIECE
    const eventData = {
      tenantId: config.tenantId || 'unknown',
      type: type,
      triggerEmotion: emotion,
      confidence: 0.8, // Default confidence
      interactionOccurred: triggered,
      interactionType: triggered ? 'clicked' : 'shown',
      userId: userId,
      sessionId: sessionId,
      pageUrl: window.location.href,
      elementSelector: null
    };

    // Fire and forget - don't block UI
    fetch('https://api.sentientiq.app/api/interventions/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey || ''
      },
      body: JSON.stringify(eventData)
    }).catch(err => {
      console.warn('[SentientIQ] Failed to record event:', err);
    });

    // Also send to legacy analytics if available
    if (window.SentientIQ?.track) {
      window.SentientIQ.track('intervention_fired', {
        type,
        triggered,
        timestamp: Date.now()
      });
    }
  }

  // Create modal backdrop
  function createBackdrop() {
    const backdrop = document.createElement('div');
    backdrop.className = 'sq-modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 999998;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    setTimeout(() => backdrop.style.opacity = '1', 10);
    return backdrop;
  }

  // Create intervention styles
  function injectStyles() {
    if (document.getElementById('sq-intervention-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'sq-intervention-styles';
    styles.innerHTML = `
      @keyframes sq-slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes sq-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      @keyframes sq-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }

      .sq-intervention {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: sq-slide-up 0.3s ease;
      }

      .sq-button {
        cursor: pointer;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.2s ease;
      }

      .sq-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .sq-close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .sq-close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: rotate(90deg);
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * EXIT INTENT MODAL
   * Triggers on abandonment_risk emotion
   */
  function showExitIntentModal() {
    if (isOnCooldown('exitIntent')) return;

    const backdrop = createBackdrop();
    document.body.appendChild(backdrop);

    const modal = document.createElement('div');
    modal.className = 'sq-intervention sq-exit-modal';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      max-width: 480px;
      width: 90%;
      color: white;
    `;

    const offer = config.offers.discountPercent || 20;
    const code = config.offers.discountCode || 'SAVE20';
    const automotive = config.template === 'automotive';

    modal.innerHTML = `
      <button class="sq-close-btn">&times;</button>
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px 0; font-size: 32px;">
          ${automotive ? '🚗 Wait! Special Offer' : '⚡ Wait! Don\'t Leave Yet'}
        </h2>
        <p style="font-size: 18px; margin: 0 0 24px 0; opacity: 0.95;">
          ${automotive
            ? `Get ${config.offers.cashBackAmount || '$1,000'} cash back on your next vehicle!`
            : `Get ${offer}% off your first order with code ${code}`
          }
        </p>

        ${automotive ? `
          <div style="background: rgba(255,255,255,0.2); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 16px;">
              Plus: ${config.offers.aprOffer || '0% APR for 60 months'}
            </p>
          </div>
        ` : ''}

        <button class="sq-button sq-claim-btn" style="
          background: white;
          color: ${config.branding.primaryColor};
          font-size: 18px;
          padding: 16px 32px;
          margin-bottom: 12px;
          width: 100%;
        ">
          ${automotive ? 'Schedule Test Drive' : 'Claim Your Discount'}
        </button>

        <button class="sq-button sq-dismiss-btn" style="
          background: transparent;
          color: white;
          font-size: 14px;
          padding: 8px;
          border: 1px solid rgba(255,255,255,0.3);
        ">
          No thanks, I'll pay full price
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle interactions
    modal.querySelector('.sq-close-btn').addEventListener('click', () => {
      recordIntervention('exitIntent', false, 'abandonment_risk');
      modal.remove();
      backdrop.remove();
    });

    modal.querySelector('.sq-claim-btn').addEventListener('click', () => {
      recordIntervention('exitIntent', true, 'abandonment_risk');
      if (automotive && config.channels.supportUrl) {
        window.open(config.channels.supportUrl, '_blank');
      } else if (!automotive) {
        navigator.clipboard.writeText(code);
        alert(`Code ${code} copied to clipboard!`);
      }
      modal.remove();
      backdrop.remove();
    });

    modal.querySelector('.sq-dismiss-btn').addEventListener('click', () => {
      recordIntervention('exitIntent', false, 'abandonment_risk');
      modal.remove();
      backdrop.remove();
    });

    recordIntervention('exitIntent', false, 'abandonment_risk');
  }

  /**
   * CONFUSION HELPER TOOLTIP
   * Triggers on confusion or frustration emotions
   */
  function showConfusionHelper(element) {
    if (isOnCooldown('confusion')) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'sq-intervention sq-confusion-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: linear-gradient(135deg, ${config.branding.primaryColor}, ${config.branding.accentColor});
      color: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      max-width: 320px;
      font-size: 14px;
    `;

    const rect = element?.getBoundingClientRect() || { top: 100, left: 100 };
    tooltip.style.top = `${rect.top + window.scrollY - 80}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;

    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 20px; margin-right: 8px;">🤔</span>
        <strong>Need help?</strong>
      </div>
      <p style="margin: 0 0 12px 0;">
        ${config.template === 'automotive'
          ? 'Our experts are standing by to answer your questions about this vehicle.'
          : 'We noticed you might be having trouble. Let us help!'
        }
      </p>
      <div style="display: flex; gap: 8px;">
        <button class="sq-button sq-chat-btn" style="
          background: white;
          color: ${config.branding.primaryColor};
          padding: 8px 16px;
          font-size: 13px;
          flex: 1;
        ">
          💬 Live Chat
        </button>
        <button class="sq-button sq-guide-btn" style="
          background: rgba(255,255,255,0.2);
          color: white;
          padding: 8px 16px;
          font-size: 13px;
          flex: 1;
        ">
          📚 View Guide
        </button>
      </div>
    `;

    document.body.appendChild(tooltip);

    // Handle interactions
    tooltip.querySelector('.sq-chat-btn').addEventListener('click', () => {
      recordIntervention('confusion', true);
      // Trigger chat widget if available
      if (window.Intercom) window.Intercom('show');
      else if (window.$crisp) window.$crisp.push(['do', 'chat:open']);
      else if (config.channels.supportUrl) window.open(config.channels.supportUrl, '_blank');
      tooltip.remove();
    });

    tooltip.querySelector('.sq-guide-btn').addEventListener('click', () => {
      recordIntervention('confusion', true);
      if (config.channels.demoVideoUrl) {
        window.open(config.channels.demoVideoUrl, '_blank');
      }
      tooltip.remove();
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.style.opacity = '0';
        setTimeout(() => tooltip.remove(), 300);
      }
    }, 10000);

    recordIntervention('confusion', false);
  }

  /**
   * PRICE HOVER ASSISTANT
   * Triggers on high_consideration emotion near pricing elements
   */
  function showPriceHoverAssist(element) {
    if (isOnCooldown('priceHover')) return;

    const assistant = document.createElement('div');
    assistant.className = 'sq-intervention sq-price-assistant';
    assistant.style.cssText = `
      position: absolute;
      background: white;
      border: 2px solid ${config.branding.primaryColor};
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
      z-index: 999999;
      max-width: 360px;
    `;

    const rect = element?.getBoundingClientRect() || { top: 200, left: 200 };
    assistant.style.top = `${rect.top + window.scrollY + 40}px`;
    assistant.style.left = `${rect.left + window.scrollX}px`;

    const automotive = config.template === 'automotive';

    assistant.innerHTML = `
      <button class="sq-close-btn" style="color: ${config.branding.primaryColor};">&times;</button>
      <div>
        <h3 style="margin: 0 0 12px 0; color: ${config.branding.primaryColor};">
          ${automotive ? '💰 Exclusive Financing Available' : '💡 Value Breakdown'}
        </h3>

        ${automotive ? `
          <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #333;">
            <li>${config.offers.aprOffer || '0% APR for qualified buyers'}</li>
            <li>${config.offers.leaseSpecial || 'Lease from $299/month'}</li>
            <li>${config.offers.tradeInBonus || '$2,000 above KBB trade-in value'}</li>
          </ul>
        ` : `
          <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #333;">
            <li>ROI: ${config.offers.roiMultiplier || '3.2x'} in first year</li>
            <li>Average savings: ${config.offers.avgSavings || '$12,000/year'}</li>
            <li>Implementation: ${config.offers.freeTrialDays || 14} day free trial</li>
          </ul>
        `}

        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            ${automotive
              ? '🎁 Test drive today and receive a ' + (config.offers.testDriveIncentive || '$50 gift card')
              : '🎯 Join 500+ companies already seeing results'
            }
          </p>
        </div>

        <button class="sq-button sq-calculate-btn" style="
          background: ${config.branding.primaryColor};
          color: white;
          width: 100%;
          font-size: 16px;
        ">
          ${automotive ? 'Calculate My Payment' : 'Calculate My ROI'}
        </button>
      </div>
    `;

    document.body.appendChild(assistant);

    // Handle interactions
    assistant.querySelector('.sq-close-btn').addEventListener('click', () => {
      recordIntervention('priceHover', false);
      assistant.remove();
    });

    assistant.querySelector('.sq-calculate-btn').addEventListener('click', () => {
      recordIntervention('priceHover', true);
      if (config.channels.supportUrl) {
        window.open(config.channels.supportUrl, '_blank');
      }
      assistant.remove();
    });

    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (assistant.parentNode) {
        assistant.style.opacity = '0';
        setTimeout(() => assistant.remove(), 300);
      }
    }, 15000);

    recordIntervention('priceHover', false);
  }

  /**
   * RAGE CLICK DE-ESCALATION
   * Triggers on frustration emotion with rapid clicking
   */
  function showRageClickDeescalation() {
    if (isOnCooldown('rageClick')) return;

    const notification = document.createElement('div');
    notification.className = 'sq-intervention sq-rage-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ff6b6b, #ff8e53);
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      max-width: 360px;
      animation: sq-shake 0.5s ease;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 24px; margin-right: 12px;">😤</span>
        <strong style="font-size: 16px;">Having trouble?</strong>
      </div>
      <p style="margin: 0 0 16px 0; font-size: 14px;">
        We're sorry things aren't working as expected. Let us help you right away!
      </p>
      <div style="display: flex; gap: 8px;">
        <button class="sq-button sq-help-btn" style="
          background: white;
          color: #ff6b6b;
          padding: 10px 16px;
          font-size: 14px;
          flex: 1;
        ">
          Get Help Now
        </button>
        <button class="sq-button sq-refresh-btn" style="
          background: rgba(255,255,255,0.2);
          color: white;
          padding: 10px 16px;
          font-size: 14px;
        ">
          Refresh
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Handle interactions
    notification.querySelector('.sq-help-btn').addEventListener('click', () => {
      recordIntervention('rageClick', true);
      if (window.Intercom) window.Intercom('show');
      else if (window.$crisp) window.$crisp.push(['do', 'chat:open']);
      else if (config.channels.supportUrl) window.open(config.channels.supportUrl, '_blank');
      notification.remove();
    });

    notification.querySelector('.sq-refresh-btn').addEventListener('click', () => {
      recordIntervention('rageClick', true);
      window.location.reload();
    });

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }
    }, 8000);

    recordIntervention('rageClick', false);
  }

  /**
   * EMOTION LISTENER
   * Connects to detection engine and triggers interventions
   */
  function startListening() {
    // Subscribe to emotion events from detection engine
    window.addEventListener('sentientiq:emotion', (event) => {
      const { emotion, confidence, element, context } = event.detail;

      // Only trigger on high confidence emotions
      if (confidence < 0.7) return;

      // Check if intervention is enabled
      const checkEnabled = (id) => {
        const intervention = config.interventions.find(i => i.id === id);
        return intervention ? intervention.enabled : false;
      };

      // Trigger appropriate intervention based on emotion
      switch (emotion) {
        case 'abandonment_risk':
          if (checkEnabled('exit_save')) {
            showExitIntentModal();
          }
          break;

        case 'confusion':
        case 'frustration':
          if (context?.rapidClicks && checkEnabled('rage_click_deescalation')) {
            showRageClickDeescalation();
          } else if (checkEnabled('confusion_help')) {
            showConfusionHelper(element);
          }
          break;

        case 'high_consideration':
          if (context?.priceElement && checkEnabled('price_hover_assist')) {
            showPriceHoverAssist(element);
          }
          break;
      }
    });

    console.log('[SentientIQ Interventions] Listening for emotions...');
  }

  /**
   * INITIALIZATION
   */
  async function init() {
    // Inject styles
    injectStyles();

    // Load configuration
    await loadConfig();

    // Start listening for emotions
    startListening();

    // Expose API
    window.SentientIQ = window.SentientIQ || {};
    window.SentientIQ.interventions = {
      config,
      state: interventionState,
      showExitIntent: showExitIntentModal,
      showConfusion: showConfusionHelper,
      showPriceAssist: showPriceHoverAssist,
      showRageDeescalation: showRageClickDeescalation,
      reload: loadConfig
    };

    console.log('[SentientIQ Interventions] v4.1 initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();