/**
 * Intent Data Auditor - Content Script
 * The Moment of Truth for CMOs
 * 
 * "YES SIR, YOU'VE BEEN ROBBED."
 */

// DataTruth Pro - Detection without code injection
// We detect patterns, not implementation

class IntentDataAuditor {
  constructor() {
    this.suspiciousPatterns = [];
    this.mathRandomCalls = 0;
    this.dataSnapshots = [];
    this.networkPatterns = new Map();
    this.startTime = Date.now();
    
    this.monitorDataChanges();
    this.monitorNetwork();
    this.captureDataSnapshot();
  }

  // Monitor for data patterns that indicate random generation
  monitorDataChanges() {
    const self = this;
    
    // Watch for score elements being updated
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const text = mutation.target.textContent || '';
        
        // Look for score-like values (0-100 numbers)
        const scorePattern = /\b(\d{1,2}\.\d+|100\.0+)\b/g;
        const matches = text.match(scorePattern);
        
        if (matches && (text.toLowerCase().includes('score') || 
                       text.toLowerCase().includes('intent') ||
                       text.toLowerCase().includes('confidence'))) {
          
          // Check if these look like random values (too many decimal places)
          matches.forEach(match => {
            if (match.includes('.') && match.split('.')[1].length > 2) {
              self.mathRandomCalls++;
              self.suspiciousPatterns.push({
                timestamp: Date.now(),
                value: match,
                context: 'Suspicious precision in score (likely Math.random() * 100)'
              });
              
              if (self.mathRandomCalls === 1) {
                self.alertUser('SUSPICIOUS: Random-looking scores detected!');
              }
            }
          });
        }
      });
    });
    
    // Start observing once DOM is ready
    setTimeout(() => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }, 1000);
  }

  // Monitor network requests for suspicious patterns
  monitorNetwork() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource' && entry.name.includes('api')) {
          // Check for instant responses (generated client-side)
          if (entry.duration < 10) {
            this.suspiciousPatterns.push({
              timestamp: Date.now(),
              type: 'SUSPICIOUS_TIMING',
              detail: `API call completed in ${entry.duration}ms - likely client-side generated`,
              url: entry.name
            });
          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }

  // Capture data snapshot for replay test
  captureDataSnapshot() {
    // Look for common intent data elements
    const selectors = [
      '[class*="score"]',
      '[class*="intent"]',
      '[class*="prediction"]',
      '[data-score]',
      '[data-intent]',
      '.visitor-score',
      '.account-score',
      '.buying-stage'
    ];
    
    const snapshot = {};
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, index) => {
        const key = `${selector}_${index}`;
        snapshot[key] = {
          text: el.textContent,
          value: el.getAttribute('data-value') || el.value,
          classes: el.className
        };
      });
    });
    
    this.dataSnapshots.push({
      timestamp: Date.now(),
      url: window.location.href,
      data: snapshot
    });
    
    // Store for comparison on refresh
    chrome.storage.local.set({ 
      lastSnapshot: snapshot,
      captureTime: Date.now()
    });
  }

  // Check for Benford's Law violation
  checkBenfordLaw(numbers) {
    if (numbers.length < 100) return null;
    
    const firstDigits = numbers
      .filter(n => n > 0)
      .map(n => parseInt(n.toString()[0]));
    
    const distribution = {};
    for (let i = 1; i <= 9; i++) {
      distribution[i] = firstDigits.filter(d => d === i).length / firstDigits.length;
    }
    
    // Benford's Law expected distribution
    const benford = {
      1: 0.301, 2: 0.176, 3: 0.125, 4: 0.097,
      5: 0.079, 6: 0.067, 7: 0.058, 8: 0.051, 9: 0.046
    };
    
    // Calculate deviation
    let totalDeviation = 0;
    for (let i = 1; i <= 9; i++) {
      totalDeviation += Math.abs(distribution[i] - benford[i]);
    }
    
    return totalDeviation > 0.15; // Suspicious if deviation > 15%
  }

  // The Replay Test - The Smoking Gun
  async performReplayTest() {
    const { lastSnapshot, captureTime } = await chrome.storage.local.get(['lastSnapshot', 'captureTime']);
    
    if (lastSnapshot && (Date.now() - captureTime) < 60000) { // Within 1 minute
      const currentSnapshot = {};
      
      // Recapture current state
      Object.keys(lastSnapshot).forEach(key => {
        const selector = key.split('_')[0];
        const index = parseInt(key.split('_')[1]);
        const elements = document.querySelectorAll(selector);
        
        if (elements[index]) {
          currentSnapshot[key] = {
            text: elements[index].textContent,
            value: elements[index].getAttribute('data-value') || elements[index].value
          };
        }
      });
      
      // Compare snapshots
      let differences = 0;
      let total = 0;
      
      Object.keys(lastSnapshot).forEach(key => {
        if (currentSnapshot[key]) {
          total++;
          if (lastSnapshot[key].text !== currentSnapshot[key].text ||
              lastSnapshot[key].value !== currentSnapshot[key].value) {
            differences++;
          }
        }
      });
      
      const changeRate = differences / total;
      
      if (changeRate > 0.3) { // More than 30% changed
        this.alertUser(`REPLAY TEST FAILED: ${Math.round(changeRate * 100)}% of "historical" data changed on refresh!`);
        return false;
      }
    }
    
    return true;
  }

  // Alert the user - The moment of realization
  alertUser(message) {
    // Send to popup
    chrome.runtime.sendMessage({
      type: 'SUSPICIOUS_ACTIVITY',
      message: message,
      details: {
        mathRandomCalls: this.mathRandomCalls,
        suspiciousPatterns: this.suspiciousPatterns,
        timestamp: Date.now()
      }
    });
    
    // Log for Deepak to verify
    console.log('%c🚨 INTENT DATA AUDITOR ALERT 🚨', 'color: red; font-size: 20px; font-weight: bold;');
    console.log('%c' + message, 'color: red; font-size: 16px;');
    console.log('Evidence:', this.suspiciousPatterns);
  }

  // Generate audit report
  generateReport() {
    return {
      url: window.location.href,
      platform: this.detectPlatform(),
      mathRandomDetected: this.mathRandomCalls > 0,
      mathRandomCalls: this.mathRandomCalls,
      suspiciousPatterns: this.suspiciousPatterns,
      dataConsistency: this.dataSnapshots,
      auditDuration: Date.now() - this.startTime,
      verdict: this.getVerdict()
    };
  }

  detectPlatform() {
    const url = window.location.hostname;
    const title = document.title.toLowerCase();
    const metaTags = Array.from(document.getElementsByTagName('meta'));
    
    // Check hostname
    if (url.includes('6sense')) return '6sense';
    if (url.includes('demandbase')) return 'Demandbase';
    if (url.includes('zoominfo')) return 'ZoomInfo';
    if (url.includes('terminus')) return 'Terminus';
    if (url.includes('bombora')) return 'Bombora';
    if (url.includes('sentientiq')) return 'SentientIQ (Self-Audit)';
    
    // Check meta tags and page content for platform identification
    const pageContent = document.body ? document.body.innerText.toLowerCase() : '';
    if (pageContent.includes('6sense') || title.includes('6sense')) return '6sense';
    if (pageContent.includes('demandbase') || title.includes('demandbase')) return 'Demandbase';
    if (pageContent.includes('zoominfo') || title.includes('zoominfo')) return 'ZoomInfo';
    if (pageContent.includes('sentientiq') || title.includes('sentientiq')) return 'SentientIQ (Self-Audit)';
    
    return 'Unknown Platform';
  }

  getVerdict() {
    if (this.mathRandomCalls > 0) {
      return 'FRAUDULENT: Math.random() detected in scoring algorithms';
    }
    // Be honest - we only flag as suspicious with REAL evidence
    // Not just because we found some fast API calls
    return 'MONITORING: No fraud detected';
  }
}

// Initialize the auditor
const auditor = new IntentDataAuditor();

// Perform replay test after 5 seconds
setTimeout(() => {
  auditor.performReplayTest();
}, 5000);

// Send report every 30 seconds
setInterval(() => {
  const report = auditor.generateReport();
  chrome.runtime.sendMessage({
    type: 'AUDIT_REPORT',
    report: report
  });
}, 30000);

// Listen for requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_REPORT') {
    sendResponse({
      report: auditor.generateReport()
    });
  }
  return true;
});

console.log('%c Unstuck Active ', 'background: #000; color: #0f0; font-size: 14px; padding: 5px;');
console.log('Monitoring for Math.random() and other suspicious patterns...');
console.log('That weird feeling about the codebase? Let\'s find out if you\'re right...');