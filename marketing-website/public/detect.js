/**
 * SentientIQ Emotional Intelligence Detector
 * One script to detect all emotions
 * 
 * Usage: <script src="https://cdn.sentientiq.ai/v1/detect.js" data-api-key="YOUR_KEY"></script>
 */

(function() {
  'use strict';
  
  // Get API key from script tag
  const scriptTag = document.currentScript;
  const apiKey = scriptTag?.getAttribute('data-api-key');
  
  if (!apiKey) {
    console.error('SentientIQ: No API key provided. Add data-api-key="YOUR_KEY" to the script tag.');
    return;
  }
  
  // Allow DEMO_KEY for marketing site
  const isDemoMode = apiKey === 'DEMO_KEY';
  if (isDemoMode) {
    console.log('SentientIQ: Running in demo mode. Emotional intelligence active.');
  }
  
  // Configuration
  const config = {
    apiEndpoint: 'https://api.sentientiq.app/api/emotional/ingest', // NATS JetStream ingestion
    apiKey: apiKey,
    sessionId: generateSessionId(),
    startTime: Date.now(),
    debug: scriptTag?.getAttribute('data-debug') === 'true'
  };
  
  // Emotional state tracking
  const state = {
    clickTimes: [],
    mousePosition: { x: 0, y: 0 },
    lastMousePosition: { x: 0, y: 0 },
    mouseVelocity: 0,
    lastMoveTime: Date.now(),
    hoverTarget: null,
    hoverStartTime: 0,
    scrollPositions: [],
    lastScrollTime: Date.now(),
    idleStartTime: Date.now(),
    currentEmotion: 'normal',
    detectedEmotions: []
  };
  
  // Generate unique session ID
  function generateSessionId() {
    return 'sq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Predict likely action based on emotion
  function getPredictedAction(emotion) {
    const predictions = {
      'rage': 'abandon',
      'hesitation': 'needs_support',
      'confusion': 'seek_clarity',
      'sticker_shock': 'compare_prices',
      'abandonment': 'exit',
      'delight': 'convert',
      'interest': 'explore',
      'session_start': 'browse'
    };
    return predictions[emotion] || 'observe';
  }
  
  // Send event to backend
  async function sendEvent(emotion, confidence, metadata = {}) {
    const event = {
      session_id: config.sessionId,
      user_id: config.apiKey, // API key serves as user identifier
      emotion: emotion,
      confidence: confidence,
      intensity: metadata.intensity || 80, // Default intensity
      page_url: window.location.href,
      element_target: metadata.target || metadata.element || '',
      micro_behaviors: metadata.micro_behaviors || [emotion + '_detected'],
      predicted_action: metadata.predicted_action || getPredictedAction(emotion),
      intervention_window: metadata.intervention_window || 5,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        timeOnPage: Date.now() - config.startTime,
        deviceType: getDeviceType(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        referrer: document.referrer
      }
    };
    
    // Store locally for batch sending
    state.detectedEmotions.push(event);
    
    // Emit custom event for developers to hook into
    window.dispatchEvent(new CustomEvent('sentientiq:emotion', { 
      detail: event 
    }));
    
    // Send to backend (with error handling)
    try {
      await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify(event)
      });
      
      if (config.debug) {
        console.log('🧠 SentientIQ:', emotion, confidence + '%', metadata);
      }
    } catch (error) {
      console.error('SentientIQ: Failed to send event', error);
    }
  }
  
  // Detect device type
  function getDeviceType() {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  
  // RAGE DETECTION - 3+ clicks in <300ms
  function detectRage() {
    const now = Date.now();
    state.clickTimes.push(now);
    state.clickTimes = state.clickTimes.filter(t => now - t < 2000);
    
    if (state.clickTimes.length >= 3) {
      const intervals = [];
      for (let i = 1; i < state.clickTimes.length; i++) {
        intervals.push(state.clickTimes[i] - state.clickTimes[i-1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      if (avgInterval < 300) {
        state.currentEmotion = 'rage';
        sendEvent('rage', 95, {
          intensity: 90,
          clickCount: state.clickTimes.length,
          avgInterval: Math.round(avgInterval),
          target: event.target?.tagName,
          micro_behaviors: ['rapid_clicking', 'frustration_pattern']
        });
      }
    }
  }
  
  // HESITATION DETECTION - Hovering >2.5s on truly interactive elements
  function detectHesitation(target) {
    const hoverDuration = Date.now() - state.hoverStartTime;
    
    if (hoverDuration > 2500 && state.hoverTarget) {
      // Only truly interactive elements - not generic containers
      const isActionable = ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(state.hoverTarget.tagName) ||
                          state.hoverTarget.onclick || 
                          state.hoverTarget.hasAttribute('role') && ['button', 'link'].includes(state.hoverTarget.getAttribute('role')) ||
                          state.hoverTarget.style.cursor === 'pointer';
      
      if (isActionable && state.currentEmotion !== 'hesitation') { // Prevent duplicate triggers
        state.currentEmotion = 'hesitation';
        sendEvent('hesitation', Math.min(90, 60 + (hoverDuration / 100)), {
          intensity: Math.min(85, 50 + (hoverDuration / 100)),
          duration: hoverDuration,
          element: state.hoverTarget.tagName,
          text: state.hoverTarget.textContent?.slice(0, 50),
          micro_behaviors: ['prolonged_hover', 'decision_paralysis']
        });
        console.log('🧠 Hesitation detected:', hoverDuration, 'ms on', state.hoverTarget.tagName);
      }
    }
  }
  
  // CONFUSION DETECTION - Erratic scrolling (more sensitive)
  function detectConfusion() {
    const now = Date.now();
    const scrollY = window.scrollY;
    
    state.scrollPositions.push({
      y: scrollY,
      time: now
    });
    
    // Keep last 8 scroll positions (reduced for faster detection)
    if (state.scrollPositions.length > 8) {
      state.scrollPositions.shift();
    }
    
    // Check for rapid direction changes (confusion/searching)
    if (state.scrollPositions.length >= 4) {
      let directionChanges = 0;
      let lastDirection = 0;
      let totalDistance = 0;
      
      for (let i = 1; i < state.scrollPositions.length; i++) {
        const distance = Math.abs(state.scrollPositions[i].y - state.scrollPositions[i-1].y);
        totalDistance += distance;
        const direction = state.scrollPositions[i].y > state.scrollPositions[i-1].y ? 1 : -1;
        if (lastDirection !== 0 && direction !== lastDirection && distance > 50) { // Minimum distance for direction change
          directionChanges++;
        }
        lastDirection = direction;
      }
      
      // Detect if: 2+ direction changes OR rapid scrolling with high distance
      const timeSpan = now - state.scrollPositions[0].time;
      const scrollVelocity = totalDistance / timeSpan;
      
      if ((directionChanges >= 2 || scrollVelocity > 2) && state.currentEmotion !== 'confusion') {
        state.currentEmotion = 'confusion';
        const confidence = Math.min(88, 60 + (directionChanges * 10) + (scrollVelocity * 5));
        sendEvent('confusion', confidence, {
          intensity: Math.min(80, 50 + (directionChanges * 10)),
          scrollPattern: 'erratic',
          directionChanges,
          velocity: scrollVelocity.toFixed(2),
          micro_behaviors: ['erratic_scrolling', 'searching_behavior']
        });
        console.log('🧠 Confusion detected:', directionChanges, 'direction changes, velocity:', scrollVelocity);
        state.scrollPositions = []; // Reset after detection
      }
    }
  }
  
  // STICKER SHOCK DETECTION - Sudden deceleration near prices
  function detectStickerShock(x, y) {
    const now = Date.now();
    const timeDelta = now - state.lastMoveTime;
    
    if (timeDelta > 0) {
      const distance = Math.sqrt(
        Math.pow(x - state.lastMousePosition.x, 2) + 
        Math.pow(y - state.lastMousePosition.y, 2)
      );
      const velocity = distance / timeDelta;
      
      // Sudden deceleration
      if (state.mouseVelocity > 5 && velocity < 1) {
        // Check if near pricing elements
        const element = document.elementFromPoint(x, y);
        const nearPricing = element?.textContent?.includes('$') || 
                           element?.textContent?.match(/\d{2,4}/) ||
                           element?.closest('[class*="price"], [id*="price"], [data-price]');
        
        if (nearPricing) {
          state.currentEmotion = 'sticker_shock';
          sendEvent('sticker_shock', 92, {
            intensity: 85,
            velocity: { before: state.mouseVelocity, after: velocity },
            priceElement: element?.textContent?.slice(0, 50),
            micro_behaviors: ['sudden_stop', 'price_fixation'],
            predicted_action: 'compare_prices'
          });
        }
      }
      
      state.mouseVelocity = velocity;
    }
  }
  
  // CONFIDENCE DETECTION - Quick, decisive clicks on CTAs
  function detectConfidence(target) {
    const timeSincePageLoad = Date.now() - config.startTime;
    const isDecisive = timeSincePageLoad > 2000; // Not immediate
    
    // Check if it's a CTA or important button
    const isCTA = target && (
      ['BUTTON', 'A'].includes(target.tagName) ||
      target.classList?.contains('btn') ||
      target.classList?.contains('button') ||
      target.textContent?.match(/buy|purchase|start|get|sign|submit|continue/i)
    );
    
    if (isCTA && isDecisive && state.mouseVelocity > 2) {
      state.currentEmotion = 'confidence';
      sendEvent('confidence', 85, {
        intensity: 75,
        element: target.tagName,
        text: target.textContent?.slice(0, 50),
        micro_behaviors: ['decisive_click', 'confident_navigation'],
        predicted_action: 'convert'
      });
    }
  }
  
  // ABANDONMENT DETECTION - Idle >60s
  function detectAbandonment() {
    const idleTime = Date.now() - state.idleStartTime;
    
    if (idleTime > 60000 && state.currentEmotion !== 'abandonment') {
      state.currentEmotion = 'abandonment';
      sendEvent('abandonment', 88, {
        intensity: 60,
        idleTime: Math.round(idleTime / 1000),
        lastInteraction: state.lastInteraction,
        micro_behaviors: ['idle_timeout', 'disengagement'],
        predicted_action: 'exit'
      });
    }
  }
  
  // Event Handlers
  document.addEventListener('click', function(e) {
    detectRage();
    detectConfidence(e.target);
    state.idleStartTime = Date.now();
    state.lastInteraction = 'click';
    // Reset hover state on click
    state.hoverTarget = null;
    state.hoverStartTime = 0;
    state.currentEmotion = 'normal';
  });
  
  document.addEventListener('mousemove', function(e) {
    const x = e.clientX;
    const y = e.clientY;
    
    // Update positions
    state.lastMousePosition = { ...state.mousePosition };
    state.mousePosition = { x, y };
    state.lastMoveTime = Date.now();
    
    // Detect sticker shock
    detectStickerShock(x, y);
    
    // Reset idle timer
    state.idleStartTime = Date.now();
    state.lastInteraction = 'mousemove';
  });
  
  document.addEventListener('mouseover', function(e) {
    // Only track hover on interactive elements, and not immediately on page load
    const timeSincePageLoad = Date.now() - config.startTime;
    if (timeSincePageLoad > 1000) { // Ignore first second after page load
      state.hoverTarget = e.target;
      state.hoverStartTime = Date.now();
    }
  });
  
  document.addEventListener('mouseout', function(e) {
    if (state.hoverTarget === e.target) {
      // Only check hesitation if we've been tracking for enough time
      const hoverDuration = Date.now() - state.hoverStartTime;
      if (hoverDuration > 2500) {
        detectHesitation(e.target);
      }
      state.hoverTarget = null;
      state.hoverStartTime = 0;
      // Reset emotion state when leaving element
      if (state.currentEmotion === 'hesitation') {
        state.currentEmotion = 'normal';
      }
    }
  });
  
  // Check for hesitation periodically but less aggressively
  setInterval(function() {
    if (state.hoverTarget && state.hoverStartTime) {
      const hoverDuration = Date.now() - state.hoverStartTime;
      if (hoverDuration > 2500 && state.currentEmotion !== 'hesitation') {
        detectHesitation(state.hoverTarget);
      }
    }
  }, 1000);
  
  window.addEventListener('scroll', function() {
    detectConfusion();
    state.idleStartTime = Date.now();
    state.lastInteraction = 'scroll';
  });
  
  // Check for abandonment every 10 seconds
  setInterval(detectAbandonment, 10000);
  
  // Public API
  window.SentientIQ = {
    getSessionId: () => config.sessionId,
    getCurrentEmotion: () => state.currentEmotion,
    getEmotions: () => state.detectedEmotions,
    
    // Allow custom emotion events
    track: (emotion, confidence, metadata) => {
      sendEvent(emotion, confidence, metadata);
    },
    
    // Allow outcome tracking for learning
    recordOutcome: (outcome) => {
      sendEvent('outcome', 100, outcome);
    },
    
    // Event listening
    on: (event, callback) => {
      window.addEventListener('sentientiq:' + event, (e) => {
        callback(e.detail);
      });
    },
    
    // Manual trigger detection
    detectNow: () => {
      detectRage();
      detectConfusion();
      detectAbandonment();
    }
  };
  
  // Initialize message
  if (config.debug) {
    console.log(`
╔══════════════════════════════════════════════════════╗
║     🧠 SENTIENTIQ EMOTIONAL INTELLIGENCE ACTIVE     ║
║                                                      ║
║  Session: ${config.sessionId}          ║
║  Detecting: Rage, Hesitation, Confusion, Shock      ║
║  API Key: ${apiKey.slice(0, 8)}...                       ║
║                                                      ║
║  Marketing at the Speed of Emotion™                 ║
╚══════════════════════════════════════════════════════╝
    `);
  }
  
  // Send initialization event
  sendEvent('session_start', 100, {
    intensity: 50,
    url: window.location.href,
    referrer: document.referrer,
    micro_behaviors: ['page_load', 'initial_impression'],
    predicted_action: 'browse',
    intervention_window: 30
  });
  
})();