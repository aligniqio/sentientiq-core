/**
 * Background Service Worker
 * The Silent Witness to $60k/year Fraud
 */

// Track audit data across all tabs
const auditData = new Map();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUDIT_REPORT') {
    // Store audit data for this tab
    auditData.set(sender.tab.id, request.report);
    
    // Update badge to show detection
    if (request.report.mathRandomCalls > 0) {
      chrome.action.setBadgeText({
        text: '!',
        tabId: sender.tab.id
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#ef4444',
        tabId: sender.tab.id
      });
    }
  } else if (request.type === 'SUSPICIOUS_ACTIVITY') {
    // Log suspicious activity
    console.log(`[Tab ${sender.tab.id}] SUSPICIOUS:`, request.message);
    
    // Show notification to user
    if (request.details.mathRandomCalls > 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: 'Intent Data Fraud Detected!',
        message: `Math.random() found in ${new URL(sender.tab.url).hostname}. Your "AI-powered" platform is using random numbers.`,
        priority: 2
      });
    }
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  auditData.delete(tabId);
});

// Handle requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_ALL_AUDITS') {
    sendResponse({
      audits: Array.from(auditData.entries()).map(([tabId, report]) => ({
        tabId,
        ...report
      }))
    });
  }
});

console.log('Intent Data Auditor: Background service active');