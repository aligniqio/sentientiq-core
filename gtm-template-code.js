// GTM Custom HTML Tag Template
// Tag Name: SentientIQ Interventions
// Trigger: All Pages

(function() {
  // Configuration from GTM Variables
  const tenantId = '{{Tenant ID}}';  // Create a GTM Variable named "Tenant ID" with value: sidk
  const apiKey = '{{API Key}}';      // Create a GTM Variable named "API Key" with value: sq_live_sidk_test

  // Store in localStorage for persistence
  if (tenantId) {
    localStorage.setItem('tenantId', tenantId);
  }
  if (apiKey) {
    localStorage.setItem('apiKey', apiKey);
  }

  // Check if script already loaded
  if (document.querySelector('script[src*="interventions-v4.js"]')) {
    return;
  }

  // Create and inject the intervention script
  const script = document.createElement('script');
  script.src = 'https://sentientiq.ai/interventions-v4.js?tenant=' +
                encodeURIComponent(tenantId) +
                '&key=' + encodeURIComponent(apiKey);
  script.async = true;

  // Add load handlers
  script.onload = function() {
    console.log('[SentientIQ] Interventions loaded for tenant:', tenantId);

    // Verify window.SentientIQ exists
    if (window.SentientIQ && window.SentientIQ.interventions) {
      console.log('[SentientIQ] Intervention system ready');
    }
  };

  script.onerror = function() {
    console.error('[SentientIQ] Failed to load interventions script');
  };

  // Inject into page
  document.head.appendChild(script);

  // Also inject the detection script if not present
  if (!document.querySelector('script[src*="detect-v4.js"]')) {
    const detectScript = document.createElement('script');
    detectScript.src = 'https://sentientiq.ai/detect-v4.js?tenant=' +
                       encodeURIComponent(tenantId) +
                       '&key=' + encodeURIComponent(apiKey);
    detectScript.async = true;

    detectScript.onload = function() {
      console.log('[SentientIQ] Detection loaded for tenant:', tenantId);
    };

    document.head.appendChild(detectScript);
  }
})();