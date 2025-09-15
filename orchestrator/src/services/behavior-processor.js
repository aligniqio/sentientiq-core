/**
 * Behavior Processor
 * Converts raw telemetry behaviors into emotional diagnoses
 * The "medical degree" that the script doesn't have
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export class BehaviorProcessor {
  constructor(websocketServer = null) {
    // Session buffers for context
    this.sessions = new Map();

    // WebSocket server for sending interventions
    this.wsServer = websocketServer;

    // PATTERN LEARNING - The predictive engine
    this.patternMemory = {
      // Success patterns: what led to conversion
      conversionPaths: new Map(),
      // Failure patterns: what led to abandonment
      abandonmentPaths: new Map(),
      // Intervention effectiveness by pattern
      interventionSuccess: new Map(),
      // Emotional volatility by context
      volatilityIndex: {
        global: 0,
        byVertical: new Map(),
        byGeo: new Map(),
        byTimeOfDay: new Map(),
        byDayOfWeek: new Map()
      }
    };

    // Start volatility calculation interval
    this.startVolatilityTracking();

    // Behavior → Emotion mappings (the diagnosis logic)
    this.behaviorMap = {
      rage_click: { emotion: 'frustration', confidence: 90 },
      double_click: { emotion: 'interest', confidence: 50 },

      click: (event) => {
        // Context-aware click diagnosis
        const target = (event.target || '').toLowerCase();

        // Pricing-related clicks = strong purchase intent
        const isPricingClick = target.includes('price') ||
                               target.includes('pricing') ||
                               target.includes('cost') ||
                               target.includes('plan') ||
                               target.includes('buy') ||
                               target.includes('purchase') ||
                               event.ctx?.pricing;

        if (isPricingClick) {
          return { emotion: 'strong_purchase_intent', confidence: 95 };
        }

        // Demo interaction = EXCITEMENT!
        if (event.ctx?.demo || target.includes('demo') || target.includes('try') || target.includes('preview')) {
          return { emotion: 'demo_activation', confidence: 98 };
        }

        // Cart/checkout clicks
        if (event.ctx?.cart || target.includes('cart') || target.includes('checkout')) {
          return { emotion: 'checkout_intent', confidence: 90 };
        }

        // CTA button clicks
        if (event.ctx?.cta || target.includes('button') || target.includes('btn')) {
          return { emotion: 'action_intent', confidence: 75 };
        }

        // Default engagement
        return { emotion: 'engaged', confidence: 40 };
      },

      hover: (event) => {
        // Context-aware diagnosis
        if (event.ctx?.cart) {
          // Hovering in cart/checkout area
          return event.duration > 3000
            ? { emotion: 'cart_hesitation', confidence: 90 }
            : { emotion: 'cart_review', confidence: 70 };
        }

        const target = (event.target || '').toLowerCase();

        // Demo element detection - intrigue building!
        const isDemoElement = event.ctx?.demo ||
                             target.includes('demo') ||
                             target.includes('try') ||
                             target.includes('preview') ||
                             target.includes('example');

        if (isDemoElement) {
          if (event.duration < 500) {
            return { emotion: 'curiosity', confidence: 70 };
          } else if (event.duration < 1500) {
            return { emotion: 'intrigue', confidence: 85 };
          } else if (event.duration < 3000) {
            return { emotion: 'demo_interest', confidence: 90 };
          } else {
            return { emotion: 'demo_consideration', confidence: 95 };
          }
        }

        // Enhanced price element detection
        const isPriceElement = event.ctx?.pricing ||
                              target.includes('price') ||
                              target.includes('cost') ||
                              target.includes('$') ||
                              target.includes('total') ||
                              target.includes('tier') ||
                              target.includes('plan') ||
                              target.includes('subscription');

        if (isPriceElement) {
          // Nuanced price hovering emotions - purchase intent focus
          if (event.duration < 500) {
            return { emotion: 'price_glance', confidence: 60 };
          } else if (event.duration < 1200) {
            return { emotion: 'price_scan', confidence: 70 };
          } else if (event.duration < 2500) {
            return { emotion: 'purchase_intent', confidence: 85 }; // Strong intent in this range
          } else if (event.duration < 4000) {
            return { emotion: 'price_consideration', confidence: 88 };
          } else if (event.duration < 6000) {
            return { emotion: 'price_hesitation', confidence: 90 };
          } else {
            return { emotion: 'price_paralysis', confidence: 93 };
          }
        }

        if (event.ctx?.cta) {
          return { emotion: 'interest', confidence: 70 };
        }

        // Long hover in empty space = idle/distracted
        if (event.duration > 5000) {
          return { emotion: 'idle', confidence: 75 };
        }
        if (event.duration > 2000) {
          return { emotion: 'distracted', confidence: 65 };
        }

        // Short hover might be reading if over text
        return { emotion: 'reading', confidence: 40 };
      },

      sudden_stop: (event) => {
        // Extreme deceleration after fast movement
        if (event.ctx?.cart) {
          // Sudden stop in cart = moment of truth
          return { emotion: 'cart_shock', confidence: 90 };
        }

        // Check if element or context indicates pricing
        const target = (event.target || '').toLowerCase();
        const isPricingContext = event.ctx?.pricing ||
                                event.after_pricing ||
                                target.includes('price') ||
                                target.includes('$') ||
                                target.includes('tier') ||
                                target.includes('plan');

        if (isPricingContext) {
          // THE MONEY SHOT: Sudden stop when seeing prices
          return { emotion: 'sticker_shock', confidence: 92 };
        }
        return { emotion: 'surprise', confidence: 70 };
      },

      erratic_movement: (event) => {
        // Erratic behavior over pricing = internal conflict
        if (event.ctx?.pricing) {
          // Multiple rapid direction changes over pricing
          if (event.changes >= 5) {
            return { emotion: 'price_panic', confidence: 95 };
          }
          if (event.changes >= 3) {
            return { emotion: 'sticker_shock', confidence: 90 };
          }
          return { emotion: 'price_confusion', confidence: 80 };
        }
        // Non-pricing erratic movement = general confusion
        return { emotion: 'confusion', confidence: 70 };
      },

      scroll: (event) => {
        const speed = Math.abs(event.v);

        // Pricing-specific ONLY when hovering or oscillating near pricing
        if (event.ctx?.pricing && (event.ctx?.hovering_pricing || event.ctx?.oscillating)) {
          // Auto-scroll to pricing = just clicked pricing link
          if (event.ctx?.auto_scroll) {
            return { emotion: 'arriving_at_pricing', confidence: 88 };
          }
          // Oscillating over YOUR pricing = comparing YOUR tiers
          if (event.ctx?.oscillating) {
            return { emotion: 'tier_comparison', confidence: 90 };
          }
          // Slow scroll while hovering pricing = evaluating
          if (speed < 5) {
            return { emotion: 'price_evaluation', confidence: 85 };
          }
          // Medium speed = considering
          if (speed < 15) {
            return { emotion: 'price_consideration', confidence: 80 };
          }
          // Fast scroll past pricing = scanning for something specific
          return { emotion: 'price_scanning', confidence: 70 };
        }

        // Normal confident scrolling patterns
        if (speed > 35) {
          // Very fast = scanning/skimming
          return { emotion: 'scanning', confidence: 75 };
        }
        if (speed > 20 && speed <= 35) {
          // Sure-handed confident scrolling = delight
          if (event.ctx?.smooth) {
            return { emotion: 'delight', confidence: 85 };
          }
          return { emotion: 'engaged_browsing', confidence: 75 };
        }
        if (speed > 10 && speed <= 20) {
          // Acceleration = building intrigue
          if (event.ctx?.accelerating) {
            return { emotion: 'intrigue', confidence: 80 };
          }
          return { emotion: 'interested', confidence: 70 };
        }
        if (speed > 5 && speed <= 10) {
          // Moderate steady pace = curiosity
          return { emotion: 'moderate_curiosity', confidence: 70 };
        }
        if (speed <= 5 && speed > 2) {
          // Slow and steady = reading with interest
          return { emotion: 'reading', confidence: 80 };
        }
        if (speed <= 2) {
          // Very slow = deep engagement
          return { emotion: 'deep_reading', confidence: 85 };
        }
        if (event.at_bottom) {
          // Reached bottom = fully explored
          return { emotion: 'fully_engaged', confidence: 90 };
        }
        return { emotion: 'browsing', confidence: 60 };
      },

      scroll_to_tabs: { emotion: 'comparison_shopping', confidence: 80 },

      mouse_exit: (event) => {
        // Exit direction tells us intent
        if (event.dir === 'top') {
          // Leaving via top after looking at pricing = checking competitors
          return event.after_pricing
            ? { emotion: 'comparison_shopping', confidence: 90 }
            : { emotion: 'tab_switching', confidence: 75 };
        }

        // Side exits after pricing = high abandonment risk
        if (event.after_pricing) {
          if (event.dir === 'left' || event.dir === 'right') {
            return { emotion: 'abandonment_warning', confidence: 90 };
          }
          // Bottom exit after pricing
          return { emotion: 'abandonment_risk', confidence: 85 };
        }

        // Non-pricing exits
        if (event.dir === 'left' || event.dir === 'right') {
          return { emotion: 'distracted', confidence: 60 };
        }
        return { emotion: 'mild_abandonment_risk', confidence: 65 };
      },

      mouse_return: { emotion: 're_engaged', confidence: 55 },

      tab_hidden: { emotion: 'exploring_elsewhere', confidence: 65 },

      tab_return: (event) => {
        // Analyze tab switching patterns
        if (event.ctx?.comparison_pattern) {
          // Multiple rapid switches = active comparison
          return { emotion: 'active_comparison_shopping', confidence: 95 };
        }
        if (event.ctx?.quick_switch) {
          // Quick switch = checking something specific
          return { emotion: 'reference_checking', confidence: 75 };
        }
        if (event.away_duration > 60000) {
          // Gone for a while
          return { emotion: 'returning_visitor', confidence: 70 };
        }
        return { emotion: 're_engaged', confidence: 60 };
      },

      // Copy events = high intent
      copy: (event) => {
        if (event.ctx?.pricing) {
          // Copying price info = comparing/sharing with others
          return { emotion: 'price_comparison_intent', confidence: 92 };
        }
        if (event.ctx?.url) {
          return { emotion: 'sharing_intent', confidence: 80 };
        }
        return { emotion: 'information_gathering', confidence: 70 };
      },

      // Form field interactions
      field_focus: (event) => {
        if (event.ctx?.checkout) {
          return { emotion: 'checkout_intent', confidence: 90 };
        }
        if (event.ctx?.email) {
          return { emotion: 'signup_intent', confidence: 80 };
        }
        if (event.ctx?.pricing) {
          return { emotion: 'purchase_consideration', confidence: 85 };
        }
        return { emotion: 'form_engagement', confidence: 70 };
      },

      field_blur: (event) => {
        if (event.ctx?.abandoned) {
          // Spent time but left empty - different fears
          if (event.ctx?.checkout) {
            // Payment field abandoned = financial anxiety
            if (event.field?.includes('card') || event.field?.includes('cvv')) {
              return { emotion: 'financial_anxiety', confidence: 94 };
            }
            return { emotion: 'checkout_hesitation', confidence: 92 };
          }
          // Email field abandoned after time = trust issues
          if (event.field?.includes('email') && event.duration > 3000) {
            return { emotion: 'trust_hesitation', confidence: 88 };
          }
          return { emotion: 'form_abandonment', confidence: 85 };
        }
        if (event.filled && event.duration < 2000) {
          // Quick fill = prepared/confident
          return { emotion: 'confident_user', confidence: 75 };
        }
        if (event.duration > 10000) {
          // Very long time in field - internal debate
          if (event.ctx?.checkout) {
            return { emotion: 'purchase_deliberation', confidence: 85 };
          }
          return { emotion: 'form_struggle', confidence: 80 };
        }
        return null; // Normal field completion
      },

      // New: Backward navigation = seeking validation
      back_navigation: { emotion: 'seeking_validation', confidence: 82 },

      // New: Multiple form field edits = commitment anxiety
      field_edit: (event) => {
        if (event.edit_count > 2) {
          return { emotion: 'commitment_anxiety', confidence: 87 };
        }
        return { emotion: 'reconsidering', confidence: 70 };
      }
    };
  }

  /**
   * Process batch of telemetry events from a session
   */
  processBatch(sessionId, events) {
    const diagnosed = [];

    // Get or create session context
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        history: [],
        lastEmotionTime: {},
        patterns: [],
        firstEventTime: Date.now()
      });
    }

    const session = this.sessions.get(sessionId);

    for (const event of events) {
      const diagnosis = this.diagnoseEvent(event, session);

      if (diagnosis) {
        // Apply cooldowns (backend controls the rate now)
        const lastTime = session.lastEmotionTime[diagnosis.emotion] || 0;
        const cooldown = this.getCooldown(diagnosis.emotion);

        if (event.t - lastTime > cooldown) {
          diagnosed.push({
            ...diagnosis,
            behavior: event.type,
            timestamp: event.t,
            context: event.ctx
          });

          session.lastEmotionTime[diagnosis.emotion] = event.t;
          session.history.push(diagnosis);
        }
      }
    }

    // Keep session history manageable
    if (session.history.length > 50) {
      session.history = session.history.slice(-50);
    }

    // Look for patterns in the session
    const patterns = this.detectPatterns(session.history);
    if (patterns.length > 0) {
      session.patterns = patterns;
      console.log(`🎯 Patterns detected for ${sessionId}:`, patterns.map(p => p.type));

      // TRIGGER INTERVENTIONS FOR CRITICAL PATTERNS
      this.triggerInterventions(sessionId, patterns, session);
    }

    return { emotions: diagnosed, patterns };
  }

  /**
   * Diagnose a single telemetry event
   */
  diagnoseEvent(event, session) {
    // Session age affects interpretation
    const sessionAge = event.session_age || 0;
    const isEarlySession = sessionAge < 5000; // First 5 seconds
    const isWarmingUp = sessionAge < 15000; // First 15 seconds

    // Early session price interactions = just exploring/orienting
    if (isEarlySession) {
      if (event.type === 'hover' && event.ctx?.pricing) {
        return { emotion: 'exploring', confidence: 60 };
      }
      if (event.type === 'scroll' && event.ctx?.pricing) {
        return { emotion: 'browsing', confidence: 55 };
      }
      // Don't diagnose sticker shock in first 5 seconds
      if (event.type === 'sudden_stop' && event.ctx?.pricing) {
        return { emotion: 'noticing', confidence: 50 };
      }
    }

    const mapping = this.behaviorMap[event.type];
    if (!mapping) return null;

    // Handle dynamic mappings (functions)
    let emotion;
    if (typeof mapping === 'function') {
      emotion = mapping(event);
    } else {
      emotion = { ...mapping };
    }

    // Reduce confidence for price-related emotions in warming period
    if (isWarmingUp && emotion && event.ctx?.pricing) {
      const highIntentEmotions = ['purchase_intent', 'sticker_shock', 'tier_comparison',
                                  'price_consideration', 'strong_purchase_intent'];
      if (highIntentEmotions.includes(emotion.emotion)) {
        return { ...emotion, confidence: Math.max(40, emotion.confidence - 20) };
      }
    }

    return emotion;
  }

  /**
   * Trigger interventions based on detected patterns
   */
  triggerInterventions(sessionId, patterns, session) {
    if (!this.wsServer) return;

    // Track intervention cooldowns per session
    if (!session.interventionHistory) {
      session.interventionHistory = new Map();
    }

    const now = Date.now();

    for (const pattern of patterns) {
      // Check cooldown (don't spam interventions)
      const lastTriggered = session.interventionHistory.get(pattern.intervention) || 0;
      const cooldownMs = 60000; // 1 minute cooldown per intervention type

      if (now - lastTriggered < cooldownMs) {
        console.log(`⏸️ Intervention ${pattern.intervention} on cooldown for ${sessionId}`);
        continue;
      }

      // Only trigger HIGH and CRITICAL priority interventions automatically
      if (pattern.priority === 'CRITICAL' || pattern.priority === 'HIGH') {
        console.log(`🎯 Triggering ${pattern.intervention} for pattern: ${pattern.type}`);

        // Map pattern interventions to actual intervention types
        const interventionMap = {
          'save_cart_urgent': 'cart_save_modal',
          'discount_offer': 'discount_modal',
          'free_shipping': 'shipping_offer',
          'help_offer': 'live_chat',
          'value_proposition': 'value_popup',
          'comparison_chart': 'comparison_modal',
          'urgency_message': 'urgency_banner',
          'price_assist': 'payment_plan_modal',
          'limited_offer': 'time_limited_discount',
          'payment_plan_offer': 'installments_modal',
          'money_back_guarantee': 'guarantee_badge',
          'risk_free_trial': 'trial_offer_modal',
          'success_stories': 'testimonial_popup'
        };

        const interventionType = interventionMap[pattern.intervention] || pattern.intervention;

        // Send intervention via WebSocket
        const sent = this.wsServer.sendIntervention(sessionId, interventionType);

        if (sent) {
          // Record intervention
          session.interventionHistory.set(pattern.intervention, now);

          // Log to database for tracking
          this.logIntervention(sessionId, pattern, interventionType);

          console.log(`✅ Intervention ${interventionType} sent to session ${sessionId}`);
        } else {
          console.log(`⚠️ No active WebSocket for session ${sessionId}`);
        }
      }
    }
  }

  /**
   * Log intervention to database for effectiveness tracking
   */
  async logIntervention(sessionId, pattern, interventionType) {
    try {
      await supabase.from('intervention_log').insert({
        session_id: sessionId,
        pattern_type: pattern.type,
        intervention_type: interventionType,
        priority: pattern.priority,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log intervention:', error);
    }
  }

  /**
   * Detect emotional patterns that need intervention
   */
  detectPatterns(history) {
    const patterns = [];

    if (history.length < 3) return patterns;

    // Recent emotions (last 5-10 for cart patterns)
    const recent = history.slice(-5).map(h => h.emotion);
    const extended = history.slice(-10).map(h => h.emotion);

    // Debug log to see what emotions we're working with
    if (recent.length > 0) {
      console.log('📊 Recent emotions:', recent);
    }

    // CART ABANDONMENT PATTERNS - THE MONEY MAKER
    const cartEmotions = ['cart_hesitation', 'cart_review', 'cart_shock'];
    const hasCartActivity = extended.some(e => cartEmotions.includes(e));

    if (hasCartActivity) {
      // Deep cart engagement followed by disengagement
      const cartIndex = extended.findIndex(e => cartEmotions.includes(e));
      const afterCart = extended.slice(cartIndex);

      // Critical: Cart hesitation + any negative signal
      if (afterCart.includes('cart_hesitation') &&
          (afterCart.includes('distracted') ||
           afterCart.includes('comparison_shopping') ||
           afterCart.includes('abandonment_intent'))) {
        patterns.push({
          type: 'cart_abandonment_imminent',
          intervention: 'save_cart_urgent',
          priority: 'CRITICAL'
        });
      }

      // Cart shock = need immediate reassurance
      if (recent.includes('cart_shock')) {
        patterns.push({
          type: 'cart_total_shock',
          intervention: 'discount_offer',
          priority: 'HIGH'
        });
      }

      // Extended cart review without progress = stuck
      const cartReviewCount = recent.filter(e => e === 'cart_review').length;
      if (cartReviewCount >= 2 && !recent.includes('engaged')) {
        patterns.push({
          type: 'cart_analysis_paralysis',
          intervention: 'free_shipping',
          priority: 'MEDIUM'
        });
      }
    }

    // 3x frustration = needs help
    const frustrationCount = recent.filter(e => e === 'frustration').length;
    if (frustrationCount >= 3) {
      patterns.push({ type: 'repeated_frustration', intervention: 'help_offer' });
    }

    // Sticker shock = immediate price justification needed
    if (recent.includes('sticker_shock')) {
      patterns.push({
        type: 'price_reaction',
        intervention: 'value_proposition',
        priority: 'HIGH'  // Add priority!
      });
    }

    // Comparison shopping = competitive advantage needed
    if (recent.includes('comparison_shopping')) {
      patterns.push({
        type: 'shopping_around',
        intervention: 'comparison_chart',
        priority: 'HIGH'
      });
    }

    // Hesitation followed by distracted/abandonment = losing them
    if (recent.includes('hesitation') &&
        (recent.includes('distracted') || recent.includes('abandonment_intent'))) {
      patterns.push({
        type: 'abandonment_risk',
        intervention: 'urgency_message',
        priority: 'CRITICAL'
      });
    }

    // Purchase intent but no click = needs nudge
    const hasIntent = recent.includes('purchase_intent');
    const hasClick = history.slice(-5).some(h => h.behavior === 'click');
    if (hasIntent && !hasClick) {
      patterns.push({
        type: 'purchase_hesitation',
        intervention: 'price_assist',
        priority: 'HIGH'
      });
    }

    // Re-engaged after leaving = second chance
    if (recent.includes('re_engaged') && recent.includes('purchase_intent')) {
      patterns.push({
        type: 'second_chance',
        intervention: 'limited_offer',
        priority: 'CRITICAL'
      });
    }

    // SIMPLE ABANDONMENT TRIGGER - for testing
    if (recent.includes('abandonment_warning') || recent.includes('abandonment_risk')) {
      patterns.push({
        type: 'exit_intent_detected',
        intervention: 'discount_offer',
        priority: 'CRITICAL'
      });
    }

    // TIER COMPARISON WITHOUT DECISION = needs help
    if (recent.includes('tier_comparison') && !recent.includes('click')) {
      patterns.push({
        type: 'pricing_analysis_paralysis',
        intervention: 'value_popup',
        priority: 'HIGH'
      });
    }

    // FEAR-BASED PATTERNS - The real human emotions

    // Financial anxiety (multiple money-related hesitations)
    const financialFears = ['financial_anxiety', 'sticker_shock', 'purchase_deliberation', 'price_paralysis'];
    const financialFearCount = extended.filter(e => financialFears.includes(e)).length;
    if (financialFearCount >= 2) {
      patterns.push({
        type: 'financial_fear_spiral',
        intervention: 'payment_plan_offer',
        priority: 'HIGH',
        message: 'Split into 3 easy payments'
      });
    }

    // Trust crisis (seeking validation desperately)
    const trustIssues = ['trust_hesitation', 'seeking_validation', 'reference_checking', 'exploring_elsewhere'];
    const trustIssueCount = extended.filter(e => trustIssues.includes(e)).length;
    if (trustIssueCount >= 3) {
      patterns.push({
        type: 'trust_crisis',
        intervention: 'money_back_guarantee',
        priority: 'HIGH',
        message: '30-day money back guarantee'
      });
    }

    // Buyer's remorse preview (commitment phobia)
    const commitmentFears = ['commitment_anxiety', 'reconsidering', 'checkout_hesitation', 'financial_anxiety'];
    const hasCommitmentFear = extended.some(e => commitmentFears.includes(e));
    const hasStrongIntent = extended.some(e => ['strong_purchase_intent', 'checkout_intent'].includes(e));

    if (hasCommitmentFear && hasStrongIntent) {
      patterns.push({
        type: 'pre_purchase_remorse',
        intervention: 'risk_free_trial',
        priority: 'CRITICAL',
        message: 'Try risk-free for 14 days'
      });
    }

    // The "what if it doesn't work" fear
    if (recent.includes('financial_anxiety') && (recent.includes('seeking_validation') || recent.includes('trust_hesitation'))) {
      patterns.push({
        type: 'outcome_uncertainty',
        intervention: 'success_stories',
        priority: 'HIGH',
        message: 'See how others succeeded'
      });
    }

    return patterns;
  }

  /**
   * Get cooldown for emotion type (in ms)
   */
  getCooldown(emotion) {
    const cooldowns = {
      frustration: 10000,
      interest: 5000,
      engaged: 5000,
      hesitation: 8000,
      purchase_intent: 10000,
      scanning: 3000,
      reading: 5000,
      distracted: 5000
    };

    return cooldowns[emotion] || 5000;
  }

  /**
   * Clean up old sessions
   */
  cleanup() {
    const oneHourAgo = Date.now() - 3600000;

    for (const [sessionId, session] of this.sessions.entries()) {
      const lastEvent = session.history[session.history.length - 1];
      if (lastEvent && lastEvent.timestamp < oneHourAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * PATTERN LEARNING - Learn from outcomes
   */
  async learnFromSession(sessionId, outcome, metadata = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const tenantId = session.tenantId || 'unknown';
    const emotionPath = session.history.map(h => h.emotion);
    const fullPath = emotionPath.join('→');
    const pathKey = emotionPath.slice(-10).join('→'); // Last 10 emotions
    const patternHash = crypto.createHash('md5').update(pathKey).digest('hex');

    // Update in-memory patterns
    if (outcome === 'conversion') {
      const count = this.patternMemory.conversionPaths.get(pathKey) || 0;
      this.patternMemory.conversionPaths.set(pathKey, count + 1);
    } else if (outcome === 'abandonment') {
      const count = this.patternMemory.abandonmentPaths.get(pathKey) || 0;
      this.patternMemory.abandonmentPaths.set(pathKey, count + 1);
    }

    // Persist to database
    try {
      // Store session outcome
      await this.persistSessionOutcome(tenantId, sessionId, fullPath, outcome, metadata);

      // Update or create pattern
      await this.persistPattern(tenantId, patternHash, pathKey, outcome, metadata);

      // Update volatility metrics
      await this.persistVolatilityMetrics(tenantId, session, metadata);

      // Generate insights if significant pattern
      await this.generatePatternInsight(tenantId, pathKey, outcome);

    } catch (error) {
      console.error('Error persisting pattern learning:', error);
    }

    // Update volatility by context
    this.updateVolatilityIndex(session, metadata);
  }

  /**
   * Persist session outcome to database
   */
  async persistSessionOutcome(tenantId, sessionId, emotionPath, outcome, metadata) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Find peak emotion
    let peakEmotion = null;
    let peakConfidence = 0;
    session.history.forEach(h => {
      if (h.confidence > peakConfidence) {
        peakEmotion = h.emotion;
        peakConfidence = h.confidence;
      }
    });

    await supabase.from('session_outcomes').insert({
      tenant_id: tenantId,
      session_id: sessionId,
      emotion_path: emotionPath,
      final_outcome: outcome,
      conversion_value: metadata.value || null,
      session_duration: Date.now() - session.startTime,
      total_events: session.history.length,
      intervention_triggered: metadata.intervention || false,
      intervention_type: metadata.interventionType || null,
      intervention_successful: metadata.interventionSuccess || null,
      device_type: metadata.device || null,
      browser: metadata.browser || null,
      referrer_source: metadata.referrer || null,
      landing_page: metadata.landingPage || null,
      exit_page: metadata.exitPage || null,
      peak_emotion: peakEmotion,
      peak_confidence: peakConfidence
    });
  }

  /**
   * Persist or update emotional pattern
   */
  async persistPattern(tenantId, patternHash, emotionSequence, outcome, metadata) {
    // Check if pattern exists
    const { data: existing } = await supabase
      .from('emotional_patterns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('pattern_hash', patternHash)
      .eq('outcome_type', outcome)
      .single();

    if (existing) {
      // Update existing pattern
      await supabase
        .from('emotional_patterns')
        .update({
          occurrence_count: existing.occurrence_count + 1,
          last_seen: new Date().toISOString(),
          confidence_score: Math.min(100, existing.confidence_score + 2),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new pattern
      await supabase
        .from('emotional_patterns')
        .insert({
          tenant_id: tenantId,
          pattern_hash: patternHash,
          emotion_sequence: emotionSequence,
          outcome_type: outcome,
          occurrence_count: 1,
          confidence_score: 20, // Start with low confidence
          metadata: metadata
        });
    }
  }

  /**
   * Persist volatility metrics
   */
  async persistVolatilityMetrics(tenantId, session, metadata) {
    const evi = this.calculateEVI();

    // Store global EVI
    await supabase.from('volatility_metrics').insert({
      tenant_id: tenantId,
      metric_type: 'global',
      metric_value: 'all',
      evi_score: evi,
      sample_size: this.sessions.size,
      emotion_variance: this.calculateVariance(),
      dominant_emotions: this.getDominantEmotions(),
      trend_direction: this.getTrendDirection()
    });

    // Store vertical-specific if provided
    if (metadata.vertical) {
      await supabase.from('volatility_metrics').insert({
        tenant_id: tenantId,
        metric_type: 'vertical',
        metric_value: metadata.vertical,
        evi_score: this.calculateEVI(metadata.vertical),
        sample_size: this.getVerticalSampleSize(metadata.vertical),
        dominant_emotions: this.getDominantEmotions(metadata.vertical)
      });
    }
  }

  /**
   * Generate human-readable insights
   */
  async generatePatternInsight(tenantId, emotionSequence, outcome) {
    const emotions = emotionSequence.split('→');

    // Generate insight based on pattern
    let insight = null;

    if (outcome === 'abandonment' && emotions.includes('sticker_shock')) {
      insight = {
        type: 'common_abandonment',
        headline: 'Your shoppers typically experience sticker shock when viewing premium tiers',
        description: `We've noticed that ${emotions.includes('price_paralysis') ? 'extended price hesitation' : 'sudden price shock'} often leads to cart abandonment. Consider progressive disclosure of pricing or value-based messaging.`,
        recommendation: 'Show value propositions before revealing full pricing, or offer payment plans to reduce sticker shock.',
        impact_score: 85
      };
    } else if (outcome === 'conversion' && emotions.includes('demo_activation')) {
      insight = {
        type: 'conversion_driver',
        headline: 'Demo interactions strongly correlate with conversions',
        description: 'Users who engage with your demo are significantly more likely to convert. The emotional journey from curiosity to demo activation is a strong purchase signal.',
        recommendation: 'Make your demo more prominent and consider triggering it earlier in the user journey.',
        impact_score: 90
      };
    } else if (emotions.filter(e => e.includes('hesitation')).length > 2) {
      insight = {
        type: 'intervention_opportunity',
        headline: 'Multiple hesitation points detected in user journey',
        description: 'Users are experiencing repeated moments of doubt. This pattern suggests trust or value clarity issues.',
        recommendation: 'Add social proof, testimonials, or trust badges at key decision points.',
        impact_score: 75
      };
    }

    if (insight) {
      await supabase.from('pattern_insights').insert({
        tenant_id: tenantId,
        insight_type: insight.type,
        headline: insight.headline,
        description: insight.description,
        pattern_hash: crypto.createHash('md5').update(emotionSequence).digest('hex'),
        frequency: 1, // Will be updated as pattern recurs
        impact_score: insight.impact_score,
        recommendation: insight.recommendation,
        supporting_data: {
          pattern: emotions,
          outcome: outcome
        }
      });
    }
  }

  /**
   * Load patterns from database on startup
   */
  async loadPatterns(tenantId = null) {
    console.log('📚 Loading learned patterns from database...');

    try {
      // Build query
      let query = supabase
        .from('emotional_patterns')
        .select('*')
        .order('confidence_score', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: patterns } = await query;

      if (patterns) {
        // Load patterns into memory
        patterns.forEach(pattern => {
          if (pattern.outcome_type === 'conversion') {
            this.patternMemory.conversionPaths.set(
              pattern.emotion_sequence,
              pattern.occurrence_count
            );
          } else if (pattern.outcome_type === 'abandonment') {
            this.patternMemory.abandonmentPaths.set(
              pattern.emotion_sequence,
              pattern.occurrence_count
            );
          }
        });

        console.log(`✅ Loaded ${patterns.length} patterns`);
        console.log(`   - ${this.patternMemory.conversionPaths.size} conversion patterns`);
        console.log(`   - ${this.patternMemory.abandonmentPaths.size} abandonment patterns`);
      }

      // Load recent volatility metrics
      const { data: volatility } = await supabase
        .from('volatility_metrics')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(100);

      if (volatility) {
        volatility.forEach(metric => {
          if (metric.metric_type === 'vertical') {
            this.patternMemory.volatilityIndex.byVertical.set(
              metric.metric_value,
              metric.evi_score
            );
          } else if (metric.metric_type === 'geography') {
            this.patternMemory.volatilityIndex.byGeo.set(
              metric.metric_value,
              metric.evi_score
            );
          }
        });
      }

    } catch (error) {
      console.error('Error loading patterns:', error);
    }
  }

  /**
   * Get tenant-specific insights for dashboard
   */
  async getTenantInsights(tenantId) {
    const { data: insights } = await supabase
      .from('pattern_insights')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('impact_score', { ascending: false })
      .limit(10);

    const { data: stats } = await supabase
      .from('tenant_pattern_stats')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    return {
      insights: insights || [],
      stats: stats || {},
      evi: this.calculateEVI(),
      activeSessions: this.sessions.size
    };
  }

  /**
   * PREDICTIVE - Predict outcome based on current emotional path
   */
  predictOutcome(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.history.length < 3) return null;

    const currentPath = session.history.slice(-5).map(h => h.emotion).join('→');

    // Check if current path matches known patterns
    let conversionScore = 0;
    let abandonmentScore = 0;

    for (const [path, count] of this.patternMemory.conversionPaths) {
      if (path.includes(currentPath)) {
        conversionScore += count;
      }
    }

    for (const [path, count] of this.patternMemory.abandonmentPaths) {
      if (path.includes(currentPath)) {
        abandonmentScore += count;
      }
    }

    const total = conversionScore + abandonmentScore;
    if (total === 0) return null;

    return {
      conversionProbability: conversionScore / total,
      abandonmentRisk: abandonmentScore / total,
      confidence: Math.min(total / 10, 1), // Confidence grows with more data
      recommendation: abandonmentScore > conversionScore ? 'intervene_now' : 'monitor'
    };
  }

  /**
   * EMOTIONAL VOLATILITY INDEX - The Bloomberg Terminal metric
   */
  calculateEVI(context = 'global') {
    const recentSessions = Array.from(this.sessions.values()).slice(-100);
    if (recentSessions.length < 10) return 0;

    // Calculate emotional variance across sessions
    const emotionChanges = recentSessions.map(session => {
      const changes = [];
      for (let i = 1; i < session.history.length; i++) {
        const prev = session.history[i - 1];
        const curr = session.history[i];
        // Emotional distance (how dramatic the change)
        const distance = Math.abs(prev.confidence - curr.confidence);
        changes.push(distance);
      }
      return changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
    });

    // Standard deviation of emotional changes = volatility
    const mean = emotionChanges.reduce((a, b) => a + b, 0) / emotionChanges.length;
    const variance = emotionChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / emotionChanges.length;
    const volatility = Math.sqrt(variance);

    // Normalize to 0-100 scale (like VIX)
    return Math.min(volatility * 2, 100);
  }

  /**
   * Update volatility index with context
   */
  updateVolatilityIndex(session, metadata) {
    const evi = this.calculateEVI();
    this.patternMemory.volatilityIndex.global = evi;

    // Update by vertical if provided
    if (metadata.vertical) {
      this.patternMemory.volatilityIndex.byVertical.set(metadata.vertical, evi);
    }

    // Update by geography if provided
    if (metadata.geo) {
      this.patternMemory.volatilityIndex.byGeo.set(metadata.geo, evi);
    }

    // Update by time patterns
    const hour = new Date().getHours();
    const day = new Date().getDay();
    this.patternMemory.volatilityIndex.byTimeOfDay.set(hour, evi);
    this.patternMemory.volatilityIndex.byDayOfWeek.set(day, evi);
  }

  /**
   * Start tracking volatility over time
   */
  startVolatilityTracking() {
    // Calculate EVI every minute
    setInterval(() => {
      const evi = this.calculateEVI();
      this.patternMemory.volatilityIndex.global = evi;

      // Log for monitoring
      console.log(`📊 EVI: ${evi.toFixed(2)} | Sessions: ${this.sessions.size}`);
    }, 60000);
  }

  /**
   * Get market insights - the Bloomberg Terminal view
   */
  getMarketInsights() {
    const volatility = this.patternMemory.volatilityIndex;
    const topConversionPaths = Array.from(this.patternMemory.conversionPaths.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topAbandonmentPaths = Array.from(this.patternMemory.abandonmentPaths.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      evi: {
        global: volatility.global,
        trending: volatility.global > 50 ? 'high_volatility' : 'stable',
        byVertical: Object.fromEntries(volatility.byVertical),
        byGeo: Object.fromEntries(volatility.byGeo),
        peakHours: Array.from(volatility.byTimeOfDay.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
      },
      patterns: {
        winningPaths: topConversionPaths.map(([path, count]) => ({
          emotions: path.split('→'),
          frequency: count
        })),
        losingPaths: topAbandonmentPaths.map(([path, count]) => ({
          emotions: path.split('→'),
          frequency: count
        }))
      },
      recommendations: {
        hotspots: this.identifyEmotionalHotspots(),
        interventionTiming: this.getOptimalInterventionTiming()
      }
    };
  }

  /**
   * Helper methods for volatility calculations
   */
  calculateVariance() {
    const emotions = [];
    for (const session of this.sessions.values()) {
      emotions.push(...session.history.map(h => h.confidence));
    }
    if (emotions.length === 0) return 0;

    const mean = emotions.reduce((a, b) => a + b, 0) / emotions.length;
    const variance = emotions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / emotions.length;
    return variance;
  }

  getDominantEmotions(context = null) {
    const emotionCounts = new Map();

    for (const session of this.sessions.values()) {
      // Filter by context if provided
      if (context && session.metadata?.vertical !== context) continue;

      for (const event of session.history) {
        const count = emotionCounts.get(event.emotion) || 0;
        emotionCounts.set(event.emotion, count + 1);
      }
    }

    // Sort and return top 5
    return Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));
  }

  getTrendDirection() {
    // Compare recent volatility to older volatility
    const recentEVI = this.calculateEVI();
    const historicalEVI = this.patternMemory.volatilityIndex.global || 50;

    if (recentEVI > historicalEVI * 1.1) return 'increasing';
    if (recentEVI < historicalEVI * 0.9) return 'decreasing';
    return 'stable';
  }

  getVerticalSampleSize(vertical) {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.metadata?.vertical === vertical) count++;
    }
    return count;
  }

  /**
   * Identify emotional hotspots across all sessions
   */
  identifyEmotionalHotspots() {
    const emotionCounts = new Map();

    for (const session of this.sessions.values()) {
      for (const event of session.history) {
        const count = emotionCounts.get(event.emotion) || 0;
        emotionCounts.set(event.emotion, count + 1);
      }
    }

    return Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, intensity: count }));
  }

  /**
   * Get optimal intervention timing based on patterns
   */
  getOptimalInterventionTiming() {
    // Analyze when interventions are most effective
    const timingPatterns = new Map();

    for (const [pattern, success] of this.patternMemory.interventionSuccess) {
      const [emotion, timing] = pattern.split('_at_');
      if (!timingPatterns.has(emotion)) {
        timingPatterns.set(emotion, []);
      }
      timingPatterns.get(emotion).push({ timing, success });
    }

    const recommendations = {};
    for (const [emotion, timings] of timingPatterns) {
      const avgSuccess = timings.reduce((sum, t) => sum + t.success, 0) / timings.length;
      recommendations[emotion] = {
        optimalTiming: timings.sort((a, b) => b.success - a.success)[0]?.timing || 'immediate',
        successRate: avgSuccess
      };
    }

    return recommendations;
  }
}

// Create instance
export const behaviorProcessor = new BehaviorProcessor();

// Method to set WebSocket server after initialization
behaviorProcessor.setWebSocketServer = function(wsServer) {
  this.wsServer = wsServer;
};

// Cleanup every 10 minutes
setInterval(() => {
  behaviorProcessor.cleanup();
}, 600000);