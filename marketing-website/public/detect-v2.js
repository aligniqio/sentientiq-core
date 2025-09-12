/**
 * SentientIQ Emotion Detection v2.0
 * Contextual, zone-based emotion detection with behavioral physics
 * 
 * Clean break from incremental patches. Production-ready.
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
  // CONTEXTUAL ZONES & RELEVANT EMOTIONS
  // ==========================================
  
  const ZONES = {
    navigation: {
      selector: 'nav, header, [role="navigation"]',
      emotions: ['exploration', 'abandonment_intent', 'navigation_confidence']
    },
    hero: {
      selector: '.hero, #hero, [data-section="hero"]',
      emotions: ['curiosity', 'skepticism', 'intrigue']
    },
    demo: {
      selector: '#emotional-engine, .demo, [data-section="demo"]',
      emotions: ['engagement', 'delight', 'confusion', 'understanding']
    },
    features: {
      selector: '.features, #features, [data-section="features"]',
      emotions: ['interest', 'evaluation', 'comparison']
    },
    social_proof: {
      selector: '.testimonials, .trust, [data-section="proof"]',
      emotions: ['trust_building', 'validation', 'skepticism']
    },
    pricing: {
      selector: '#pricing, .pricing, [data-section="pricing"]',
      emotions: ['hesitation', 'purchase_intent', 'sticker_shock', 'confidence']
    },
    cta: {
      selector: 'button, .btn, [role="button"]',
      emotions: ['determination', 'uncertainty', 'action_intent']
    }
  };

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const state = {
    currentZone: null,
    mousePosition: { x: 0, y: 0 },
    mouseVelocity: 0,
    scrollVelocity: 0,
    lastScrollY: 0,
    lastMoveTime: Date.now(),
    
    // Interaction tracking
    hoverTarget: null,
    hoverStartTime: 0,
    clickSequence: [],
    scrollPattern: [],
    
    // Navigation specific
    navHovers: new Map(), // Track hover duration per nav item
    exitIntentScore: 0,
    
    // Emotion history
    detectedEmotions: [],
    lastEmotion: null,
    emotionCooldown: {}
  };

  // ==========================================
  // ZONE DETECTION
  // ==========================================
  
  function getCurrentZone(element) {
    if (!element) return null;
    
    // Check element and its parents for zone match
    let current = element;
    while (current && current !== document.body) {
      for (const [zoneName, zoneConfig] of Object.entries(ZONES)) {
        if (current.matches && current.matches(zoneConfig.selector)) {
          return zoneName;
        }
      }
      current = current.parentElement;
    }
    
    // Check by viewport position for section-based zones
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const viewportCenter = scrollY + (viewportHeight / 2);
    
    // Find sections and determine which one we're in
    const sections = document.querySelectorAll('section, [class*="section"]');
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + scrollY;
      const sectionBottom = sectionTop + rect.height;
      
      if (viewportCenter >= sectionTop && viewportCenter <= sectionBottom) {
        // Try to identify section type
        const classList = section.className.toLowerCase();
        const id = section.id?.toLowerCase();
        
        if (classList.includes('hero') || id === 'hero') return 'hero';
        if (classList.includes('pricing') || id === 'pricing') return 'pricing';
        if (classList.includes('demo') || id?.includes('demo')) return 'demo';
        if (classList.includes('feature')) return 'features';
      }
    }
    
    return 'general';
  }

  // ==========================================
  // EMOTION DETECTION FUNCTIONS
  // ==========================================
  
  /**
   * Navigation-specific emotions
   */
  function detectNavigationBehavior(target, eventType) {
    if (!target) return;
    
    const isNavElement = target.closest('nav, header, [role="navigation"]');
    if (!isNavElement) return;
    
    const isExternalLink = target.href && !target.href.includes(window.location.hostname);
    const isPricingLink = target.textContent?.toLowerCase().includes('pricing') || 
                         target.href?.includes('#pricing');
    const isCtaButton = target.classList?.contains('btn-primary') || 
                       target.textContent?.match(/start|demo|try/i);
    
    if (eventType === 'hover') {
      // Track hover duration on nav items
      if (!state.navHovers.has(target)) {
        state.navHovers.set(target, Date.now());
      }
    } else if (eventType === 'leave') {
      // Check hover duration when leaving
      const hoverStart = state.navHovers.get(target);
      if (hoverStart) {
        const duration = Date.now() - hoverStart;
        state.navHovers.delete(target);
        
        if (duration > 2000 && duration < 5000) {
          // Hesitating on navigation
          emitEmotion('navigation_hesitation', {
            confidence: 75,
            duration: duration,
            linkText: target.textContent,
            linkType: isExternalLink ? 'external' : 'internal'
          });
        }
      }
    } else if (eventType === 'click') {
      // Confident navigation
      if (isPricingLink) {
        emitEmotion('pricing_interest', {
          confidence: 85,
          source: 'navigation',
          intent: 'explore_pricing'
        });
      } else if (isCtaButton) {
        emitEmotion('action_intent', {
          confidence: 90,
          source: 'navigation',
          action: target.textContent
        });
      } else {
        emitEmotion('exploration', {
          confidence: 70,
          destination: target.textContent,
          type: isExternalLink ? 'leaving_site' : 'exploring_site'
        });
      }
    }
  }

  /**
   * Pricing zone emotions
   */
  function detectPricingBehavior(target, eventType) {
    const zone = getCurrentZone(target);
    if (zone !== 'pricing') return;
    
    const isPriceElement = target.textContent?.includes('$') || 
                          target.closest('[class*="price"], [class*="tier"]');
    const isBuyButton = target.textContent?.match(/buy|purchase|get started|subscribe/i);
    
    if (eventType === 'hover' && isPriceElement) {
      // Start tracking price evaluation
      if (!state.priceHoverStart) {
        state.priceHoverStart = Date.now();
      }
    } else if (eventType === 'leave' && state.priceHoverStart) {
      const duration = Date.now() - state.priceHoverStart;
      state.priceHoverStart = null;
      
      if (duration > 1500 && duration < 4000) {
        emitEmotion('price_evaluation', {
          confidence: 80,
          duration: duration,
          evaluationType: 'considering'
        });
      } else if (duration > 4000) {
        emitEmotion('price_hesitation', {
          confidence: 85,
          duration: duration,
          concern: 'cost_analysis'
        });
      }
    } else if (eventType === 'click' && isBuyButton) {
      emitEmotion('purchase_confidence', {
        confidence: 95,
        trigger: 'buy_button_click',
        readiness: 'high'
      });
    }
  }

  /**
   * Scroll-based engagement detection
   */
  function detectScrollEngagement() {
    const now = Date.now();
    const scrollY = window.scrollY;
    const scrollDelta = scrollY - state.lastScrollY;
    const timeDelta = now - state.lastScrollTime || 1;
    const velocity = Math.abs(scrollDelta) / timeDelta;
    
    // Update scroll pattern
    state.scrollPattern.push({
      y: scrollY,
      velocity: velocity,
      direction: scrollDelta > 0 ? 'down' : 'up',
      time: now
    });
    
    // Keep last 10 scroll events
    if (state.scrollPattern.length > 10) {
      state.scrollPattern.shift();
    }
    
    // Analyze scroll pattern
    if (state.scrollPattern.length >= 5) {
      const recent = state.scrollPattern.slice(-5);
      const directions = recent.map(p => p.direction);
      const avgVelocity = recent.reduce((sum, p) => sum + p.velocity, 0) / recent.length;
      
      // Check for reading pattern (consistent downward scroll)
      const readingPattern = directions.filter(d => d === 'down').length >= 4;
      if (readingPattern && avgVelocity > 0.5 && avgVelocity < 2) {
        const zone = getCurrentZone(document.elementFromPoint(window.innerWidth/2, window.innerHeight/2));
        emitEmotion('content_engagement', {
          confidence: 75,
          zone: zone,
          pattern: 'reading',
          velocity: avgVelocity
        });
      }
      
      // Check for confusion (rapid direction changes)
      const directionChanges = directions.reduce((changes, dir, i) => {
        if (i > 0 && dir !== directions[i-1]) changes++;
        return changes;
      }, 0);
      
      if (directionChanges >= 3 && avgVelocity > 2) {
        emitEmotion('confusion', {
          confidence: 80,
          zone: getCurrentZone(document.elementFromPoint(window.innerWidth/2, window.innerHeight/2)),
          pattern: 'searching',
          directionChanges: directionChanges
        });
      }
    }
    
    state.lastScrollY = scrollY;
    state.lastScrollTime = now;
  }

  /**
   * Rage click detection
   */
  function detectRageClick(x, y) {
    const now = Date.now();
    
    state.clickSequence.push({
      time: now,
      x: x,
      y: y
    });
    
    // Keep last 5 clicks
    state.clickSequence = state.clickSequence.filter(c => now - c.time < 2000);
    
    if (state.clickSequence.length >= 3) {
      // Calculate click intervals
      const intervals = [];
      for (let i = 1; i < state.clickSequence.length; i++) {
        intervals.push(state.clickSequence[i].time - state.clickSequence[i-1].time);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Check click proximity (are they clicking the same area?)
      const xVariance = Math.max(...state.clickSequence.map(c => c.x)) - 
                       Math.min(...state.clickSequence.map(c => c.x));
      const yVariance = Math.max(...state.clickSequence.map(c => c.y)) - 
                       Math.min(...state.clickSequence.map(c => c.y));
      
      if (avgInterval < 400 && xVariance < 100 && yVariance < 100) {
        emitEmotion('frustration', {
          confidence: 90,
          clickCount: state.clickSequence.length,
          avgInterval: Math.round(avgInterval),
          zone: getCurrentZone(document.elementFromPoint(x, y))
        });
        state.clickSequence = []; // Reset after detection
      }
    }
  }

  /**
   * Exit intent detection
   */
  function detectExitIntent(x, y) {
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    
    // Mouse moving toward top of screen (potential tab/close)
    if (y < 50 && state.mouseVelocity > 3) {
      state.exitIntentScore += 2;
    }
    
    // Mouse at edges
    if (x < 10 || x > screenWidth - 10) {
      state.exitIntentScore += 1;
    }
    
    // Rapid upward movement
    if (state.lastMouseY && y < state.lastMouseY - 100) {
      state.exitIntentScore += 3;
    }
    
    if (state.exitIntentScore > 5 && !state.exitIntentFired) {
      emitEmotion('abandonment_intent', {
        confidence: Math.min(70 + state.exitIntentScore * 2, 90),
        trigger: 'exit_movement',
        lastZone: state.currentZone
      });
      state.exitIntentFired = true;
      setTimeout(() => {
        state.exitIntentFired = false;
        state.exitIntentScore = 0;
      }, 30000); // Reset after 30 seconds
    }
    
    // Decay exit intent score over time
    state.exitIntentScore = Math.max(0, state.exitIntentScore - 0.1);
    state.lastMouseY = y;
  }

  // ==========================================
  // EMOTION EMISSION & API
  // ==========================================
  
  function emitEmotion(emotionType, metadata = {}) {
    // Prevent duplicate emissions within cooldown
    const cooldownKey = `${emotionType}_${state.currentZone}`;
    if (state.emotionCooldown[cooldownKey]) {
      const timeSince = Date.now() - state.emotionCooldown[cooldownKey];
      if (timeSince < 5000) return; // 5 second cooldown per emotion per zone
    }
    
    const event = {
      session_id: config.sessionId,
      user_id: config.apiKey,
      tenant_id: config.apiKey === 'DEMO_KEY' ? 'demo' : config.apiKey, // Add tenant_id for backend
      emotion: emotionType,
      confidence: metadata.confidence || 75,
      intensity: metadata.intensity || 70,
      zone: state.currentZone || 'unknown',
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        timeOnPage: Date.now() - config.startTime,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };
    
    // Store locally
    state.detectedEmotions.push(event);
    state.lastEmotion = emotionType;
    state.emotionCooldown[cooldownKey] = Date.now();
    
    // Emit browser event
    window.dispatchEvent(new CustomEvent('sentientiq:emotion', { detail: event }));
    
    // Send to API (including DEMO_KEY for testing)
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
      console.log(`🎯 ${emotionType} (${metadata.confidence}%)`, metadata);
    }
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  
  document.addEventListener('mousemove', function(e) {
    const now = Date.now();
    const timeDelta = now - state.lastMoveTime;
    
    if (timeDelta > 0) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - state.mousePosition.x, 2) + 
        Math.pow(e.clientY - state.mousePosition.y, 2)
      );
      state.mouseVelocity = distance / timeDelta;
    }
    
    state.mousePosition = { x: e.clientX, y: e.clientY };
    state.lastMoveTime = now;
    state.currentZone = getCurrentZone(e.target);
    
    // Check for exit intent
    detectExitIntent(e.clientX, e.clientY);
  });

  document.addEventListener('mouseover', function(e) {
    state.hoverTarget = e.target;
    state.hoverStartTime = Date.now();
    
    // Navigation-specific hover
    detectNavigationBehavior(e.target, 'hover');
    
    // Pricing-specific hover
    detectPricingBehavior(e.target, 'hover');
  });

  document.addEventListener('mouseout', function(e) {
    if (state.hoverTarget === e.target) {
      // Check navigation hesitation
      detectNavigationBehavior(e.target, 'leave');
      
      // Check pricing hesitation
      detectPricingBehavior(e.target, 'leave');
      
      state.hoverTarget = null;
      state.hoverStartTime = 0;
    }
  });

  document.addEventListener('click', function(e) {
    const target = e.target;
    state.currentZone = getCurrentZone(target);
    
    // Check for rage clicking
    detectRageClick(e.clientX, e.clientY);
    
    // Navigation clicks
    detectNavigationBehavior(target, 'click');
    
    // Pricing clicks
    detectPricingBehavior(target, 'click');
    
    // General CTA detection
    if (target.matches('button, .btn, [role="button"]')) {
      const buttonText = target.textContent?.toLowerCase() || '';
      
      if (buttonText.match(/demo|try|start|begin/)) {
        emitEmotion('curiosity_action', {
          confidence: 85,
          action: 'demo_request',
          zone: state.currentZone
        });
      } else if (buttonText.match(/contact|talk|call/)) {
        emitEmotion('human_contact_desire', {
          confidence: 80,
          action: 'contact_request',
          zone: state.currentZone
        });
      }
    }
  });

  window.addEventListener('scroll', function() {
    detectScrollEngagement();
  });

  // ==========================================
  // PUBLIC API
  // ==========================================
  
  window.SentientIQ = {
    version: '2.0.0',
    
    // Core API
    getSessionId: () => config.sessionId,
    getCurrentZone: () => state.currentZone,
    getEmotions: () => state.detectedEmotions,
    
    // Manual tracking
    track: (emotion, confidence, metadata) => {
      emitEmotion(emotion, { confidence, ...metadata });
    },
    
    // Testing & debugging
    debug: {
      getState: () => state,
      getZones: () => ZONES,
      simulateEmotion: (emotion) => {
        emitEmotion(emotion, { 
          confidence: 100, 
          source: 'manual_test' 
        });
      },
      reset: () => {
        state.detectedEmotions = [];
        state.emotionCooldown = {};
      }
    },
    
    // Event subscription
    on: (event, callback) => {
      window.addEventListener('sentientiq:' + event, (e) => {
        callback(e.detail);
      });
    }
  };

  // ==========================================
  // INITIALIZATION
  // ==========================================
  
  // Send session start
  setTimeout(() => {
    emitEmotion('session_start', {
      confidence: 100,
      entryPoint: window.location.pathname,
      referrer: document.referrer
    });
  }, 100);

  if (config.debug) {
    console.log(`
╔══════════════════════════════════════════════════════╗
║      🧠 SENTIENTIQ v2.0 - CONTEXTUAL DETECTION      ║
║                                                      ║
║  Zone-based emotion detection active                ║
║  Session: ${config.sessionId.substring(0, 20)}...  ║
║                                                      ║
║  Debug mode enabled - check SentientIQ.debug        ║
╚══════════════════════════════════════════════════════╝
    `);
  }

})();