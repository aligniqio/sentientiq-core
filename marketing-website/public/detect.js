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
  
  // HESITATION DETECTION - Hovering >2s
  function detectHesitation(target) {
    const hoverDuration = Date.now() - state.hoverStartTime;
    
    if (hoverDuration > 2000 && state.hoverTarget) {
      const isActionable = ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(state.hoverTarget.tagName);
      
      if (isActionable) {
        state.currentEmotion = 'hesitation';
        sendEvent('hesitation', 85, {
          intensity: 75,
          duration: hoverDuration,
          element: state.hoverTarget.tagName,
          text: state.hoverTarget.textContent?.slice(0, 50),
          micro_behaviors: ['prolonged_hover', 'decision_paralysis']
        });
      }
    }
  }
  
  // CONFUSION DETECTION - Erratic scrolling
  function detectConfusion() {
    const now = Date.now();
    const scrollY = window.scrollY;
    
    state.scrollPositions.push({
      y: scrollY,
      time: now
    });
    
    // Keep last 10 scroll positions
    if (state.scrollPositions.length > 10) {
      state.scrollPositions.shift();
    }
    
    // Check for up-down-up pattern (confusion)
    if (state.scrollPositions.length >= 5) {
      let directionChanges = 0;
      let lastDirection = 0;
      
      for (let i = 1; i < state.scrollPositions.length; i++) {
        const direction = state.scrollPositions[i].y > state.scrollPositions[i-1].y ? 1 : -1;
        if (lastDirection !== 0 && direction !== lastDirection) {
          directionChanges++;
        }
        lastDirection = direction;
      }
      
      if (directionChanges >= 3) {
        state.currentEmotion = 'confusion';
        sendEvent('confusion', 78, {
          intensity: 70,
          scrollPattern: 'erratic',
          directionChanges,
          micro_behaviors: ['erratic_scrolling', 'searching_behavior']
        });
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
    state.idleStartTime = Date.now();
    state.lastInteraction = 'click';
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
    state.hoverTarget = e.target;
    state.hoverStartTime = Date.now();
  });
  
  document.addEventListener('mouseout', function(e) {
    if (state.hoverTarget === e.target) {
      detectHesitation(e.target);
      state.hoverTarget = null;
      state.hoverStartTime = 0;
    }
  });
  
  // Also check for hesitation while hovering (every 500ms)
  setInterval(function() {
    if (state.hoverTarget && state.hoverStartTime) {
      const hoverDuration = Date.now() - state.hoverStartTime;
      if (hoverDuration > 2000) {
        detectHesitation(state.hoverTarget);
        state.hoverStartTime = Date.now(); // Reset to avoid repeated triggers
      }
    }
  }, 500);
  
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