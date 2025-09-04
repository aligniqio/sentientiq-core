/**
 * The CMO Revelation Module
 * For when the boss finally runs UNSTUCK
 */

class CMORevealation {
  constructor() {
    this.mathRandomCount = 0;
    this.evidenceLog = [];
    this.deepakLaughterLevel = 0;
  }

  async runFullAnalysis() {
    console.log('%c🎭 INITIATING CMO REVELATION SEQUENCE', 
      'background: red; color: white; font-size: 30px; padding: 20px;');
    
    // Hijack Math.random to count calls
    const originalRandom = Math.random;
    Math.random = () => {
      this.mathRandomCount++;
      this.evidenceLog.push(new Error().stack);
      
      // Make it visually obvious
      this.flashScreen();
      this.updateCounter();
      
      return originalRandom();
    };
    
    // Wait for page to load its "AI"
    setTimeout(() => this.revealTheTruth(), 3000);
  }
  
  flashScreen() {
    const flash = document.createElement('div');
    flash.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 0, 0, 0.3);
        z-index: 999999;
        pointer-events: none;
        animation: pulse 0.5s;
      ">
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 100px;
          color: red;
          font-weight: bold;
          text-shadow: 0 0 20px rgba(255,0,0,0.5);
        ">
          MATH.RANDOM()
        </div>
      </div>
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 500);
  }
  
  updateCounter() {
    let counter = document.getElementById('unstuck-counter');
    if (!counter) {
      counter = document.createElement('div');
      counter.id = 'unstuck-counter';
      counter.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: red;
        color: white;
        padding: 20px;
        font-size: 24px;
        font-weight: bold;
        border-radius: 10px;
        z-index: 999999;
        box-shadow: 0 0 20px rgba(255,0,0,0.5);
      `;
      document.body.appendChild(counter);
    }
    
    counter.innerHTML = `
      <div>🎰 MATH.RANDOM() COUNT</div>
      <div style="font-size: 48px;">${this.mathRandomCount}</div>
      <div style="font-size: 14px;">That's $${(this.mathRandomCount * 0.25).toFixed(2)} in coin flips</div>
      <div style="font-size: 12px; margin-top: 10px;">Deepak Laugh Level: ${this.getDeepakStatus()}</div>
    `;
  }
  
  getDeepakStatus() {
    if (this.mathRandomCount < 10) return "😏 Smirking";
    if (this.mathRandomCount < 50) return "😂 Giggling";
    if (this.mathRandomCount < 100) return "🤣 Losing it";
    if (this.mathRandomCount < 200) return "💀 Dead";
    return "🚨 PRATESH ALSO PISSING HIMSELF";
  }
  
  async revealTheTruth() {
    // Stop counting
    Math.random = Math.random;
    
    // Create the revelation modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.95);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 1s;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 40px;
        border-radius: 20px;
        max-width: 600px;
        text-align: center;
        box-shadow: 0 0 50px rgba(255,0,0,0.5);
      ">
        <h1 style="color: red; font-size: 48px; margin-bottom: 20px;">
          🚨 THE TRUTH 🚨
        </h1>
        
        <h2 style="font-size: 32px; margin-bottom: 30px;">
          Your "AI Platform" Just Called Math.random()<br>
          <span style="color: red; font-size: 48px;">${this.mathRandomCount} TIMES</span>
        </h2>
        
        <div style="font-size: 20px; margin: 20px 0; text-align: left;">
          <p>✅ That's ${this.mathRandomCount} coin flips</p>
          <p>✅ Worth $${(this.mathRandomCount * 0.25).toFixed(2)} at quarter per flip</p>
          <p>✅ You pay $60,000/year for this</p>
          <p>✅ Deepak has known since 2019</p>
          <p>✅ Pratesh is currently dying of laughter</p>
        </div>
        
        <div style="
          background: #ffe6e6;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        ">
          <h3 style="color: red;">What Deepak Is Thinking Right Now:</h3>
          <p style="font-style: italic; font-size: 18px;">
            "Boss... how do I say... you been getting... *tries not to laugh*... randomized for 6 years"
          </p>
        </div>
        
        <div style="margin-top: 30px;">
          <button onclick="window.location.href='https://sentientiq.app'" style="
            background: green;
            color: white;
            border: none;
            padding: 20px 40px;
            font-size: 24px;
            border-radius: 10px;
            cursor: pointer;
          ">
            GET UNSTUCK - Use Real Intelligence
          </button>
        </div>
        
        <div style="margin-top: 20px; font-size: 14px; color: #666;">
          <p>This analysis brought to you by UNSTUCK</p>
          <p>The browser extension that Deepak already has installed</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Send the revelation to our backend
    this.reportToHQ();
  }
  
  async reportToHQ() {
    const report = {
      vendorName: this.detectVendor(),
      mathRandomCalls: this.mathRandomCount,
      yearsOfContract: 6, // They said 6 years
      estimatedWaste: 360000,
      developersWhoKnew: 3
    };
    
    fetch('https://api.sentientiq.app/api/unstuck/cmo-moment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
  }
  
  detectVendor() {
    const hostname = window.location.hostname;
    if (hostname.includes('6sense')) return '6sense';
    if (hostname.includes('demandbase')) return 'Demandbase';
    if (hostname.includes('zoominfo')) return 'ZoomInfo';
    return 'Unknown Vendor';
  }
}

// Auto-start if we detect a CMO is running this
if (window.location.search.includes('cmo=true') || 
    window.location.search.includes('boss=true')) {
  const revelation = new CMORevealation();
  revelation.runFullAnalysis();
  
  console.log('%c🎭 Deepak and Pratesh are watching...', 
    'font-size: 20px; color: red;');
}