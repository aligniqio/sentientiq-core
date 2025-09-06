/**
 * The Moment of Truth Interface
 * Where CMOs discover they've been paying $60k/year for Math.random()
 */

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUDIT_REPORT') {
    updateUI(request.report);
  } else if (request.type === 'SUSPICIOUS_ACTIVITY') {
    showAlert(request.message, request.details);
  }
});

// Request current audit status when popup opens
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  if (tabs[0] && tabs[0].id) {
    chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_REPORT'}, (response) => {
      // Check for chrome.runtime.lastError to prevent console errors
      if (chrome.runtime.lastError) {
        // Content script not loaded on this tab - show default state
        document.getElementById('status').textContent = 'INACTIVE';
        document.getElementById('message').textContent = 'Extension not active on this page';
        return;
      }
      if (response && response.report) {
        updateUI(response.report);
      }
    });
  }
});

function updateUI(report) {
  if (!report) return;
  
  const statusEl = document.getElementById('status');
  const messageEl = document.getElementById('message');
  const evidenceEl = document.getElementById('evidence');
  const cmoMessageEl = document.getElementById('cmoMessage');
  const cmoTextEl = document.getElementById('cmoText');
  const deepakQuoteEl = document.getElementById('deepakQuote');
  const replayTestEl = document.getElementById('replayTest');
  
  // Update status based on verdict
  if (report.verdict.includes('FRAUDULENT')) {
    statusEl.className = 'verdict-status fraudulent';
    statusEl.textContent = 'FRAUDULENT';
    messageEl.textContent = 'Math.random() DETECTED in AI/ML Context!';
    
    // Show the Deepak quote
    deepakQuoteEl.style.display = 'block';
    
    // CMO message
    cmoMessageEl.style.display = 'block';
    cmoTextEl.textContent = `Your "${report.platform}" platform is using Math.random() to generate "AI-powered intent scores". You have ${report.mathRandomCalls} documented instances. This is not machine learning. This is not AI. This is a random number generator charging you enterprise prices.`;
    
  } else {
    statusEl.className = 'verdict-status clean';
    statusEl.textContent = 'MONITORING';
    messageEl.textContent = 'No fraud detected';
    
    // Only show CMO message if we have actual patterns to report
    if (report.suspiciousPatterns && report.suspiciousPatterns.length > 0) {
      cmoMessageEl.style.display = 'block';
      cmoTextEl.textContent = `DataTruth Pro is monitoring for Math.random() usage. Try the Replay Test to check data consistency.`;
    }
  }
  
  // Update evidence
  evidenceEl.style.display = 'block';
  document.getElementById('randomCalls').textContent = report.mathRandomCalls;
  document.getElementById('patterns').textContent = report.suspiciousPatterns.length;
  document.getElementById('platform').textContent = report.platform;
  document.getElementById('duration').textContent = Math.round(report.auditDuration / 1000) + 's';
  
  // Show replay test if we have suspicious activity
  if (report.suspiciousPatterns.length > 0) {
    replayTestEl.style.display = 'block';
  }
}

function showAlert(message, details) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = message;
  messageEl.style.color = '#ef4444';
  messageEl.style.fontWeight = 'bold';
  
  // Log to console for technical verification
  console.log('ALERT:', message, details);
}

// Replay test button
document.getElementById('replayButton').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    // Store current data
    chrome.storage.local.set({replayInitiated: true}, () => {
      // Reload the page
      chrome.tabs.reload(tabs[0].id, {}, () => {
        // The content script will automatically run the replay test
        setTimeout(() => {
          window.close();
        }, 1000);
      });
    });
  });
});

// Auto-refresh every 5 seconds to get latest data
setInterval(() => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_REPORT'}, (response) => {
        // Check for chrome.runtime.lastError to prevent console errors
        if (chrome.runtime.lastError) {
          // Content script not loaded - don't update
          return;
        }
        if (response && response.report) {
          updateUI(response.report);
        }
      });
    }
  });
}, 5000);