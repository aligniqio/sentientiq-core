/**
 * SentientIQ Emotion Detection v4.0
 * Section-Aware Emotional Intelligence
 * 
 * Each section has its own emotional vocabulary.
 * Transitions between sections tell their own story.
 * The complete emotional journey, not fragments.
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
    apiEndpoint: 'https://api.sentientiq.app/api/emotional/event',
    apiKey: apiKey,
    sessionId: `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    debug: debugMode
  };

  // ==========================================
  // SECTION-SPECIFIC EMOTIONAL CONTEXTS
  // ==========================================
  
  const SECTION_EMOTIONS = {
    // Above the fold / Hero section
    hero: {
      emotions: {
        'curiosity': { triggers: ['first_visit', 'cta_hover'], confidence: 70 },
        'skepticism': { triggers: ['quick_scroll', 'no_interaction'], confidence: 65 },
        'intrigue': { triggers: ['slow_read', 'mouse_trace'], confidence: 75 },
        'immediate_bounce_risk': { triggers: ['rapid_escape', 'tab_prepare'], confidence: 85 }
      },
      transitionEmotions: {
        toDemo: 'exploration_intent',
        toPricing: 'price_curiosity',
        toTestimonials: 'validation_seeking'
      }
    },
    
    // Demo / How it works section
    demo: {
      emotions: {
        'engagement': { triggers: ['interaction', 'hover_elements'], confidence: 80 },
        'understanding': { triggers: ['slow_scroll', 'complete_view'], confidence: 75 },
        'confusion': { triggers: ['back_scroll', 'hesitation'], confidence: 70 },
        'delight': { triggers: ['multiple_interactions', 'positive_velocity'], confidence: 85 },
        'technical_overwhelm': { triggers: ['quick_escape', 'scroll_past'], confidence: 65 }
      },
      transitionEmotions: {
        toPricing: 'value_evaluation',
        toHero: 're_reading',
        toTestimonials: 'proof_seeking'
      }
    },
    
    // Features section
    features: {
      emotions: {
        'feature_scanning': { triggers: ['quick_scroll', 'no_hover'], confidence: 60 },
        'feature_evaluation': { triggers: ['hover_items', 'slow_read'], confidence: 75 },
        'comparison_mode': { triggers: ['back_forth_scroll', 'tab_switch'], confidence: 80 },
        'feature_fatigue': { triggers: ['accelerating_scroll', 'no_interaction'], confidence: 70 }
      },
      transitionEmotions: {
        toPricing: 'ready_to_evaluate_cost',
        toDemo: 'need_proof',
        toHero: 'context_seeking'
      }
    },
    
    // Testimonials / Social proof
    testimonials: {
      emotions: {
        'trust_building': { triggers: ['reading_pattern', 'slow_scroll'], confidence: 75 },
        'skepticism': { triggers: ['quick_skip', 'no_hover'], confidence: 65 },
        'validation': { triggers: ['multiple_reads', 'hover_quotes'], confidence: 80 },
        'social_proof_fatigue': { triggers: ['accelerating_scroll'], confidence: 60 }
      },
      transitionEmotions: {
        toPricing: 'trust_established',
        toDemo: 'verification_seeking',
        toContact: 'human_connection_desire'
      }
    },
    
    // Pricing section
    pricing: {
      emotions: {
        'price_evaluation': { triggers: ['hover_price', 'slow_read'], confidence: 85 },
        'sticker_shock': { triggers: ['mouse_recoil', 'quick_leave'], confidence: 90 },
        'value_comparison': { triggers: ['between_tiers', 'calculator_behavior'], confidence: 85 },
        'purchase_intent': { triggers: ['cta_hover', 'repeated_visit'], confidence: 90 },
        'budget_concern': { triggers: ['long_pause', 'scroll_away'], confidence: 75 },
        'tier_confusion': { triggers: ['excessive_comparison', 'no_selection'], confidence: 70 }
      },
      transitionEmotions: {
        toContact: 'negotiation_intent',
        toDemo: 'value_verification',
        toTestimonials: 'reassurance_seeking',
        toCompetitor: 'comparison_shopping' // Tab switch
      }
    },
    
    // Contact / CTA sections
    contact: {
      emotions: {
        'commitment_ready': { triggers: ['form_start', 'field_focus'], confidence: 85 },
        'last_minute_hesitation': { triggers: ['form_abandon', 'field_blur'], confidence: 80 },
        'trust_verification': { triggers: ['privacy_check', 'terms_read'], confidence: 70 },
        'submission_confidence': { triggers: ['form_complete', 'submit_click'], confidence: 95 }
      },
      transitionEmotions: {
        toPricing: 'final_price_check',
        toTestimonials: 'final_validation',
        away: 'abandonment'
      }
    },
    
    // Footer / Bottom of page
    footer: {
      emotions: {
        'completion': { triggers: ['reached_end', 'slow_arrival'], confidence: 70 },
        'information_seeking': { triggers: ['link_hover', 'policy_click'], confidence: 65 },
        'exit_intent': { triggers: ['quick_arrival', 'no_interaction'], confidence: 75 }
      },
      transitionEmotions: {
        toTop: 'second_evaluation',
        away: 'session_end'
      }
    }
  };

  // ==========================================
  // TRANSITION VELOCITY EMOTIONS
  // ==========================================
  
  const TRANSITION_EMOTIONS = {
    instant: { // < 500ms
      'scanning': 60,
      'impatience': 70,
      'task_focused': 75
    },
    quick: { // 500ms - 2s
      'exploring': 65,
      'searching': 70,
      'evaluating': 75
    },
    moderate: { // 2s - 5s
      'considering': 70,
      'reading': 75,
      'processing': 70
    },
    slow: { // > 5s
      'deep_engagement': 80,
      'careful_evaluation': 85,
      'hesitation': 65
    }
  };

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const state = {
    // Current position
    currentSection: null,
    previousSection: null,
    sectionHistory: [],
    sectionTimestamps: {},
    
    // Emotional state
    currentEmotion: null,
    emotionalJourney: [],
    sectionEmotions: {}, // Emotions per section
    
    // Behavioral tracking
    mousePosition: { x: 0, y: 0 },
    scrollPosition: 0,
    mouseVelocity: 0,
    scrollVelocity: 0,
    mousePresent: true,
    lastMouseSeen: Date.now(),
    
    // Interaction tracking
    interactions: {
      clicks: [],
      hovers: [],
      scrolls: [],
      focuses: []
    },
    
    // Timing
    sectionEntryTime: null,
    lastInteractionTime: Date.now(),
    idleTime: 0
  };

  // ==========================================
  // SECTION DETECTION
  // ==========================================
  
  function detectCurrentSection() {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const viewportCenter = scrollY + (viewportHeight / 2);
    
    // Try to find section by common selectors
    const sectionSelectors = [
      { selector: '#hero, .hero, [data-section="hero"]', name: 'hero' },
      { selector: '#demo, .demo, [data-section="demo"], #how-it-works', name: 'demo' },
      { selector: '#features, .features, [data-section="features"]', name: 'features' },
      { selector: '#testimonials, .testimonials, [data-section="testimonials"], .social-proof', name: 'testimonials' },
      { selector: '#pricing, .pricing, [data-section="pricing"]', name: 'pricing' },
      { selector: '#contact, .contact, form, [data-section="contact"]', name: 'contact' },
      { selector: 'footer, .footer', name: 'footer' }
    ];
    
    for (const { selector, name } of sectionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        const top = rect.top + scrollY;
        const bottom = top + rect.height;
        
        if (viewportCenter >= top && viewportCenter <= bottom) {
          return name;
        }
      }
    }
    
    // Fallback: detect by position
    const scrollPercentage = (scrollY / (document.body.scrollHeight - viewportHeight)) * 100;
    
    if (scrollPercentage < 15) return 'hero';
    if (scrollPercentage > 90) return 'footer';
    if (scrollPercentage > 70) return 'contact';
    if (scrollPercentage > 50) return 'pricing';
    if (scrollPercentage > 30) return 'features';
    
    return 'demo'; // Default middle section
  }

  // ==========================================
  // SECTION TRANSITION TRACKING
  // ==========================================
  
  function handleSectionChange(newSection) {
    if (newSection === state.currentSection) return;
    
    const now = Date.now();
    const timeInSection = state.sectionEntryTime ? now - state.sectionEntryTime : 0;
    
    // Record section transition
    if (state.currentSection) {
      // Calculate transition velocity
      const transitionSpeed = timeInSection < 500 ? 'instant' :
                            timeInSection < 2000 ? 'quick' :
                            timeInSection < 5000 ? 'moderate' : 'slow';
      
      // Get transition emotion
      const transitionEmotion = SECTION_EMOTIONS[state.currentSection]?.transitionEmotions?.[`to${capitalize(newSection)}`];
      
      if (transitionEmotion) {
        emitEmotion(transitionEmotion, {
          from: state.currentSection,
          to: newSection,
          speed: transitionSpeed,
          timeInSection: timeInSection
        });
      }
      
      // Also emit velocity-based emotion
      const velocityEmotions = TRANSITION_EMOTIONS[transitionSpeed];
      if (velocityEmotions) {
        const emotion = Object.keys(velocityEmotions)[0];
        const confidence = velocityEmotions[emotion];
        
        emitEmotion(emotion, {
          confidence: confidence,
          transition: `${state.currentSection}_to_${newSection}`,
          velocity: transitionSpeed
        });
      }
    }
    
    // Update state
    state.previousSection = state.currentSection;
    state.currentSection = newSection;
    state.sectionEntryTime = now;
    state.sectionHistory.push({
      section: newSection,
      timestamp: now,
      fromSection: state.previousSection
    });
    
    // Keep history limited
    if (state.sectionHistory.length > 20) {
      state.sectionHistory.shift();
    }
    
    if (config.debug) {
      console.log(`📍 Section: ${newSection} (from ${state.previousSection})`);
    }
  }

  // ==========================================
  // SECTION-SPECIFIC EMOTION DETECTION
  // ==========================================
  
  function detectSectionEmotions() {
    // Stop detection when tab is not visible
    if (document.hidden) return;
    
    if (!state.currentSection) return;
    
    const sectionConfig = SECTION_EMOTIONS[state.currentSection];
    if (!sectionConfig) return;
    
    const timeInSection = Date.now() - state.sectionEntryTime;
    const recentInteractions = getRecentInteractions(2000); // Last 2 seconds
    
    // Check each possible emotion for this section
    for (const [emotion, config] of Object.entries(sectionConfig.emotions)) {
      const triggers = config.triggers;
      let shouldTrigger = false;
      let matchedTrigger = null;
      
      for (const trigger of triggers) {
        switch(trigger) {
          case 'first_visit':
            shouldTrigger = state.sectionHistory.filter(h => h.section === state.currentSection).length === 1;
            break;
            
          case 'cta_hover':
            shouldTrigger = recentInteractions.hovers.some(h => 
              h.element.match(/button|cta|btn/i));
            break;
            
          case 'quick_scroll':
            shouldTrigger = state.scrollVelocity > 3 && timeInSection < 2000;
            break;
            
          case 'slow_read':
            shouldTrigger = state.scrollVelocity < 1 && state.scrollVelocity > 0.1 && timeInSection > 3000;
            break;
            
          case 'hover_price':
            // Only trigger on actual pricing elements, not just any text mentioning price
            shouldTrigger = recentInteractions.hovers.some(h => {
              const elem = h.element.toLowerCase();
              // Must be a button, card, or specific pricing element
              return (elem.includes('$') && (elem.includes('button') || elem.includes('card'))) ||
                     elem.match(/pricing-card|price-tier|plan-selector|checkout|subscribe/i);
            });
            break;
            
          case 'mouse_recoil':
            shouldTrigger = state.mouseVelocity > 5 && state.mouseDirection === 'away';
            break;
            
          case 'form_start':
            shouldTrigger = recentInteractions.focuses.length > 0;
            break;
            
          case 'multiple_interactions':
            shouldTrigger = recentInteractions.clicks.length >= 2 || 
                          recentInteractions.hovers.length >= 3;
            break;
            
          case 'tab_switch':
            shouldTrigger = document.hidden;
            break;
            
          case 'hesitation':
            shouldTrigger = state.idleTime > 2000 && state.idleTime < 5000;
            break;
            
          case 'no_interaction':
            shouldTrigger = recentInteractions.clicks.length === 0 && 
                          recentInteractions.hovers.length === 0;
            break;
        }
        
        if (shouldTrigger) {
          matchedTrigger = trigger;
          break;
        }
      }
      
      if (shouldTrigger) {
        // Check if we haven't emitted this emotion recently in this section
        const sectionEmotionKey = `${state.currentSection}_${emotion}`;
        const lastEmitted = state.sectionEmotions[sectionEmotionKey];
        
        if (!lastEmitted || (Date.now() - lastEmitted) > 5000) {
          emitEmotion(emotion, {
            confidence: config.confidence,
            section: state.currentSection,
            trigger: matchedTrigger,
            timeInSection: timeInSection
          });
          
          state.sectionEmotions[sectionEmotionKey] = Date.now();
        }
      }
    }
  }

  // ==========================================
  // BEHAVIORAL TRACKING
  // ==========================================
  
  function trackMouseBehavior(e) {
    const now = Date.now();
    state.lastMouseSeen = now;
    state.mousePresent = true;
    const timeDelta = now - state.lastInteractionTime;
    
    if (timeDelta > 0) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - state.mousePosition.x, 2) + 
        Math.pow(e.clientY - state.mousePosition.y, 2)
      );
      
      state.mouseVelocity = distance / timeDelta;
      
      // Detect direction
      if (e.clientY < state.mousePosition.y - 50) {
        state.mouseDirection = 'up';
      } else if (e.clientY > state.mousePosition.y + 50) {
        state.mouseDirection = 'down';
      } else if (Math.abs(e.clientX - state.mousePosition.x) > 50) {
        state.mouseDirection = 'lateral';
      }
      
      // Check for recoil
      if (state.mouseVelocity > 5 && state.mouseDirection === 'up') {
        state.mouseDirection = 'away'; // Recoil detected
      }
    }
    
    state.mousePosition = { x: e.clientX, y: e.clientY };
    state.lastInteractionTime = now;
    state.idleTime = 0;
  }
  
  function trackScrollBehavior() {
    const now = Date.now();
    const scrollY = window.scrollY;
    const scrollDelta = Math.abs(scrollY - state.scrollPosition);
    const timeDelta = now - state.lastScrollTime || 1;
    
    state.scrollVelocity = scrollDelta / timeDelta;
    state.scrollPosition = scrollY;
    state.lastScrollTime = now;
    
    // Record scroll
    state.interactions.scrolls.push({
      position: scrollY,
      velocity: state.scrollVelocity,
      timestamp: now
    });
    
    // Limit history
    if (state.interactions.scrolls.length > 50) {
      state.interactions.scrolls.shift();
    }
    
    // Check for section change
    const newSection = detectCurrentSection();
    handleSectionChange(newSection);
  }
  
  function trackInteraction(type, target) {
    const interaction = {
      type: type,
      element: target.tagName + (target.className ? '.' + target.className : ''),
      text: target.textContent?.substring(0, 30),
      timestamp: Date.now()
    };
    
    state.interactions[type + 's'].push(interaction);
    
    // Limit history
    if (state.interactions[type + 's'].length > 20) {
      state.interactions[type + 's'].shift();
    }
    
    state.lastInteractionTime = Date.now();
    state.idleTime = 0;
  }
  
  function getRecentInteractions(timeWindow) {
    const cutoff = Date.now() - timeWindow;
    
    return {
      clicks: state.interactions.clicks.filter(i => i.timestamp > cutoff),
      hovers: state.interactions.hovers.filter(i => i.timestamp > cutoff),
      scrolls: state.interactions.scrolls.filter(i => i.timestamp > cutoff),
      focuses: state.interactions.focuses.filter(i => i.timestamp > cutoff)
    };
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
      section: metadata.section || state.currentSection,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        timeOnPage: Date.now() - config.startTime,
        sectionHistory: state.sectionHistory.slice(-5),
        currentSection: state.currentSection
      }
    };
    
    // Update state
    state.currentEmotion = emotionType;
    state.emotionalJourney.push({
      emotion: emotionType,
      section: state.currentSection,
      timestamp: Date.now()
    });
    
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
      console.log(`🎯 [${state.currentSection}] ${emotionType} (${metadata.confidence || 75}%)`, metadata);
    }
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  
  document.addEventListener('mousemove', trackMouseBehavior);
  document.addEventListener('scroll', trackScrollBehavior);
  
  // Track mouse leaving viewport - disinterest → exit risk pattern
  document.addEventListener('mouseleave', function(e) {
    state.mousePresent = false;
    const timeSinceLastInteraction = Date.now() - state.lastInteractionTime;
    
    // Sudden disappearance = disinterest
    if (timeSinceLastInteraction < 3000) {
      emitEmotion('disinterest', {
        trigger: 'sudden_mouse_exit',
        confidence: 85,
        section: state.currentSection
      });
      
      // After disinterest, escalate to exit risk
      setTimeout(() => {
        if (!state.mousePresent) {
          emitEmotion('abandonment_risk', {
            trigger: 'mouse_disappeared',
            confidence: 90,
            section: state.currentSection
          });
        }
      }, 2000);
    }
  });
  
  // Track mouse returning
  document.addEventListener('mouseenter', function(e) {
    state.mousePresent = true;
    state.lastMouseSeen = Date.now();
  });
  
  document.addEventListener('click', function(e) {
    trackInteraction('click', e.target);
  });
  
  document.addEventListener('mouseover', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || 
        e.target.classList?.contains('btn') || e.target.classList?.contains('cta')) {
      trackInteraction('hover', e.target);
    }
  });
  
  document.addEventListener('focus', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      trackInteraction('focus', e.target);
    }
  }, true);
  
  // Visibility change
  document.addEventListener('visibilitychange', function() {
    if (document.hidden && state.currentSection === 'pricing') {
      // Tab switch from pricing = comparison shopping
      emitEmotion('comparison_shopping', {
        trigger: 'tab_switch',
        section: 'pricing',
        confidence: 90
      });
    }
  });
  
  // Track idle time
  setInterval(() => {
    state.idleTime = Date.now() - state.lastInteractionTime;
    
    if (state.idleTime > 30000 && state.currentSection) {
      emitEmotion('abandonment_risk', {
        section: state.currentSection,
        idleTime: state.idleTime,
        confidence: 80
      });
    }
  }, 5000);
  
  // Main detection loop
  setInterval(() => {
    if (!document.hidden) {
      detectSectionEmotions();
    }
  }, 1000);

  // ==========================================
  // INITIALIZATION
  // ==========================================
  
  setTimeout(() => {
    const initialSection = detectCurrentSection();
    handleSectionChange(initialSection);
    
    // Initial emotion based on entry
    if (document.referrer.includes('google') || document.referrer.includes('bing')) {
      emitEmotion('search_arrival', {
        section: initialSection,
        source: 'search',
        confidence: 80
      });
    } else if (document.referrer.includes(window.location.hostname)) {
      emitEmotion('navigation', {
        section: initialSection,
        source: 'internal',
        confidence: 70
      });
    } else {
      emitEmotion('direct_arrival', {
        section: initialSection,
        source: 'direct',
        confidence: 60
      });
    }
  }, 100);

  // ==========================================
  // PUBLIC API
  // ==========================================
  
  window.SentientIQ = {
    version: '4.0.0',
    
    getCurrentSection: () => state.currentSection,
    getEmotionalJourney: () => state.emotionalJourney,
    getSectionHistory: () => state.sectionHistory,
    
    debug: {
      getState: () => state,
      getSectionEmotions: () => SECTION_EMOTIONS,
      forceSection: (section) => handleSectionChange(section),
      testEmotion: (emotion) => emitEmotion(emotion, { source: 'manual_test' })
    }
  };

  if (config.debug) {
    console.log(`
╔══════════════════════════════════════════════════════╗
║    🎯 SENTIENTIQ v4.0 - SECTION-AWARE EMOTIONS      ║
║                                                      ║
║  Each section has its own emotional vocabulary       ║
║  Transitions tell their own story                   ║
║  Complete journey tracking, not fragments           ║
║                                                      ║
║  Sections: hero → demo → features → pricing         ║
╚══════════════════════════════════════════════════════╝
    `);
  }

})();