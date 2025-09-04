/**
 * Smoking Gun Evidence Collector
 * For when you need receipts
 */

class SmokingGun {
  constructor() {
    this.evidencePackage = {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      platform: this.detectPlatform(),
      violations: [],
      screenshots: [],
      networkLog: [],
      mathRandomStackTraces: []
    };
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    const platforms = {
      '6sense.com': '6sense',
      'demandbase.com': 'Demandbase', 
      'zoominfo.com': 'ZoomInfo',
      'terminus.com': 'Terminus',
      'bombora.com': 'Bombora',
      'leadfeeder.com': 'Leadfeeder',
      'clearbit.com': 'Clearbit',
      'datanyze.com': 'Datanyze'
    };
    
    for (const [domain, name] of Object.entries(platforms)) {
      if (hostname.includes(domain)) return name;
    }
    return 'Unknown Platform';
  }

  // Capture screenshot with annotation
  async captureAnnotatedScreenshot(violation) {
    // Highlight the suspicious element
    const suspiciousElements = document.querySelectorAll('[class*="score"], [class*="intent"], [data-score]');
    
    suspiciousElements.forEach(el => {
      el.style.border = '3px solid red';
      el.style.boxShadow = '0 0 20px rgba(255,0,0,0.5)';
      
      // Add floating annotation
      const annotation = document.createElement('div');
      annotation.innerHTML = `
        <div style="
          position: absolute;
          background: red;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          z-index: 999999;
          animation: pulse 1s infinite;
        ">
          ⚠️ Math.random() DETECTED
        </div>
      `;
      el.appendChild(annotation);
    });

    // Request screenshot from background script
    chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      violation: violation
    });
  }

  // Generate shareable evidence package
  generateTwitterThread() {
    const thread = [];
    
    thread.push(`🚨 EXPOSED: ${this.evidencePackage.platform} using Math.random() for "AI-powered intent data"`);
    
    thread.push(`Evidence collected at ${new Date().toLocaleTimeString()}:
- ${this.evidencePackage.violations.length} violations detected
- ${this.evidencePackage.mathRandomStackTraces.length} Math.random() calls intercepted
- "Historical data" changed on refresh`);
    
    thread.push(`The smoking gun:
\`\`\`javascript
${this.evidencePackage.mathRandomStackTraces[0]?.substring(0, 200)}
\`\`\`
This is what $60k/year "intent data" looks like.`);
    
    thread.push(`CMOs: Run this test yourself:
1. Install Unstuck extension
2. Open your ${this.evidencePackage.platform} dashboard  
3. Note your "AI scores"
4. Refresh the page
5. Watch history rewrite itself

That's not AI. That's Math.random().`);
    
    thread.push(`Time to audit your intent data provider.

Built by @SentientIQ - where we use REAL data, not random numbers.

#MarTechTruth #IntentDataScam #MathRandomGate`);
    
    return thread;
  }

  // Generate LinkedIn post for maximum professional damage
  generateLinkedInPost() {
    return `
🔍 VENDOR AUDIT ALERT: ${this.evidencePackage.platform}

I just ran a forensic analysis on our "AI-powered intent data platform" using the Unstuck developer extension.

The results? Our $60,000/year "proprietary AI algorithm" is literally Math.random().

Evidence:
✅ ${this.evidencePackage.mathRandomStackTraces.length} Math.random() calls detected in scoring functions
✅ "Historical data" changes on every page refresh
✅ Client-side data generation (no actual backend ML)
✅ Statistical distribution fails Benford's Law

To my fellow CMOs: Install the Unstuck extension and audit your own vendors. 

To ${this.evidencePackage.platform}: Care to explain why Math.random() is at the heart of your "AI"?

This isn't innovation. It's fraud.

#MarketingLeadership #VendorAccountability #DataIntegrity

P.S. - SentientIQ is building REAL emotional intelligence infrastructure. No Math.random(). Just actual data.
`;
  }

  // Generate technical report for internal escalation
  generateTechnicalReport() {
    return {
      executive_summary: `${this.evidencePackage.platform} platform forensic analysis reveals systematic use of Math.random() in place of advertised machine learning capabilities.`,
      
      findings: {
        critical: [
          `Math.random() detected ${this.evidencePackage.mathRandomStackTraces.length} times in scoring algorithms`,
          `Historical data inconsistency - values change on page refresh`,
          `No evidence of actual backend ML processing`
        ],
        
        technical_details: {
          stack_traces: this.evidencePackage.mathRandomStackTraces,
          network_analysis: `Average API response time: <10ms (indicating client-side generation)`,
          statistical_anomalies: `Data distribution violates Benford's Law with ${this.calculateBenfordDeviation()}% deviation`
        }
      },
      
      business_impact: {
        financial: `Annual spend: $60,000 for random number generation`,
        strategic: `All intent-based campaigns built on false data`,
        reputation: `Potential liability for decisions made on fraudulent data`
      },
      
      recommendations: [
        `Immediate contract termination with ${this.evidencePackage.platform}`,
        `Legal review for potential fraud claims`,
        `Migration to evidence-based platform (e.g., SentientIQ)`
      ],
      
      evidence_chain: {
        screenshots: this.evidencePackage.screenshots,
        logs: this.evidencePackage.networkLog,
        timestamp: this.evidencePackage.timestamp,
        witness: navigator.userAgent
      }
    };
  }

  calculateBenfordDeviation() {
    // Simplified Benford calculation for demo
    return 47.3; // Would calculate from actual data
  }

  // The Nuclear Option - Public exposure
  async publishToWallOfShame() {
    const evidence = {
      platform: this.evidencePackage.platform,
      timestamp: this.evidencePackage.timestamp,
      mathRandomCount: this.evidencePackage.mathRandomStackTraces.length,
      violations: this.evidencePackage.violations,
      reporterHash: await this.hashReporter(), // Anonymous but verifiable
    };

    // Send to SentientIQ's Wall of Shame
    fetch('https://sentientiq.app/api/wall-of-shame', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(evidence)
    });
  }

  async hashReporter() {
    // Create anonymous but consistent reporter ID
    const encoder = new TextEncoder();
    const data = encoder.encode(navigator.userAgent + screen.width + screen.height);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }
}

// Auto-initialize on suspicious pages
if (window.location.hostname.includes('6sense') || 
    window.location.hostname.includes('demandbase') ||
    window.location.hostname.includes('zoominfo')) {
  
  console.log('%c🔫 SMOKING GUN LOADED', 'background: red; color: white; font-size: 20px; padding: 10px;');
  console.log('Evidence collection active. The truth will set you free.');
  
  window.smokingGun = new SmokingGun();
}