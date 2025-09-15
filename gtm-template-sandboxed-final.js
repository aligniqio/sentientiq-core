// SentientIQ Detection & Intervention Template
const injectScript = require('injectScript');
const localStorage = require('localStorage');
const encodeUriComponent = require('encodeUriComponent');
const log = require('logToConsole');

// Get configuration from template fields
const tenantId = data.tenantId;
const apiKey = data.apiKey;

// Store configuration in localStorage
if (tenantId) {
  localStorage.setItem('tenantId', tenantId);
}
if (apiKey) {
  localStorage.setItem('apiKey', apiKey);
}

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