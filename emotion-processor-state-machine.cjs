/**
 * Holistic Telemetry & Emotion Processor
 *
 * Processes raw telemetry to detect both behavioral patterns and emotional states
 * Maps patterns to intervention triggers for real-time personalization
 *
 * Behavioral Patterns: scrolling, reading, exploring, comparing, hesitating, abandoning
 * Emotional States: curiosity, interest, confusion, frustration, price_shock, trust issues
 * Interventions: discount, trust badges, urgency, social proof, help, value, comparison, exit
 */

const { connect, JSONCodec, StringCodec } = require('nats');

const jc = JSONCodec();
const sc = StringCodec();

// Configuration
const config = {
  natsUrl: process.env.NATS_URL || 'localhost:4222',
  debug: process.env.DEBUG === 'true'
};

// Intervention mapping
const INTERVENTION_TRIGGERS = {
  discount_modal: ['price_shock', 'sticker_shock', 'price_hesitation'],
  trust_badges: ['skepticism', 'doubt', 'evaluation', 'trust_hesitation'],
  urgency_banner: ['cart_hesitation', 'cart_review', 'price_hesitation'],
  social_toast: ['evaluation', 'comparison_shopping', 'interest'],
  help_chat: ['confusion', 'frustration', 'lost', 'searching'],
  value_highlight: ['cart_hesitation', 'doubt', 'price_hesitation'],
  comparison_modal: ['comparison_shopping', 'evaluation', 'skepticism'],
  exit_intent: ['abandonment_intent', 'exit_risk', 'cart_abandonment'],
  welcome_guide: ['curiosity', 'first_visit', 'exploration']
};

/**
 * EMOTIONAL STATE DEFINITIONS
 * Each state has:
 * - entry: conditions that trigger this emotion
 * - transitions: natural progressions to other states
 * - disruptions: events that break the flow
 * - confidence: how strongly we believe this emotion
 * - decay: how fast the emotion fades
 */
const EMOTIONAL_STATES = {
  // ENTRY STATES
  curiosity: {
    entry: ['viewport_entry', 'first_movement', 'page_load'],
    transitions: {
      interest: ['scroll_down', 'click_content', 'hover_element', 'cta_proximity'],
      searching: ['fast_scroll', 'rapid_scanning'],
      confusion: ['circular_motion', 'erratic_movement'],
      evaluation: ['price_proximity', 'form_proximity']
    },
    disruptions: {
      price_shock: ['price_proximity_with_tremor'],
      exit_risk: ['rapid_exit_movement']
    },
    baseConfidence: 70,
    decay: 0.9 // Fades slowly
  },

  // ENGAGEMENT SPECTRUM
  interest: {
    entry: ['content_hover', 'scroll_slow', 'text_selection', 'cta_proximity'],
    transitions: {
      engagement: ['time_on_content', 'deep_scroll'],
      evaluation: ['click_cta', 'price_check', 'price_proximity'],
      skepticism: ['scroll_up_reread', 'hover_fine_print'],
      purchase_intent: ['cta_proximity', 'form_proximity']
    },
    disruptions: {
      confusion: ['rage_click', 'circular_motion'],
      price_shock: ['price_proximity_with_tremor'],
      abandonment_intent: ['rapid_exit_movement', 'mouse_exit']
    },
    baseConfidence: 60,
    decay: 0.85
  },

  engagement: {
    entry: ['deep_reading', 'content_interaction', 'video_play'],
    transitions: {
      deep_engagement: ['extended_time', 'multiple_sections'],
      trust_building: ['testimonial_read', 'about_page'],
      purchase_intent: ['pricing_click', 'cta_click']
    },
    disruptions: {
      skepticism: ['rapid_scroll_up', 'reread_section'],
      price_shock: ['price_reveal_with_tremor']
    },
    baseConfidence: 70,
    decay: 0.8
  },

  deep_engagement: {
    entry: ['extended_reading', 'multiple_interactions', 'form_start'],
    transitions: {
      purchase_intent: ['checkout_click', 'form_progress'],
      trust_building: ['security_badge_hover', 'guarantee_read']
    },
    disruptions: {
      doubt: ['form_abandonment', 'hesitation_pattern'],
      cart_hesitation: ['cart_page_freeze']
    },
    baseConfidence: 80,
    decay: 0.75
  },

  // SKEPTICISM SPECTRUM
  skepticism: {
    entry: ['reread_content', 'fine_print_hover', 'back_navigation'],
    transitions: {
      doubt: ['multiple_rereads', 'tab_switch'],
      evaluation: ['comparison_behavior', 'calculator_use'],
      trust_building: ['faq_read', 'support_click']
    },
    disruptions: {
      frustration: ['rage_click', 'rapid_movement'],
      abandonment_intent: ['exit_movement']
    },
    baseConfidence: 60,
    decay: 0.7
  },

  doubt: {
    entry: ['extended_hesitation', 'repeated_rereads', 'form_field_clear'],
    transitions: {
      deep_skepticism: ['continued_hesitation', 'price_recheck'],
      abandonment_intent: ['exit_signal', 'tab_away'],
      trust_hesitation: ['support_hover', 'guarantee_seek']
    },
    disruptions: {
      confidence: ['form_complete', 'decisive_click']
    },
    baseConfidence: 70,
    decay: 0.65
  },

  // PRICE REACTIONS
  price_shock: {
    entry: ['price_proximity_with_tremor', 'price_reveal_with_tremor', 'price_click_with_acceleration'],
    transitions: {
      sticker_shock: ['cursor_freeze', 'extended_hover'],
      price_hesitation: ['slow_retreat', 'comparison_start'],
      abandonment_intent: ['rapid_exit', 'tab_close', 'mouse_exit']
    },
    disruptions: {
      evaluation: ['calculator_click', 'roi_check'],
      interest: ['feature_comparison', 'plan_details']
    },
    baseConfidence: 90,
    decay: 0.5 // Intense but brief
  },

  sticker_shock: {
    entry: ['price_freeze', 'price_recoil', 'sudden_stop'],
    transitions: {
      price_hesitation: ['slow_movement', 'price_reread'],
      comparison_shopping: ['tab_switch', 'competitor_search'],
      cart_abandonment: ['cart_exit', 'checkout_leave']
    },
    disruptions: {
      value_realization: ['roi_calculator', 'savings_display']
    },
    baseConfidence: 85,
    decay: 0.6
  },

  price_hesitation: {
    entry: ['price_hover_extended', 'price_comparison', 'discount_seek'],
    transitions: {
      evaluation: ['feature_read', 'plan_comparison'],
      cart_hesitation: ['add_to_cart_slow', 'checkout_pause'],
      skepticism: ['guarantee_check', 'refund_policy']
    },
    disruptions: {
      confidence: ['discount_apply', 'trial_start']
    },
    baseConfidence: 65,
    decay: 0.7
  },

  // DECISION STATES
  evaluation: {
    entry: ['comparison_mode', 'feature_analysis', 'pricing_study'],
    transitions: {
      purchase_intent: ['plan_select', 'checkout_start'],
      comparison_shopping: ['tab_switch', 'competitor_check'],
      trust_building: ['review_read', 'case_study']
    },
    disruptions: {
      confusion: ['too_many_options', 'unclear_pricing'],
      price_shock: ['total_calculation', 'hidden_fees']
    },
    baseConfidence: 60,
    decay: 0.75
  },

  comparison_shopping: {
    entry: ['multiple_tabs', 'price_checking', 'feature_matrix'],
    transitions: {
      evaluation: ['return_focus', 'decision_mode'],
      abandonment_intent: ['comparison_fatigue', 'tab_explosion'],
      purchase_intent: ['clear_winner', 'decision_made']
    },
    disruptions: {
      confusion: ['information_overload', 'conflicting_data']
    },
    baseConfidence: 70,
    decay: 0.65
  },

  // TRUST SPECTRUM
  trust_building: {
    entry: ['testimonial_read', 'security_check', 'guarantee_view'],
    transitions: {
      confidence: ['multiple_trust_signals', 'social_proof'],
      purchase_intent: ['trial_click', 'buy_click']
    },
    disruptions: {
      trust_hesitation: ['suspicious_claim', 'missing_info'],
      skepticism: ['fine_print_concern', 'negative_review']
    },
    baseConfidence: 65,
    decay: 0.8
  },

  trust_hesitation: {
    entry: ['security_concern', 'privacy_check', 'terms_read'],
    transitions: {
      doubt: ['continued_concern', 'red_flag'],
      trust_building: ['assurance_found', 'support_contact'],
      abandonment_intent: ['trust_break', 'concern_unresolved']
    },
    disruptions: {
      confidence: ['guarantee_strong', 'testimonial_powerful']
    },
    baseConfidence: 60,
    decay: 0.7
  },

  // CONFUSION/FRUSTRATION
  confusion: {
    entry: ['circular_motion', 'repeated_clicking', 'lost_pattern'],
    transitions: {
      frustration: ['continued_confusion', 'rage_click'],
      searching: ['help_seek', 'navigation_attempt'],
      exit_risk: ['give_up_signal', 'rapid_exit_prep']
    },
    disruptions: {
      clarity: ['solution_found', 'help_received'],
      interest: ['discovery_made', 'aha_moment']
    },
    baseConfidence: 70,
    decay: 0.6
  },

  frustration: {
    entry: ['rage_click', 'erratic_fast_movement', 'form_struggle'],
    transitions: {
      abandonment_intent: ['exit_preparation', 'cursor_to_close'],
      anger: ['continued_rage', 'violent_movement']
    },
    disruptions: {
      relief: ['problem_solved', 'workaround_found'],
      support: ['chat_opened', 'help_clicked']
    },
    baseConfidence: 80,
    decay: 0.5
  },

  // SEARCH/EXPLORE
  searching: {
    entry: ['scan_pattern', 'quick_scroll', 'menu_exploration'],
    transitions: {
      interest: ['target_found', 'content_match'],
      confusion: ['nothing_found', 'continued_search'],
      frustration: ['search_fatigue', 'repeated_failure']
    },
    disruptions: {
      success: ['found_target', 'goal_achieved']
    },
    baseConfidence: 60,
    decay: 0.7
  },

  lost: {
    entry: ['aimless_movement', 'page_bouncing', 'navigation_confusion'],
    transitions: {
      searching: ['purposeful_scan', 'menu_click'],
      frustration: ['continued_lost', 'help_not_found'],
      exit_risk: ['give_up', 'timeout']
    },
    disruptions: {
      found: ['navigation_success', 'breadcrumb_use']
    },
    baseConfidence: 65,
    decay: 0.6
  },

  // PURCHASE JOURNEY
  confidence: {
    entry: ['form_progress', 'decisive_clicks', 'smooth_flow'],
    transitions: {
      purchase_intent: ['checkout_progress', 'payment_start'],
      excitement: ['feature_anticipation', 'value_realization']
    },
    disruptions: {
      cart_hesitation: ['price_second_thought', 'form_pause'],
      doubt: ['unexpected_field', 'privacy_concern']
    },
    baseConfidence: 75,
    decay: 0.8
  },

  purchase_intent: {
    entry: ['checkout_start', 'payment_info', 'final_review'],
    transitions: {
      excitement: ['purchase_complete', 'confirmation_view'],
      commitment: ['final_click', 'submit_ready']
    },
    disruptions: {
      cart_hesitation: ['last_second_pause', 'total_shock'],
      cart_abandonment: ['close_checkout', 'back_button']
    },
    baseConfidence: 85,
    decay: 0.7
  },

  excitement: {
    entry: ['fast_positive_movement', 'quick_completion', 'enthusiastic_interaction'],
    transitions: {
      delight: ['success_achieved', 'goal_complete'],
      satisfaction: ['smooth_experience', 'expectation_met']
    },
    disruptions: {
      disappointment: ['error_encountered', 'expectation_mismatch']
    },
    baseConfidence: 80,
    decay: 0.6
  },

  // CART/CHECKOUT
  cart_hesitation: {
    entry: ['checkout_pause', 'price_review', 'shipping_shock'],
    transitions: {
      cart_review: ['detail_check', 'coupon_seek'],
      cart_abandonment: ['exit_signal', 'tab_leave'],
      purchase_intent: ['decision_made', 'continue_click']
    },
    disruptions: {
      urgency: ['stock_warning', 'timer_pressure'],
      incentive: ['discount_offered', 'free_shipping']
    },
    baseConfidence: 70,
    decay: 0.6
  },

  cart_abandonment: {
    entry: ['checkout_exit', 'cart_leave', 'payment_cancel'],
    transitions: {
      abandonment_intent: ['site_leave', 'session_end'],
      return_consideration: ['email_check', 'later_return']
    },
    disruptions: {
      recovery: ['email_capture', 'exit_intent_caught'],
      incentive: ['discount_popup', 'abandonment_offer']
    },
    baseConfidence: 85,
    decay: 0.4
  },

  // EXIT STATES
  abandonment_intent: {
    entry: ['cursor_to_exit', 'rapid_upward', 'tab_prep', 'mouse_exit', 'viewport_approach'],
    transitions: {
      exit_risk: ['continued_exit', 'url_bar_hover'],
      recovery: ['pause_detected', 'return_to_content']
    },
    disruptions: {
      retention: ['popup_engage', 'offer_presented'],
      curiosity: ['new_content', 'notification']
    },
    baseConfidence: 80,
    decay: 0.3 // Urgent but brief
  },

  exit_risk: {
    entry: ['at_browser_edge', 'tab_switch_prep', 'back_button_hover'],
    transitions: {
      gone: ['tab_closed', 'navigation_away']
    },
    disruptions: {
      retention: ['last_chance_engage', 'powerful_offer']
    },
    baseConfidence: 90,
    decay: 0.2 // Very brief window
  }
};

// Session state tracking
const sessions = new Map();

class SessionState {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.currentState = 'curiosity'; // Everyone starts curious
    this.stateConfidence = 70;
    this.stateHistory = [{
      state: 'curiosity',
      confidence: 70,
      timestamp: Date.now(),
      trigger: 'session_start'
    }];
    this.eventBuffer = [];
    this.lastTransition = Date.now();
    this.context = {
      timeOnSite: 0,
      currentUrl: null,
      scrollDepth: 0,
      mouseVelocity: 0,
      mouseAcceleration: 0,
      lastElement: null,
      priceExposed: false,
      formEngaged: false,
      cartActive: false
    };
  }

  addEvent(event) {
    this.eventBuffer.push(event);
    // Keep last 20 events
    if (this.eventBuffer.length > 20) {
      this.eventBuffer.shift();
    }

    // Update context
    this.updateContext(event);

    // Check for state transition
    const newState = this.checkStateTransition(event);
    if (newState && newState !== this.currentState) {
      this.transitionTo(newState, event);
      return true; // State changed
    } else {
      // Apply confidence decay
      this.decayConfidence();
      // Boost confidence slightly on reinforcing events
      if (this.matchesCurrentState(event)) {
        this.stateConfidence = Math.min(100, this.stateConfidence + 5);
      }
      return false; // State maintained
    }
  }

  matchesCurrentState(event) {
    // Check if event reinforces current state
    const stateConfig = EMOTIONAL_STATES[this.currentState];
    if (!stateConfig) return false;

    // Check if event matches any transition trigger (reinforces current state)
    for (const triggers of Object.values(stateConfig.transitions || {})) {
      if (this.matchesTrigger(event, triggers)) {
        return true;
      }
    }
    return false;
  }

  updateContext(event) {
    // Update time on site
    if (!this.context.sessionStart) {
      this.context.sessionStart = Date.now();
    }
    this.context.timeOnSite = Date.now() - this.context.sessionStart;
    this.context.timeOnPage = this.context.timeOnSite; // Alias for compatibility

    // Update URL
    if (event.url) {
      this.context.currentUrl = event.url;
    }

    // Update scroll depth and patterns
    if (event.type === 'scroll') {
      if (event.data?.scrollPercentage) {
        this.context.scrollDepth = Math.max(this.context.scrollDepth, event.data.scrollPercentage);
      }
      this.context.lastScrollTime = Date.now();
      this.context.scrollCount = (this.context.scrollCount || 0) + 1;
    }

    // Update mouse dynamics
    if (event.type === 'mouse_movement' || event.type === 'mouse') {
      this.context.mouseVelocity = event.data?.velocity || 0;
      this.context.mouseAcceleration = event.data?.acceleration || 0;
      this.context.lastMouseMove = Date.now();
    }

    // CRITICAL: Track ALL proximity events
    if (event.type === 'price_proximity') {
      this.context.priceExposed = true;
      this.context.priceInteractionTime = Date.now();
      this.context.nearPrice = true;
    }

    if (event.type === 'cta_proximity') {
      this.context.nearCTA = true;
      this.context.ctaInteractionTime = Date.now();
    }

    if (event.type === 'nav_proximity') {
      this.context.nearNav = true;
    }

    if (event.type === 'form_proximity') {
      this.context.nearForm = true;
      this.context.formProximityTime = Date.now();
    }

    // Track exit signals
    if (event.type === 'mouse_exit' || event.type === 'viewport_approach') {
      this.context.exitSignal = true;
      this.context.exitSignalTime = Date.now();
    }

    // Track behavioral patterns
    if (event.type === 'rage_click') {
      this.context.rageClickCount = (this.context.rageClickCount || 0) + 1;
      this.context.lastRageClick = Date.now();
    }

    if (event.type === 'circular_motion') {
      this.context.circularMotionCount = (this.context.circularMotionCount || 0) + 1;
      this.context.lastCircularMotion = Date.now();
    }

    // Track hover events for intent
    if (event.type === 'element_hover') {
      this.context.lastHover = event.data?.element;
      this.context.lastHoverDuration = event.data?.duration || 0;
    }

    // Track form engagement
    if (event.type === 'field_interaction' || event.type === 'form_focus') {
      this.context.formEngaged = true;
    }

    // Track cart/checkout
    if (event.url?.includes('cart') || event.url?.includes('checkout')) {
      this.context.cartActive = true;
    }

    // Track element interactions
    if (event.data?.element) {
      this.context.lastElement = event.data?.element;
    }
  }

  checkStateTransition(event) {
    const currentStateConfig = EMOTIONAL_STATES[this.currentState];
    if (!currentStateConfig) return null;

    // Check disruptions first (high priority)
    for (const [targetState, triggers] of Object.entries(currentStateConfig.disruptions || {})) {
      if (this.matchesTrigger(event, triggers)) {
        if (config.debug) {
          console.log(`🔄 Disruption: ${this.currentState} → ${targetState} (${event.type})`);
        }
        return targetState;
      }
    }

    // Check natural transitions
    for (const [targetState, triggers] of Object.entries(currentStateConfig.transitions || {})) {
      if (this.matchesTrigger(event, triggers)) {
        if (config.debug) {
          console.log(`🔄 Transition: ${this.currentState} → ${targetState} (${event.type})`);
        }
        return targetState;
      }
    }

    // Check if any state's entry conditions are strongly met
    for (const [stateName, stateConfig] of Object.entries(EMOTIONAL_STATES)) {
      if (stateName !== this.currentState &&
          this.matchesTrigger(event, stateConfig.entry)) {
        // Only jump to non-adjacent states if confidence is high
        if (this.getEventStrength(event) > 80) {
          return stateName;
        }
      }
    }

    return null;
  }

  matchesTrigger(event, triggers) {
    for (const trigger of triggers) {
      switch(trigger) {
        // Entry triggers
        case 'viewport_entry':
          return event.type === 'connection' && this.context.timeOnSite < 1000;
        case 'first_movement':
          return event.type === 'mouse_movement' && this.eventBuffer.length < 3;
        case 'page_load':
          return event.type === 'pageview' && this.context.timeOnSite < 2000;

        // Scroll triggers - POSITIVE patterns for engagement
        case 'scroll_down':
          return event.type === 'scroll' && event.data?.direction === 'down' &&
                 !this.hasRecentNegativePattern();
        case 'deep_scroll':
          return event.type === 'scroll' && this.context.scrollDepth > 50;
        case 'fast_scroll':
          return event.type === 'scroll' && event.data?.scrollSpeed > 50;
        case 'slow_scroll':
          return event.type === 'scroll' && event.data?.scrollSpeed < 10;
        case 'steady_scrolling':
          return event.type === 'scroll' &&
                 this.getScrollPattern() === 'steady' &&
                 this.context.timeOnSite > 5000;

        // Price triggers - Detect price sensitivity patterns
        case 'price_proximity_with_tremor':
          return event.type === 'price_proximity' &&
                 (this.context.mouseAcceleration > 500 || // Moderate threshold
                  this.context.mouseVelocity > 400); // Fast movement near price
        case 'price_reveal_with_tremor':
          return this.context.priceExposed &&
                 event.type === 'tremor' &&
                 (Date.now() - this.context.priceInteractionTime) < 2000; // Recent price interaction
        case 'price_click_with_acceleration':
          return event.type === 'click' &&
                 event.data?.element?.includes('price') && // Actual price element
                 this.context.mouseAcceleration > 600; // Higher threshold
        case 'price_hover_extended':
          return event.type === 'element_hover' &&
                 event.data?.element?.includes('price') &&
                 event.data?.duration > 1500; // Dwelling on price

        // Movement triggers - HIGHER thresholds for negative patterns
        case 'circular_motion':
          return event.type === 'circular_motion'; // Simplified - let it trigger confusion
        case 'erratic_movement':
          return event.type === 'direction_changes' &&
                 event.data?.count > 7; // Higher threshold
        case 'rage_click':
          return event.type === 'rage_click' &&
                 event.data?.count >= 3; // At least 3 rapid clicks
        case 'rapid_exit_movement':
          return event.type === 'mouse_movement' &&
                 event.data?.y < 50 && // Closer to edge
                 event.data?.velocity > 1000; // Much faster

        // Proximity triggers for intent detection
        case 'cta_proximity':
          return event.type === 'cta_proximity';
        case 'price_proximity':
          return event.type === 'price_proximity';
        case 'form_proximity':
          return event.type === 'form_proximity';
        case 'nav_proximity':
          return event.type === 'nav_proximity';

        // Content triggers - POSITIVE engagement patterns
        case 'content_hover':
          return event.type === 'element_hover' &&
                 event.data?.duration > 500 &&
                 !event.data?.element?.includes('price'); // Not price hovering
        case 'text_selection':
          return event.type === 'text_selection';
        case 'deep_reading':
          return this.context.scrollDepth > 30 &&
                 this.context.timeOnSite > 15000 &&
                 this.getScrollPattern() === 'steady';
        case 'extended_reading':
          return this.context.scrollDepth > 60 &&
                 this.context.timeOnSite > 30000;
        case 'content_interaction':
          return event.type === 'click' &&
                 !event.data?.element?.includes('price') &&
                 this.context.timeOnSite > 3000;
        case 'multiple_interactions':
          return this.getInteractionCount() > 3 &&
                 this.context.timeOnSite > 10000;

        // Re-read triggers
        case 'scroll_up_reread':
          return event.type === 'scroll' &&
                 event.data?.direction === 'up' &&
                 this.context.scrollDepth > 40;
        case 'reread_content':
          return event.type === 'scroll' &&
                 event.data?.direction === 'up' &&
                 event.data?.toSection &&
                 this.hasVisitedSection(event.data.toSection);

        // Form/checkout triggers
        case 'form_start':
          return event.type === 'field_interaction' && !this.context.formEngaged;
        case 'form_progress':
          return event.type === 'field_interaction' &&
                 event.data?.fieldsComplete > 2;
        case 'checkout_start':
          return event.url?.includes('checkout');
        case 'checkout_pause':
          return this.context.cartActive && event.type === 'idle';

        // Exit triggers - Critical for exit intent detection
        case 'cursor_to_exit':
          return event.type === 'viewport_approach' || event.type === 'mouse_exit';
        case 'rapid_upward':
          return (event.type === 'mouse_movement' || event.type === 'mouse') &&
                 event.data?.velocity > 400 && // Lower threshold for better detection
                 event.data?.direction === 'up';
        case 'mouse_exit':
          return event.type === 'mouse_exit';
        case 'viewport_approach':
          return event.type === 'viewport_approach';
        case 'exit_signal':
          return event.type === 'tab_switch' || event.type === 'visibility_hidden';

        // Tab/comparison triggers
        case 'tab_switch':
          return event.type === 'tab_switch';
        case 'multiple_tabs':
          return event.type === 'tab_count' && event.data?.count > 3;

        // Confidence triggers
        case 'decisive_clicks':
          return event.type === 'click' &&
                 this.getClickPattern() === 'confident';
        case 'hesitation_pattern':
          return this.getMovementPattern() === 'hesitant';

        default:
          // Check if event type matches trigger directly
          return event.type === trigger;
      }
    }
    return false;
  }

  getEventStrength(event) {
    // Calculate how strongly this event indicates a state change
    let strength = 60; // Base strength

    // Strong NEGATIVE signals (require more evidence)
    if (event.type === 'rage_click' && event.data?.count >= 3) strength += 30;
    if (event.type === 'price_proximity' &&
        event.data?.element?.includes('price') &&
        this.context.mouseAcceleration > 700) strength += 25;
    if (event.type === 'viewport_approach' && event.data?.velocity > 1000) strength += 20;
    if (event.type === 'form_abandonment') strength += 20;

    // Strong POSITIVE signals
    if (event.type === 'checkout_start') strength += 25;
    if (event.type === 'scroll' && this.context.scrollDepth > 50) strength += 15;
    if (event.type === 'text_selection') strength += 15;
    if (event.type === 'element_hover' && event.data?.duration > 2000) strength += 20;

    // Context modifiers
    if (this.context.timeOnSite < 5000) strength -= 20; // Too early, much less confident
    if (this.eventBuffer.length < 5) strength -= 15; // Not enough data

    // Boost positive patterns
    if (this.getScrollPattern() === 'steady') strength += 10;
    if (this.getInteractionCount() > 3) strength += 10;

    return Math.min(100, Math.max(0, strength));
  }

  transitionTo(newState, triggerEvent) {
    const stateConfig = EMOTIONAL_STATES[newState];
    if (!stateConfig) return;

    // Calculate transition confidence
    const eventStrength = this.getEventStrength(triggerEvent);
    const baseConfidence = stateConfig.baseConfidence || 70;
    const confidence = Math.round((eventStrength + baseConfidence) / 2);

    // Record transition
    this.stateHistory.push({
      state: newState,
      confidence,
      timestamp: Date.now(),
      trigger: triggerEvent.type,
      fromState: this.currentState
    });

    // Keep history limited
    if (this.stateHistory.length > 20) {
      this.stateHistory.shift();
    }

    // Update current state
    this.currentState = newState;
    this.stateConfidence = confidence;
    this.lastTransition = Date.now();

    if (config.debug) {
      console.log(`🎭 ${this.sessionId}: ${this.currentState} (${confidence}%) via ${triggerEvent.type}`);
    }
  }

  decayConfidence() {
    const stateConfig = EMOTIONAL_STATES[this.currentState];
    if (!stateConfig) return;

    const timeSinceTransition = Date.now() - this.lastTransition;
    const decayFactor = stateConfig.decay || 0.9;

    // Apply decay every 5 seconds
    if (timeSinceTransition > 5000) {
      this.stateConfidence = Math.round(this.stateConfidence * decayFactor);

      // If confidence drops too low, transition to a neutral state
      if (this.stateConfidence < 30) {
        this.transitionTo('curiosity', { type: 'confidence_decay' });
      }
    }
  }

  hasVisitedSection(section) {
    // Check if we've been to this section before
    return this.eventBuffer.some(e =>
      e.type === 'scroll' && e.data?.section === section
    );
  }

  hasRecentNegativePattern() {
    // Check for recent negative patterns to avoid false positives
    const recentEvents = this.eventBuffer.slice(-5);
    return recentEvents.some(e =>
      e.type === 'rage_click' ||
      e.type === 'circular_motion' ||
      (e.type === 'direction_changes' && e.data?.count > 5)
    );
  }

  getScrollPattern() {
    const scrollEvents = this.eventBuffer
      .filter(e => e.type === 'scroll')
      .slice(-5);

    if (scrollEvents.length < 3) return 'unknown';

    // Check for steady scrolling (positive engagement)
    const directions = scrollEvents.map(e => e.data?.direction);
    const speeds = scrollEvents.map(e => e.data?.scrollSpeed || 20);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

    // Mostly downward, moderate speed = steady reading
    if (directions.filter(d => d === 'down').length >= 3 &&
        avgSpeed > 5 && avgSpeed < 50) {
      return 'steady';
    }

    // Fast scrolling = scanning
    if (avgSpeed > 50) return 'scanning';

    // Mixed directions = exploring
    if (new Set(directions).size > 1) return 'exploring';

    return 'normal';
  }

  getInteractionCount() {
    // Count meaningful interactions (clicks, hovers, selections)
    return this.eventBuffer.filter(e =>
      e.type === 'click' ||
      e.type === 'element_hover' ||
      e.type === 'text_selection' ||
      e.type === 'field_interaction'
    ).length;
  }

  getMovementPattern() {
    const recentMovements = this.eventBuffer
      .filter(e => e.type === 'mouse_movement')
      .slice(-5);

    if (recentMovements.length < 3) return 'unknown';

    const avgVelocity = recentMovements.reduce((sum, e) =>
      sum + (e.data?.velocity || 0), 0) / recentMovements.length;

    if (avgVelocity < 200) return 'hesitant';
    if (avgVelocity > 600) return 'rushed';
    return 'normal';
  }

  getClickPattern() {
    const recentClicks = this.eventBuffer
      .filter(e => e.type === 'click')
      .slice(-3);

    if (recentClicks.length < 2) return 'unknown';

    const timeDiffs = [];
    for (let i = 1; i < recentClicks.length; i++) {
      timeDiffs.push(recentClicks[i].timestamp - recentClicks[i-1].timestamp);
    }

    const avgTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;

    if (avgTime < 1000) return 'rapid';
    if (avgTime > 5000) return 'hesitant';
    return 'confident';
  }

  getCurrentEmotion() {
    return {
      emotion: this.currentState,
      confidence: this.stateConfidence,
      context: {
        timeOnSite: this.context.timeOnSite,
        scrollDepth: this.context.scrollDepth,
        priceExposed: this.context.priceExposed,
        formEngaged: this.context.formEngaged,
        cartActive: this.context.cartActive
      },
      journey: this.stateHistory.slice(-5).map(h => ({
        state: h.state,
        confidence: h.confidence,
        trigger: h.trigger
      }))
    };
  }
}

// Connect to NATS and process events
async function startProcessor() {
  console.log('🎭 Emotional State Machine starting...');
  console.log('📖 Ready to narrate behavioral stories...');

  const nc = await connect({ servers: config.natsUrl });
  console.log(`✅ Connected to NATS at ${config.natsUrl}`);

  // Subscribe to telemetry events
  const sub = nc.subscribe('TELEMETRY.events');

  console.log('📡 Listening for behavioral patterns...');

  // Process events
  for await (const msg of sub) {
    try {
      const rawData = jc.decode(msg.data);

      // Handle both single events and event batches
      const events = rawData.events || [rawData];

      for (const event of events) {
        const { sessionId, tenantId } = event;

        if (!sessionId) continue;

        // Get or create session
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, new SessionState(sessionId));
          if (config.debug) {
            console.log(`🆕 New visitor: ${sessionId} → Starting with CURIOSITY`);
          }
        }

        const session = sessions.get(sessionId);

        // Debug log important events
        if (config.debug) {
          const importantEvents = ['scroll', 'rage_click', 'circular_motion', 'viewport_approach',
                                  'price_proximity', 'cta_proximity', 'mouse_exit', 'nav_proximity'];
          if (importantEvents.includes(event.type)) {
            console.log(`📊 Event: ${event.type} for ${sessionId.slice(-6)}`);
          }
        }

        // Process event through state machine
        session.addEvent(event);

        // Get current emotion and behavioral state
        const emotionalState = session.getCurrentEmotion();

        // Determine recommended interventions
        const recommendedInterventions = [];
        for (const [intervention, triggers] of Object.entries(INTERVENTION_TRIGGERS)) {
          if (triggers.includes(emotionalState.emotion)) {
            recommendedInterventions.push(intervention);
          }
        }

        // Publish comprehensive state event
        const emotionEvent = {
          sessionId,
          tenantId,
          emotion: emotionalState.emotion,
          confidence: emotionalState.confidence,
          journey: emotionalState.journey,
          context: emotionalState.context,
          behavioral: {
            scrolling: session.context.scrollCount > 2,
            reading: session.context.scrollDepth > 30 && session.context.timeOnSite > 15000,
            exploring: session.context.nearCTA || session.context.nearNav,
            evaluating: session.context.nearPrice && session.context.timeOnSite > 5000,
            hesitating: session.context.mouseVelocity < 100 && session.context.nearPrice,
            abandoning: session.context.exitSignal
          },
          interventions: recommendedInterventions,
          timestamp: new Date().toISOString()
        };

        await nc.publish('EMOTIONS.state', jc.encode(emotionEvent));

        if (config.debug && session.lastTransition === Date.now()) {
          console.log(`📍 ${sessionId}: ${emotionalState.emotion} (${emotionalState.confidence}%)`);
        }
      }

    } catch (error) {
      console.error('❌ Processing error:', error);
    }
  }
}

// Cleanup old sessions periodically
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastTransition > timeout) {
      sessions.delete(sessionId);
      if (config.debug) {
        console.log(`🗑️ Cleaned up inactive session: ${sessionId}`);
      }
    }
  }
}, 60000); // Check every minute

// Start the processor
startProcessor().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down emotional state machine...');
  process.exit(0);
});