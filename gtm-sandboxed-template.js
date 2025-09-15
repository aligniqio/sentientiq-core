// GTM Custom Template (Sandboxed JavaScript)
// This goes in the Template Editor, not as Custom HTML

const injectScript = require('injectScript');
const setInWindow = require('setInWindow');
const localStorage = require('localStorage');
const encodeUriComponent = require('encodeUriComponent');
const log = require('logToConsole');

// Get template fields
const tenantId = data.tenantId;  // Template field
const apiKey = data.apiKey;      // Template field

// Store in localStorage
if (tenantId) {
  localStorage.setItem('tenantId', tenantId);
}
if (apiKey) {
  localStorage.setItem('apiKey', apiKey);
}

// Build script URLs
const interventionUrl = 'https://sentientiq.ai/interventions-v4.js?tenant=' +
                       encodeUriComponent(tenantId) +
                       '&key=' + encodeUriComponent(apiKey);

const detectionUrl = 'https://sentientiq.ai/detect-v4.js?tenant=' +
                    encodeUriComponent(tenantId) +
                    '&key=' + encodeUriComponent(apiKey);

// Success callback
const onSuccess = () => {
  log('[SentientIQ] Scripts loaded successfully');
  data.gtmOnSuccess();
};

// Failure callback
const onFailure = () => {
  log('[SentientIQ] Failed to load scripts');
  data.gtmOnFailure();
};

// Inject intervention script first
injectScript(interventionUrl, () => {
  // Then inject detection script
  injectScript(detectionUrl, onSuccess, onFailure);
}, onFailure);

// Template permissions required:
// - Inject Script: https://sentientiq.ai/*
// - Access Local Storage: tenantId, apiKey
// - Logging