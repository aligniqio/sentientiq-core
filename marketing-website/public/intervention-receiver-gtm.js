/**
 * SentientIQ Intervention Receiver - GTM Loader Version
 * Simplified loader that ensures proper initialization
 */

(function() {
  'use strict';

  console.log('[SentientIQ] Intervention loader starting...');

  // Check if already loaded
  if (window.SentientIQInterventions) {
    console.log('[SentientIQ] Interventions already loaded, skipping');
    return;
  }

  // Configuration from GTM
  const config = window.SentientIQ || {};
  const tenantId = config.tenantId || 'unknown';

  console.log('[SentientIQ] Config:', { tenantId });

  // Function to load the intervention receiver
  function loadInterventionReceiver() {
    console.log('[SentientIQ] Loading intervention-receiver.js...');

    const script = document.createElement('script');
    script.src = 'https://sentientiq.ai/intervention-receiver.js';
    script.async = true;
    script.setAttribute('data-tenant-id', tenantId);

    script.onload = function() {
      console.log('[SentientIQ] ✅ Intervention receiver loaded successfully');
    };

    script.onerror = function() {
      console.error('[SentientIQ] ❌ Failed to load intervention receiver');
    };

    document.head.appendChild(script);
  }

  // Check if telemetry is loaded (has session in storage)
  function checkAndLoad() {
    const sessionId = sessionStorage.getItem('sq_session_id');

    if (sessionId) {
      console.log('[SentientIQ] Session found:', sessionId);
      loadInterventionReceiver();
    } else if (window.SentientIQTelemetry) {
      console.log('[SentientIQ] Telemetry found but no session yet, loading anyway...');
      loadInterventionReceiver();
    } else {
      console.log('[SentientIQ] No session or telemetry yet, waiting...');
      // Try again in 500ms, up to 10 times
      if (!checkAndLoad.attempts) checkAndLoad.attempts = 0;
      checkAndLoad.attempts++;

      if (checkAndLoad.attempts < 10) {
        setTimeout(checkAndLoad, 500);
      } else {
        console.warn('[SentientIQ] Giving up after 5 seconds, loading anyway');
        loadInterventionReceiver();
      }
    }
  }

  // Start the check
  checkAndLoad();
})();