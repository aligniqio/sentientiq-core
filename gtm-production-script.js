// SentientIQ GTM Production Script
// Copy this entire script into a Custom HTML Tag in Google Tag Manager
// Container ID: GTM-P5SL4DLB
// Trigger: All Pages

(function() {
  // Prevent duplicate loading
  if (window.SentientIQ_loaded) return;
  window.SentientIQ_loaded = true;

  // Configuration - Uses GTM Variables
  var TENANT_ID = '{{Tenant ID}}';
  var API_KEY = '{{API Key}}';

  // Initialize SentientIQ namespace
  window.SentientIQ = window.SentientIQ || {};
  window.SentientIQ.config = {
    tenantId: TENANT_ID,
    apiKey: API_KEY,
    apiEndpoint: 'https://api.sentientiq.app'
  };

  // Store in localStorage for persistence
  localStorage.setItem('tenantId', TENANT_ID);
  localStorage.setItem('apiKey', API_KEY);

  // Helper function to load scripts
  function loadScript(src, onLoad) {
    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    if (onLoad) script.onload = onLoad;
    document.head.appendChild(script);
  }

  // Load detection script first
  loadScript(
    'https://sentientiq.ai/detect-v4.js?tenant=' + TENANT_ID + '&key=' + API_KEY,
    function() {
      // Bridge emotion tracking
      if (window.SentientIQ && window.SentientIQ.getEmotionHistory) {
        window.SentientIQ.emotions = window.SentientIQ.getEmotionHistory;
      }

      // Load interventions after detection is ready
      setTimeout(function() {
        // Ensure config is still available
        if (!window.SentientIQ.config) {
          window.SentientIQ.config = {
            tenantId: TENANT_ID,
            apiKey: API_KEY,
            apiEndpoint: 'https://api.sentientiq.app'
          };
        }

        loadScript(
          'https://sentientiq.ai/interventions-v4.js?tenant=' + TENANT_ID + '&key=' + API_KEY
        );
      }, 100);
    }
  );

  // Optional: Track initialization in dataLayer
  if (window.dataLayer) {
    window.dataLayer.push({
      'event': 'sentientiq_initialized',
      'sentientiq_tenant': TENANT_ID
    });
  }
})();