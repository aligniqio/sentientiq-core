// SentientIQ Detection & Intervention Template (Sandboxed)
const injectScript = require('injectScript');
const encodeUriComponent = require('encodeUriComponent');
const log = require('logToConsole');
const setInWindow = require('setInWindow');

// Get configuration from template fields
const tenantId = data.tenantId;
const apiKey = data.apiKey;

// Store configuration in window object (localStorage not available in sandbox)
setInWindow('sentientiq_tenant', tenantId, true);
setInWindow('sentientiq_apikey', apiKey, true);

// Build script URLs with parameters
const interventionUrl = 'https://sentientiq.ai/interventions-v4.js?tenant=' +
                       encodeUriComponent(tenantId) +
                       '&key=' + encodeUriComponent(apiKey);

const detectionUrl = 'https://sentientiq.ai/detect-v4.js?tenant=' +
                    encodeUriComponent(tenantId) +
                    '&key=' + encodeUriComponent(apiKey);

// Inject intervention script
injectScript(interventionUrl, () => {
  log('[SentientIQ] Interventions loaded for tenant:', tenantId);

  // Then inject detection script
  injectScript(detectionUrl, () => {
    log('[SentientIQ] Detection loaded for tenant:', tenantId);
    data.gtmOnSuccess();
  }, () => {
    log('[SentientIQ] Failed to load detection script');
    data.gtmOnFailure();
  });
}, () => {
  log('[SentientIQ] Failed to load intervention script');
  data.gtmOnFailure();
});