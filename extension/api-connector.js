/**
 * UNSTUCK API Connector
 * Bridges the browser extension to the backend
 */

class UnstuckAPI {
  constructor() {
    // Use production API or local for testing
    this.baseURL = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001'
      : 'https://api.sentientiq.app';
    
    this.mathRandomCount = 0;
    this.stackTraces = [];
    this.startTime = Date.now();
    this.vendor = this.detectVendor();
  }
  
  detectVendor() {
    const hostname = window.location.hostname;
    const vendors = {
      '6sense': '6sense',
      'demandbase': 'Demandbase',
      'zoominfo': 'ZoomInfo',
      'terminus': 'Terminus',
      'bombora': 'Bombora'
    };
    
    for (const [key, name] of Object.entries(vendors)) {
      if (hostname.includes(key)) return name;
    }
    return null;
  }
  
  // Intercept Math.random() calls
  startInterception() {
    if (!this.vendor) {
      console.log('Not a vendor dashboard, skipping...');
      return;
    }
    
    console.log(`%c🎯 UNSTUCK: Monitoring ${this.vendor} for fraud...`, 
      'background: red; color: white; font-size: 16px; padding: 10px;');
    
    const originalRandom = Math.random;
    const self = this;
    
    Math.random = function() {
      self.mathRandomCount++;
      
      // Capture stack trace
      const stack = new Error().stack;
      if (self.stackTraces.length < 10) { // Keep first 10 for evidence
        self.stackTraces.push(stack);
      }
      
      // Visual indicator
      self.showRandomCallIndicator();
      
      // Report after threshold
      if (self.mathRandomCount === 50) {
        self.reportFraud('INITIAL_DETECTION');
      } else if (self.mathRandomCount === 200) {
        self.reportFraud('CONFIRMED_FRAUD');
      }
      
      return originalRandom.call(this);
    };
    
    // Also monitor for page changes that might reset scores
    this.monitorDOMChanges();
  }
  
  showRandomCallIndicator() {
    let indicator = document.getElementById('unstuck-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'unstuck-indicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(45deg, #ff0000, #ff6b6b);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        font-family: monospace;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 4px 20px rgba(255,0,0,0.3);
        cursor: pointer;
      `;
      indicator.onclick = () => this.showDetailedReport();
      document.body.appendChild(indicator);
    }
    
    indicator.innerHTML = `
      <div style="font-weight: bold;">🎰 UNSTUCK DETECTOR</div>
      <div>Math.random() calls: ${this.mathRandomCount}</div>
      <div style="font-size: 10px;">Click for full report</div>
    `;
  }
  
  monitorDOMChanges() {
    // Watch for score changes that happen without user interaction
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.className && 
            (mutation.target.className.includes('score') || 
             mutation.target.className.includes('intent'))) {
          console.log('Score changed without user action - likely Math.random()');
        }
      });
    });
    
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true
    });
  }
  
  async reportFraud(severity = 'CONFIRMED') {
    const report = {
      vendorName: this.vendor,
      mathRandomCalls: this.mathRandomCount,
      stackTrace: this.stackTraces[0] || 'No stack trace captured',
      companySize: 'unknown',
      annualSpend: 60000, // Default estimate
      builderRole: 'extension_user',
      severity: severity,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await fetch(`${this.baseURL}/api/unstuck/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });
      
      const data = await response.json();
      console.log('Fraud reported:', data);
      
      // Show notification
      this.showNotification(data);
    } catch (error) {
      console.error('Failed to report fraud:', error);
    }
  }
  
  showNotification(data) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-size: 16px;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: slideDown 0.5s;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: bold;">✅ Fraud Documented!</div>
      <div>${data.message}</div>
      <div style="font-size: 12px; margin-top: 5px;">
        ${data.othersExposed} others have exposed ${this.vendor}
      </div>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }
  
  async showDetailedReport() {
    // Get ammunition from backend
    const response = await fetch(`${this.baseURL}/api/unstuck/ammunition/${this.vendor}`);
    const ammo = await response.json();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
      ">
        <h2 style="color: red;">🚨 ${this.vendor} Fraud Report</h2>
        
        <div style="margin: 20px 0;">
          <h3>Evidence Collected:</h3>
          <ul>
            <li>Math.random() calls: ${this.mathRandomCount}</li>
            <li>Time monitored: ${Math.round((Date.now() - this.startTime) / 1000)}s</li>
            <li>Stack traces captured: ${this.stackTraces.length}</li>
          </ul>
        </div>
        
        <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Ready-to-Send Slack Message:</h3>
          <pre style="white-space: pre-wrap; font-size: 12px;">${ammo.slackMessage}</pre>
          <button onclick="navigator.clipboard.writeText('${ammo.slackMessage.replace(/'/g, "\\'")}')" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
          ">Copy to Clipboard</button>
        </div>
        
        <div style="margin-top: 20px;">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            background: #333;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
          ">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
}

// Auto-start on vendor pages
const unstuckAPI = new UnstuckAPI();
if (unstuckAPI.vendor) {
  unstuckAPI.startInterception();
  
  // Also report to console for developers
  console.log(`
%c╔══════════════════════════════════════╗
║          UNSTUCK ACTIVATED           ║
║   Exposing Fake AI Since 2024        ║
╚══════════════════════════════════════╝`, 
    'color: red; font-weight: bold;'
  );
  
  console.log(`
Monitoring: ${unstuckAPI.vendor}
Backend: ${unstuckAPI.baseURL}
Status: Recording Math.random() calls...
  `);
}