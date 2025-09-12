/**
 * SentientIQ Emotion Detection v3.0
 * Authentic Digital Emotion Wheel - Based on actual human behavior online
 * 
 * No bullshit theater. Real emotions. Real progressions.
 */

(function() {
  'use strict';

  // ==========================================
  // CONFIGURATION
  // ==========================================
  
  const scriptTag = document.currentScript;
  const apiKey = scriptTag?.getAttribute('data-api-key');
  const debugMode = scriptTag?.getAttribute('data-debug') === 'true';
  
  if (!apiKey) {
    console.error('SentientIQ: No API key provided');
    return;
  }

  const config = {
    apiEndpoint: 'https://api.sentientiq.app/api/emotional/ingest',
    apiKey: apiKey,
    sessionId: `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    debug: debugMode
  };

  // ==========================================
  // THE DIGITAL EMOTION WHEEL
  // ==========================================
  
  const EMOTION_PROGRESSIONS = {
    // Curiosity Journey (healthy exploration)
    exploration: {
      stages: ['curiosity', 'interest', 'engagement', 'understanding'],
      triggers: {
        curiosity: { mouseVelocity: 'moderate', scrollPattern: 'smooth', timeOnPage: '<10s' },
        interest: { hoverDuration: '1-3s', scrollDepth: '>30%', clicksOnContent: true },
        engagement: { timeOnZone: '>15s', scrollPattern: 'reading', multipleHovers: true },
        understanding: { scrolledToBottom: true, timeOnPage: '>60s', slowVelocity: true }
      }
    },
    
    // Confusion Journey (getting lost)
    confusion: {
      stages: ['hesitation', 'confusion', 'frustration', 'rage'],
      triggers: {
        hesitation: { hoverDuration: '2-5s', mouseStops: '>3', noClickAfterHover: true },
        confusion: { scrollDirectionChanges: '>3', rapidMouseMovement: true, backButton: false },
        frustration: { rageClicks: '3-5', scrollVelocity: 'erratic', timeStuck: '>20s' },
        rage: { rageClicks: '>5', rapidEscape: true, tabSwitching: true }
      }
    },
    
    // Trust Journey (skepticism spectrum)
    trust: {
      stages: ['trust', 'skepticism', 'distrust', 'paranoia', 'manipulation_detection'],
      triggers: {
        trust: { smoothProgress: true, noHesitation: true, directActions: true },
        skepticism: { readingFinePrint: true, checkingPricing: true, slowProgress: true },
        distrust: { avoidingCTAs: true, externalSearching: true, compareShopping: true },
        paranoia: { checkingHTTPS: true, readingPrivacy: true, formAbandonment: true },
        manipulation_detection: { darkPatternAvoidance: true, unsubscribeSearch: true }
      }
    },
    
    // Buyer Psychology (the purchase emotional rollercoaster)
    purchase: {
      stages: ['price_checking', 'sticker_shock', 'comparison_shopping', 'fomo', 'buyer_remorse_preview'],
      triggers: {
        price_checking: { hoverOnPrice: '1-2s', scrollToPricing: true, multipleViews: false },
        sticker_shock: { suddenStop: true, mouseRecoil: true, quickScrollAway: true },
        comparison_shopping: { tabSwitching: true, calculatorOpen: true, multipleReturns: true },
        fomo: { urgencyNoticed: true, scarcityChecking: true, quickDecision: true },
        buyer_remorse_preview: { longPause: '>10s', cartAbandonment: true, reviewReading: true }
      }
    },
    
    // Boredom Journey (the silent killer)
    boredom: {
      stages: ['scanning', 'skimming', 'disinterest', 'abandonment_intent'],
      triggers: {
        scanning: { quickScroll: true, noHovers: true, timePerSection: '<3s' },
        skimming: { scrollVelocity: 'fast', noClicks: true, directionalScroll: true },
        disinterest: { idleTime: '>30s', mouseAtEdge: true, noEngagement: true },
        abandonment_intent: { mouseToTop: true, velocity: 'escape', lastAction: '>45s' }
      }
    }
  };

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const state = {
    // Current emotional state
    currentEmotion: null,
    emotionalJourney: [],
    emotionIntensity: 0,
    
    // Behavioral tracking
    mousePosition: { x: 0, y: 0 },
    mouseVelocity: 0,
    mouseStops: 0,
    lastMoveTime: Date.now(),
    
    // Interaction patterns
    scrollPattern: [],
    scrollDirectionChanges: 0,
    clickPattern: [],
    hoverHistory: new Map(),
    
    // Page engagement
    timeOnPage: 0,
    scrollDepth: 0,
    tabSwitches: 0,
    formInteractions: 0,
    
    // Specific detections
    priceHovers: [],
    ctaAvoidance: 0,
    darkPatternEncounters: 0,
    
    // Meta tracking
    lastEmotionChange: Date.now(),
    emotionCooldowns: {}
  };

  // ==========================================
  // EMOTION DETECTION ENGINE
  // ==========================================
  
  /**
   * Detect emotional progression based on behavioral patterns
   */
  function detectEmotionalProgression() {
    const now = Date.now();
    const timeOnPage = (now - config.startTime) / 1000;
    
    // Prioritize journeys based on current state
    const journeyPriority = ['boredom', 'confusion', 'purchase', 'trust', 'exploration'];
    
    // If currently in a journey, check that journey first
    if (state.lastJourneyType) {
      journeyPriority.unshift(state.lastJourneyType);
    }
    
    // Check journeys in priority order
    for (const journeyType of journeyPriority) {
      const journey = EMOTION_PROGRESSIONS[journeyType];
      if (!journey) continue;
      
      const currentStageIndex = journey.stages.indexOf(state.currentEmotion);
      
      // Check if we should progress to next stage
      for (let i = 0; i < journey.stages.length; i++) {
        const stage = journey.stages[i];
        const triggers = journey.triggers[stage];
        
        if (checkTriggers(triggers, timeOnPage)) {
          // Only transition if it makes sense
          const shouldTransition = (
            // Moving forward in same journey
            (journeyType === state.lastJourneyType && i > currentStageIndex) ||
            // Starting new journey after sufficient time
            (journeyType !== state.lastJourneyType && (now - state.lastEmotionChange) > 2000)
          );
          
          if (shouldTransition) {
            transitionEmotion(stage, journeyType, i * 25);
            return; // Only one emotion per cycle
          }
          break;
        }
      }
    }
  }

  /**
   * Check if behavioral triggers match current state
   */
  function checkTriggers(triggers, timeOnPage) {
    let matches = 0;
    let totalTriggers = 0;
    
    for (const [trigger, condition] of Object.entries(triggers)) {
      totalTriggers++;
      
      switch(trigger) {
        case 'mouseVelocity':
          if (condition === 'moderate' && state.mouseVelocity > 0.5 && state.mouseVelocity < 3) matches++;
          if (condition === 'fast' && state.mouseVelocity > 3) matches++;
          break;
          
        case 'hoverDuration':
          const lastHover = Array.from(state.hoverHistory.values()).pop();
          if (lastHover) {
            const duration = (Date.now() - lastHover.start) / 1000;
            const [min, max] = condition.split('-').map(s => parseFloat(s));
            if (duration >= min && duration <= max) matches++;
          }
          break;
          
        case 'scrollPattern':
          if (condition === 'smooth' && state.scrollDirectionChanges < 2) matches++;
          // Check if any recent scroll was 'steady' for reading pattern
          const hasReadingPattern = state.scrollPattern.some(s => s.pattern === 'steady');
          if (condition === 'reading' && hasReadingPattern) matches++;
          if (condition === 'erratic' && state.scrollDirectionChanges > 3) matches++;
          break;
          
        case 'timeOnPage':
          const timeCondition = parseFloat(condition.replace(/[<>s]/g, ''));
          if (condition.startsWith('<') && timeOnPage < timeCondition) matches++;
          if (condition.startsWith('>') && timeOnPage > timeCondition) matches++;
          break;
          
        case 'rageClicks':
          const clickCount = state.clickPattern.filter(c => 
            Date.now() - c.time < 2000
          ).length;
          if (condition.includes('-')) {
            const [min, max] = condition.split('-').map(Number);
            if (clickCount >= min && clickCount <= max) matches++;
          } else if (condition.startsWith('>')) {
            const min = parseInt(condition.substring(1));
            if (clickCount > min) matches++;
          }
          break;
          
        case 'scrollDepth':
          const depthCondition = parseFloat(condition.replace(/[>%]/g, ''));
          if (condition.startsWith('>') && state.scrollDepth > depthCondition) matches++;
          break;
          
        case 'hoverOnPrice':
          const priceHover = state.priceHovers[state.priceHovers.length - 1];
          if (priceHover) {
            const duration = (Date.now() - priceHover.start) / 1000;
            const [min, max] = condition.split('-').map(s => parseFloat(s));
            if (duration >= min && duration <= max) matches++;
          }
          break;
          
        case 'mouseRecoil':
          // Sudden backward movement after encountering something
          if (state.mouseVelocity > 5 && state.lastMouseDirection === 'away') matches++;
          break;
          
        case 'tabSwitching':
          // Only count if we actually switched tabs recently (within last 10 seconds)
          // AND the page is currently visible
          if (condition && state.tabSwitches > 0 && !document.hidden) {
            // Reset tab switches after checking to prevent loops
            const recentSwitch = (Date.now() - state.lastTabSwitch) < 10000;
            if (recentSwitch) matches++;
          }
          break;
          
        case 'darkPatternAvoidance':
          if (condition && state.darkPatternEncounters > 0 && state.ctaAvoidance > 2) matches++;
          break;
          
        case 'noClickAfterHover':
          // Check if user hovered but didn't click
          const recentHovers = Array.from(state.hoverHistory.values()).filter(
            h => Date.now() - h.start < 5000
          );
          if (condition && recentHovers.length > 0 && state.clickPattern.length === 0) matches++;
          break;
          
        case 'multipleHovers':
          if (condition && state.hoverHistory.size > 3) matches++;
          break;
          
        case 'slowVelocity':
          if (condition && state.mouseVelocity < 1) matches++;
          break;
          
        default:
          // Simple boolean checks
          if (condition === true && state[trigger]) matches++;
      }
    }
    
    // Need at least 30% trigger match (very sensitive)
    // Or if we have any strong signal (like pricing hover)
    return (matches / totalTriggers) >= 0.3 || matches >= 2;
  }

  /**
   * Transition to new emotional state
   */
  function transitionEmotion(newEmotion, journeyType, intensity) {
    // Don't repeat same emotion within cooldown
    const cooldownKey = `${newEmotion}_${journeyType}`;
    if (state.emotionCooldowns[cooldownKey]) {
      const timeSince = Date.now() - state.emotionCooldowns[cooldownKey];
      if (timeSince < 5000) return; // 5 second cooldown (was 10)
    }
    
    // Prevent contradictory emotions
    const contradictions = {
      'curiosity': ['disinterest', 'abandonment_intent', 'boredom'],
      'disinterest': ['curiosity', 'interest', 'engagement', 'excitement'],
      'engagement': ['disinterest', 'boredom', 'abandonment_intent'],
      'confidence': ['hesitation', 'confusion', 'skepticism'],
      'hesitation': ['confidence', 'trust'],
      'trust': ['paranoia', 'distrust', 'skepticism'],
      'rage': ['delight', 'satisfaction', 'calm']
    };
    
    // Check if new emotion contradicts current state
    const currentContradictions = contradictions[state.currentEmotion] || [];
    const newContradictions = contradictions[newEmotion] || [];
    
    // Don't transition to contradictory emotion unless enough time has passed
    if (currentContradictions.includes(newEmotion) || newContradictions.includes(state.currentEmotion)) {
      const timeSinceLastChange = Date.now() - state.lastEmotionChange;
      if (timeSinceLastChange < 3000) return; // Need 3 seconds before contradicting emotion
    }
    
    // Record transition
    state.emotionalJourney.push({
      from: state.currentEmotion,
      to: newEmotion,
      journey: journeyType,
      timestamp: Date.now()
    });
    
    state.currentEmotion = newEmotion;
    state.lastJourneyType = journeyType;
    state.emotionIntensity = 50 + intensity; // Base 50 + progression intensity
    state.lastEmotionChange = Date.now();
    state.emotionCooldowns[cooldownKey] = Date.now();
    
    // Emit the emotion
    emitEmotion(newEmotion, {
      confidence: Math.min(95, 70 + (intensity / 2)),
      intensity: state.emotionIntensity,
      journey: journeyType,
      progression: state.emotionalJourney.slice(-3) // Last 3 transitions
    });
  }

  // ==========================================
  // BEHAVIORAL TRACKING
  // ==========================================
  
  /**
   * Track mouse movement patterns
   */
  function trackMouseBehavior(e) {
    const now = Date.now();
    const timeDelta = now - state.lastMoveTime;
    
    if (timeDelta > 0) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - state.mousePosition.x, 2) + 
        Math.pow(e.clientY - state.mousePosition.y, 2)
      );
      
      const velocity = distance / timeDelta;
      
      // Detect mouse stops (hesitation points)
      if (state.mouseVelocity > 1 && velocity < 0.1) {
        state.mouseStops++;
      }
      
      // Detect recoil (sudden backward movement)
      if (e.clientY < state.mousePosition.y - 50 && velocity > 5) {
        state.lastMouseDirection = 'away';
      } else {
        state.lastMouseDirection = 'forward';
      }
      
      state.mouseVelocity = velocity;
    }
    
    state.mousePosition = { x: e.clientX, y: e.clientY };
    state.lastMoveTime = now;
    
    // Check if mouse at edges (abandonment signal)
    if (e.clientY < 20 || e.clientX < 10 || e.clientX > window.innerWidth - 10) {
      state.mouseAtEdge = true;
    } else {
      state.mouseAtEdge = false;
    }
  }

  /**
   * Track scroll patterns
   */
  function trackScrollBehavior() {
    const scrollY = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    // Calculate scroll depth
    state.scrollDepth = Math.max(state.scrollDepth, 
      (scrollY + clientHeight) / scrollHeight * 100
    );
    
    // Initialize scroll tracking
    if (state.scrollPattern.length === 0) {
      state.scrollPattern.push({
        y: scrollY,
        time: Date.now(),
        direction: 'down',
        pattern: 'initial'
      });
    }
    
    // Track scroll pattern
    const lastScroll = state.scrollPattern[state.scrollPattern.length - 1];
    if (lastScroll && lastScroll.y !== scrollY) {
      const direction = scrollY > lastScroll.y ? 'down' : 'up';
      if (lastScroll.direction !== direction) {
        state.scrollDirectionChanges++;
      }
      
      const velocity = Math.abs(scrollY - lastScroll.y) / (Date.now() - lastScroll.time);
      
      // Classify scroll pattern
      let pattern = 'normal';
      if (velocity < 0.5) pattern = 'steady';
      if (velocity > 2) pattern = 'fast';
      if (state.scrollDirectionChanges > 3 && velocity > 1) pattern = 'erratic';
      
      state.scrollPattern.push({
        y: scrollY,
        time: Date.now(),
        direction: direction,
        pattern: pattern
      });
    } else {
      state.scrollPattern.push({
        y: scrollY,
        time: Date.now(),
        direction: 'down',
        pattern: 'initial'
      });
    }
    
    // Keep last 10 scroll events
    if (state.scrollPattern.length > 10) {
      state.scrollPattern.shift();
    }
    
    // Check if scrolled to bottom
    if (scrollY + clientHeight >= scrollHeight - 100) {
      state.scrolledToBottom = true;
    }
  }

  /**
   * Track click patterns
   */
  function trackClickBehavior(e) {
    const now = Date.now();
    const target = e.target;
    
    state.clickPattern.push({
      time: now,
      x: e.clientX,
      y: e.clientY,
      target: target.tagName,
      text: target.textContent?.substring(0, 30)
    });
    
    // Immediate emotion for specific clicks
    if (target.textContent?.match(/pric/i) || target.href?.includes('pricing')) {
      transitionEmotion('price_checking', 'purchase', 40);
    } else if (target.tagName === 'BUTTON' || target.classList?.contains('btn')) {
      // Button clicks show engagement
      transitionEmotion('engagement', 'exploration', 35);
    } else if (target.tagName === 'A') {
      // Link clicks show curiosity
      transitionEmotion('curiosity', 'exploration', 30);
    }
    
    // Keep last 10 clicks
    if (state.clickPattern.length > 10) {
      state.clickPattern.shift();
    }
    
    // Check for CTA avoidance
    if (target.tagName === 'BUTTON' || target.classList?.contains('cta')) {
      // User finally clicked a CTA
      state.ctaAvoidance = Math.max(0, state.ctaAvoidance - 1);
    } else if (document.querySelectorAll('button, .cta, [role="button"]').length > 0) {
      // User clicked something else when CTAs were available
      state.ctaAvoidance++;
    }
    
    // Check for dark pattern encounters
    if (target.textContent?.match(/limited time|only \d+ left|expires|hurry/i)) {
      state.darkPatternEncounters++;
    }
  }

  /**
   * Track hover behavior
   */
  function trackHoverBehavior(e) {
    const target = e.target;
    const key = target.tagName + '_' + (target.id || target.className);
    
    if (!state.hoverHistory.has(key)) {
      state.hoverHistory.set(key, {
        start: Date.now(),
        element: target.tagName,
        text: target.textContent?.substring(0, 30)
      });
      
      // Track price hovers specifically
      if (target.textContent?.match(/pric|\$|plan|tier|buy|purchase/i) || 
          target.closest('[class*="price"], [href*="pricing"]')) {
        state.priceHovers.push({
          start: Date.now(),
          price: target.textContent
        });
        // Immediate emission for pricing interest
        setTimeout(() => {
          if (state.priceHovers.length > 0) {
            transitionEmotion('price_checking', 'purchase', 30);
          }
        }, 1000);
      }
      
      // Track CTA/button hovers
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || 
          target.classList?.contains('btn') || target.role === 'button') {
        // Immediate interest signal
        setTimeout(() => {
          const hoverDuration = Date.now() - state.hoverHistory.get(key).start;
          if (hoverDuration > 500) {
            transitionEmotion('interest', 'exploration', 25);
          }
        }, 600);
      }
    }
  }

  // ==========================================
  // EMOTION EMISSION
  // ==========================================
  
  function emitEmotion(emotionType, metadata = {}) {
    const event = {
      session_id: config.sessionId,
      user_id: config.apiKey,
      tenant_id: config.apiKey === 'DEMO_KEY' ? 'demo' : config.apiKey,
      emotion: emotionType,
      confidence: metadata.confidence || 75,
      intensity: metadata.intensity || state.emotionIntensity || 50,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        timeOnPage: Date.now() - config.startTime,
        scrollDepth: state.scrollDepth,
        mouseStops: state.mouseStops,
        journey: state.emotionalJourney.slice(-5) // Last 5 emotional transitions
      }
    };
    
    // Emit browser event
    window.dispatchEvent(new CustomEvent('sentientiq:emotion', { detail: event }));
    
    // Send to API
    fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify(event)
    }).catch(err => {
      if (config.debug) console.error('Failed to send emotion:', err);
    });
    
    if (config.debug) {
      const journey = metadata.journey || 'unknown';
      console.log(`🎭 ${emotionType} [${journey}] (${metadata.confidence}%)`, metadata);
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  
  document.addEventListener('mousemove', trackMouseBehavior);
  document.addEventListener('click', trackClickBehavior);
  document.addEventListener('mouseover', trackHoverBehavior);
  document.addEventListener('mouseout', function(e) {
    // Track when user leaves an element
    const target = e.target;
    const key = target.tagName + '_' + (target.id || target.className);
    const hoverData = state.hoverHistory.get(key);
    
    if (hoverData) {
      const duration = Date.now() - hoverData.start;
      
      // Hesitation on interactive elements
      if (duration > 2000 && duration < 5000 && 
          (target.tagName === 'BUTTON' || target.tagName === 'A')) {
        transitionEmotion('hesitation', 'confusion', 30);
      }
      // Quick hover and leave = scanning
      else if (duration < 500) {
        if (!state.currentEmotion || state.currentEmotion === 'scanning') {
          transitionEmotion('scanning', 'boredom', 20);
        }
      }
    }
  });
  window.addEventListener('scroll', trackScrollBehavior);
  
  // Detect tab switches
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      state.tabSwitches++;
      state.lastTabSwitch = Date.now();
      // Stop detection when tab is not visible
      if (window.emotionDetectionInterval) {
        clearInterval(window.emotionDetectionInterval);
        window.emotionDetectionInterval = null;
      }
    } else {
      // Resume detection when tab becomes visible
      if (!window.emotionDetectionInterval) {
        window.emotionDetectionInterval = setInterval(detectEmotionalProgression, 500);
      }
    }
  });
  
  // Run emotion detection every 500ms for better responsiveness
  window.emotionDetectionInterval = setInterval(detectEmotionalProgression, 500);
  
  // Track idle time
  setInterval(() => {
    const timeSinceLastAction = Date.now() - state.lastMoveTime;
    if (timeSinceLastAction > 30000) {
      state.idleTime = timeSinceLastAction;
    }
  }, 5000);

  // ==========================================
  // PUBLIC API
  // ==========================================
  
  window.SentientIQ = {
    version: '3.0.0',
    
    getEmotionalJourney: () => state.emotionalJourney,
    getCurrentEmotion: () => state.currentEmotion,
    getEmotionIntensity: () => state.emotionIntensity,
    
    // Manual triggers for testing
    debug: {
      triggerEmotion: (emotion) => {
        transitionEmotion(emotion, 'manual', 75);
      },
      getState: () => state,
      getProgressions: () => EMOTION_PROGRESSIONS
    }
  };

  // ==========================================
  // INITIALIZATION
  // ==========================================
  
  // Initial emotion based on entry
  setTimeout(() => {
    if (document.referrer.includes('google') || document.referrer.includes('bing')) {
      emitEmotion('curiosity', { 
        confidence: 70, 
        source: 'search_engine',
        journey: 'exploration' 
      });
    } else if (document.referrer.includes(window.location.hostname)) {
      emitEmotion('interest', { 
        confidence: 75, 
        source: 'internal_navigation',
        journey: 'exploration' 
      });
    } else {
      emitEmotion('scanning', { 
        confidence: 60, 
        source: 'direct_or_unknown',
        journey: 'boredom' 
      });
    }
  }, 500);

  if (config.debug) {
    console.log(`
╔══════════════════════════════════════════════════════╗
║    🎭 SENTIENTIQ v3.0 - DIGITAL EMOTION WHEEL      ║
║                                                      ║
║  Tracking authentic emotional progressions:          ║
║  • Curiosity → Confusion → Rage                     ║
║  • Trust → Skepticism → Paranoia                    ║
║  • Interest → Sticker Shock → Buyer Remorse         ║
║                                                      ║
║  No bullshit theater. Real emotions.                ║
╚══════════════════════════════════════════════════════╝
    `);
  }

})();