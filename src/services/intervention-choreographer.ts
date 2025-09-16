/**
 * Intervention Choreographer
 * The difference between "popup" and "perfect timing"
 * This is where math meets magic
 */

import { cssEngine } from './css-engine';
import { InterventionTemplate } from '@/types/intervention-templates';

interface BehavioralContext {
  // Mouse dynamics
  mousePosition: { x: number; y: number };
  mouseVelocity: number;
  mouseAcceleration: number;
  hoverTarget?: Element;
  hoverDuration?: number;

  // Scroll behavior
  scrollDepth: number;
  scrollVelocity: number;
  timeOnPage: number;

  // Page context
  currentPage: string;
  elementProximity: Map<string, number>; // Distance to key elements
  visibleElements: Set<string>;

  // Historical patterns
  previousInterventions: InterventionMemory[];
  sessionValue: number;
  emotionalTrajectory: 'improving' | 'declining' | 'stable' | 'volatile';
}

interface InterventionMemory {
  type: string;
  timestamp: number;
  shown: boolean;
  interacted: boolean;
  dismissed: boolean;
  conversionImpact: number;
}

interface ChoreographyDecision {
  trigger: boolean;
  intervention?: {
    type: 'modal' | 'banner' | 'toast' | 'badge' | 'floating';
    template: string;
    timing: {
      delay: number;
      duration: number;
      persistence: 'sticky' | 'timed' | 'until-scroll' | 'until-interaction';
    };
    position: {
      strategy: 'fixed' | 'relative' | 'follow' | 'near-element';
      coordinates?: { x: number; y: number };
      element?: string;
    };
    content: {
      headline: string;
      body: string;
      cta: string;
      discount?: number;
    };
    animation: {
      entrance: string;
      exit: string;
      attentionGrabber?: string; // Pulse, shake, glow
    };
  };
}

export class InterventionChoreographer {
  private static instance: InterventionChoreographer;

  // Behavioral tracking
  private mouseTrail: Array<{ x: number; y: number; t: number }> = [];
  private scrollHistory: Array<{ depth: number; t: number }> = [];
  private hoverTimers: Map<string, number> = new Map();
  private activeInterventions = new Set<string>();

  // Learning memory
  private interventionHistory: InterventionMemory[] = [];
  private successPatterns: Map<string, number> = new Map();
  private userArchetype?: 'price-sensitive' | 'quality-focused' | 'impulse-buyer' | 'researcher' | 'comparison-shopper';

  // Real-time state
  private context: BehavioralContext = {
    mousePosition: { x: 0, y: 0 },
    mouseVelocity: 0,
    mouseAcceleration: 0,
    scrollDepth: 0,
    scrollVelocity: 0,
    timeOnPage: 0,
    currentPage: '',
    elementProximity: new Map(),
    visibleElements: new Set(),
    previousInterventions: [],
    sessionValue: 0,
    emotionalTrajectory: 'stable'
  };

  // Intelligence connection
  private intelligenceSocket?: WebSocket;
  private decisionBuffer: ChoreographyDecision[] = [];

  private constructor() {
    this.initialize();
  }

  static getInstance(): InterventionChoreographer {
    if (!InterventionChoreographer.instance) {
      InterventionChoreographer.instance = new InterventionChoreographer();
    }
    return InterventionChoreographer.instance;
  }

  private initialize() {
    // Mouse tracking with velocity calculation
    document.addEventListener('mousemove', this.trackMouse.bind(this));

    // Scroll tracking with acceleration
    window.addEventListener('scroll', this.trackScroll.bind(this));

    // Hover detection on key elements
    this.initializeHoverTracking();

    // Exit intent detection
    document.addEventListener('mouseout', this.detectExitIntent.bind(this));

    // Visibility tracking
    this.initializeIntersectionObserver();

    // Start the choreography engine
    this.startChoreographyLoop();
  }

  private trackMouse(e: MouseEvent) {
    const now = Date.now();
    const prev = this.context.mousePosition;

    // Calculate velocity (pixels per second)
    const distance = Math.sqrt(
      Math.pow(e.clientX - prev.x, 2) +
      Math.pow(e.clientY - prev.y, 2)
    );

    const lastTrail = this.mouseTrail[this.mouseTrail.length - 1];
    const timeDelta = lastTrail ? (now - lastTrail.t) / 1000 : 0.016; // 60fps fallback

    this.context.mouseVelocity = distance / timeDelta;

    // Calculate acceleration (change in velocity)
    const prevVelocity = this.mouseTrail.length > 1
      ? this.calculateVelocity(
          this.mouseTrail[this.mouseTrail.length - 2],
          this.mouseTrail[this.mouseTrail.length - 1]
        )
      : 0;

    this.context.mouseAcceleration = (this.context.mouseVelocity - prevVelocity) / timeDelta;

    // Update position and trail
    this.context.mousePosition = { x: e.clientX, y: e.clientY };
    this.mouseTrail.push({ x: e.clientX, y: e.clientY, t: now });

    // Keep trail limited to last 100 points
    if (this.mouseTrail.length > 100) {
      this.mouseTrail.shift();
    }

    // Check for deceleration near key elements
    this.checkMouseDeceleration(e);
  }

  private calculateVelocity(p1: { x: number; y: number; t: number }, p2: { x: number; y: number; t: number }): number {
    const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const time = (p2.t - p1.t) / 1000;
    return distance / time;
  }

  private checkMouseDeceleration(e: MouseEvent) {
    // Deceleration near pricing = interest signal
    if (this.context.mouseAcceleration < -500) { // Rapid deceleration
      const pricingElements = document.querySelectorAll('[data-price], .pricing-tier, .price');
      pricingElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const distance = this.calculateDistanceToElement(e.clientX, e.clientY, rect);

        if (distance < 100) { // Within 100px
          this.recordBehavioralSignal('price_deceleration', {
            element: element.className,
            velocity: this.context.mouseVelocity,
            deceleration: this.context.mouseAcceleration,
            distance
          });
        }
      });
    }
  }

  private calculateDistanceToElement(x: number, y: number, rect: DOMRect): number {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
  }

  private initializeHoverTracking() {
    // Track hover duration on key elements
    const trackableSelectors = [
      '[data-price]',
      '.pricing-tier',
      '.add-to-cart',
      '.checkout',
      'button[type="submit"]',
      '.product-card',
      '.premium-feature'
    ];

    trackableSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        element.addEventListener('mouseenter', (e) => {
          const target = e.target as HTMLElement;
          const key = `${selector}-${target.dataset.id || target.id || 'unknown'}`;
          this.hoverTimers.set(key, Date.now());
          this.context.hoverTarget = target;
        });

        element.addEventListener('mouseleave', (e) => {
          const target = e.target as HTMLElement;
          const key = `${selector}-${target.dataset.id || target.id || 'unknown'}`;
          const startTime = this.hoverTimers.get(key);

          if (startTime) {
            const duration = Date.now() - startTime;
            this.context.hoverDuration = duration;

            // Significant hover = interest
            if (duration > 2000) {
              this.recordBehavioralSignal('significant_hover', {
                element: key,
                duration,
                scrollDepth: this.context.scrollDepth
              });

              // Check if we should intervene
              this.evaluateHoverIntervention(target, duration);
            }

            this.hoverTimers.delete(key);
          }
        });
      });
    });
  }

  private evaluateHoverIntervention(element: HTMLElement, duration: number) {
    // Dynamic discount based on hover duration and element type
    const isPricing = element.matches('[data-price], .pricing-tier');
    const isCart = element.matches('.add-to-cart, .checkout');

    if (isPricing && duration > 3000) {
      // Calculate discount based on hover duration
      const baseDiscount = 10;
      const bonusDiscount = Math.min(Math.floor((duration - 3000) / 1000), 15); // +1% per second, max 15%
      const totalDiscount = baseDiscount + bonusDiscount;

      this.scheduleIntervention({
        trigger: true,
        intervention: {
          type: 'floating',
          template: 'dynamic_discount',
          timing: {
            delay: 500, // Half second after hover ends
            duration: 30000, // Show for 30 seconds
            persistence: 'until-scroll'
          },
          position: {
            strategy: 'near-element',
            element: element.id || element.className
          },
          content: {
            headline: `Still thinking it over?`,
            body: `Here's ${totalDiscount}% off to help you decide`,
            cta: 'Apply Discount',
            discount: totalDiscount
          },
          animation: {
            entrance: 'slideUp',
            exit: 'fadeOut',
            attentionGrabber: 'pulse'
          }
        }
      });
    }

    if (isCart && duration > 5000) {
      // Cart hesitation = need reassurance
      this.scheduleIntervention({
        trigger: true,
        intervention: {
          type: 'toast',
          template: 'trust_signals',
          timing: {
            delay: 0,
            duration: 10000,
            persistence: 'timed'
          },
          position: {
            strategy: 'fixed',
            coordinates: { x: window.innerWidth - 400, y: window.innerHeight - 100 }
          },
          content: {
            headline: '🔒 Secure Checkout',
            body: '30-day money back guarantee • Free returns',
            cta: 'Continue',
            discount: 0
          },
          animation: {
            entrance: 'slideLeft',
            exit: 'slideRight'
          }
        }
      });
    }
  }

  private trackScroll(e: Event) {
    const now = Date.now();
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollDepth = (scrollTop / docHeight) * 100;

    // Calculate scroll velocity
    const lastScroll = this.scrollHistory[this.scrollHistory.length - 1];
    if (lastScroll) {
      const timeDelta = (now - lastScroll.t) / 1000;
      const distanceDelta = Math.abs(scrollDepth - lastScroll.depth);
      this.context.scrollVelocity = distanceDelta / timeDelta;
    }

    this.context.scrollDepth = scrollDepth;
    this.scrollHistory.push({ depth: scrollDepth, t: now });

    // Rage scrolling detection
    if (this.context.scrollVelocity > 200) { // Very fast scrolling
      this.recordBehavioralSignal('rage_scroll', {
        velocity: this.context.scrollVelocity,
        depth: scrollDepth
      });

      // Might be looking for something specific
      this.scheduleIntervention({
        trigger: true,
        intervention: {
          type: 'badge',
          template: 'help_finder',
          timing: {
            delay: 1000,
            duration: 15000,
            persistence: 'sticky'
          },
          position: {
            strategy: 'fixed'
          },
          content: {
            headline: 'Need help finding something?',
            body: '',
            cta: 'Chat with us'
          },
          animation: {
            entrance: 'bounce',
            exit: 'scaleOut',
            attentionGrabber: 'glow'
          }
        }
      });
    }

    // Bottom of page without conversion
    if (scrollDepth > 95 && this.interventionHistory.filter(i => i.interacted).length === 0) {
      this.recordBehavioralSignal('scroll_to_bottom_no_action', {
        timeOnPage: this.context.timeOnPage,
        interventionsShown: this.interventionHistory.length
      });
    }
  }

  private detectExitIntent(e: MouseEvent) {
    // Exit from top = likely leaving
    if (e.clientY <= 0 && this.context.mouseVelocity > 100) {
      this.recordBehavioralSignal('exit_intent', {
        velocity: this.context.mouseVelocity,
        timeOnPage: this.context.timeOnPage,
        lastHover: this.context.hoverTarget?.className
      });

      // Don't let them leave empty-handed
      if (!this.hasShownExitIntervention()) {
        this.scheduleIntervention({
          trigger: true,
          intervention: {
            type: 'modal',
            template: 'exit_intent_rescue',
            timing: {
              delay: 0, // Immediate
              duration: 0, // Until dismissed
              persistence: 'sticky'
            },
            position: {
              strategy: 'fixed'
            },
            content: {
              headline: 'Wait! Before you go...',
              body: "We'd hate to see you leave empty-handed. Here's something special just for you.",
              cta: 'Claim Your Surprise',
              discount: 20
            },
            animation: {
              entrance: 'scaleIn',
              exit: 'scaleOut',
              attentionGrabber: 'shake'
            }
          }
        });
      }
    }
  }

  private initializeIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const element = entry.target as HTMLElement;
        const key = element.dataset.track || element.id || element.className;

        if (entry.isIntersecting) {
          this.context.visibleElements.add(key);

          // First view of expensive item
          if (element.dataset.price && parseInt(element.dataset.price) > 500) {
            this.recordBehavioralSignal('expensive_item_view', {
              price: element.dataset.price,
              scrollDepth: this.context.scrollDepth
            });
          }
        } else {
          this.context.visibleElements.delete(key);
        }
      });
    }, {
      threshold: [0.25, 0.5, 0.75, 1.0]
    });

    // Observe key elements
    document.querySelectorAll('[data-track], .product-card, .pricing-tier, .testimonial').forEach(el => {
      observer.observe(el);
    });
  }

  private recordBehavioralSignal(type: string, data: any) {
    // Send to intelligence layer
    if (this.intelligenceSocket?.readyState === WebSocket.OPEN) {
      this.intelligenceSocket.send(JSON.stringify({
        type: 'behavioral_signal',
        signal: type,
        data,
        context: this.context,
        timestamp: Date.now()
      }));
    }

    console.log(`🎭 Behavioral Signal: ${type}`, data);
  }

  private scheduleIntervention(decision: ChoreographyDecision) {
    if (!decision.trigger || !decision.intervention) return;

    const { intervention } = decision;

    // Deduplication check
    const key = `${intervention.type}-${intervention.template}`;
    if (this.activeInterventions.has(key)) {
      console.log(`⏸️ Intervention already active: ${key}`);
      return;
    }

    // Schedule with delay
    setTimeout(() => {
      this.executeIntervention(intervention);
    }, intervention.timing.delay);
  }

  private executeIntervention(intervention: any) {
    console.log(`🎬 Executing intervention:`, intervention);

    // Record in history
    this.interventionHistory.push({
      type: intervention.template,
      timestamp: Date.now(),
      shown: true,
      interacted: false,
      dismissed: false,
      conversionImpact: 0
    });

    // This is where we'd render the actual intervention
    // For now, just log it
    const key = `${intervention.type}-${intervention.template}`;
    this.activeInterventions.add(key);

    // Apply CSS and render
    // cssEngine.injectStyles(...)
    // DOM manipulation to show intervention

    // Handle persistence
    switch (intervention.timing.persistence) {
      case 'timed':
        setTimeout(() => {
          this.dismissIntervention(key);
        }, intervention.timing.duration);
        break;

      case 'until-scroll':
        const scrollHandler = () => {
          this.dismissIntervention(key);
          window.removeEventListener('scroll', scrollHandler);
        };
        window.addEventListener('scroll', scrollHandler);
        break;

      case 'until-interaction':
        // Set up click handlers
        break;

      case 'sticky':
        // Stays until explicitly dismissed
        break;
    }
  }

  private dismissIntervention(key: string) {
    this.activeInterventions.delete(key);
    console.log(`👋 Dismissed intervention: ${key}`);
  }

  private hasShownExitIntervention(): boolean {
    return this.interventionHistory.some(i =>
      i.type === 'exit_intent_rescue' &&
      Date.now() - i.timestamp < 3600000 // Within last hour
    );
  }

  private startChoreographyLoop() {
    // Main choreography loop - runs every 100ms
    setInterval(() => {
      this.context.timeOnPage = Date.now() - (window.performance?.timing?.navigationStart || Date.now());

      // Evaluate emotional trajectory
      this.updateEmotionalTrajectory();

      // Check for intervention opportunities
      this.evaluateInterventionOpportunities();

    }, 100);
  }

  private updateEmotionalTrajectory() {
    // Simple trajectory based on recent behavior
    const recentSignals = this.mouseTrail.slice(-20);
    const avgVelocity = recentSignals.reduce((sum, p, i) => {
      if (i === 0) return sum;
      return sum + this.calculateVelocity(recentSignals[i-1], p);
    }, 0) / (recentSignals.length - 1);

    if (avgVelocity > 1000) {
      this.context.emotionalTrajectory = 'volatile';
    } else if (this.context.scrollVelocity > 100) {
      this.context.emotionalTrajectory = 'declining';
    } else if (this.hoverTimers.size > 0) {
      this.context.emotionalTrajectory = 'improving';
    } else {
      this.context.emotionalTrajectory = 'stable';
    }
  }

  private evaluateInterventionOpportunities() {
    // This is where the magic happens
    // Combine all signals to decide if NOW is the moment

    const signals = {
      timeOnPage: this.context.timeOnPage,
      scrollDepth: this.context.scrollDepth,
      mouseVelocity: this.context.mouseVelocity,
      trajectory: this.context.emotionalTrajectory,
      activeHovers: this.hoverTimers.size,
      previousInterventions: this.interventionHistory.length
    };

    // The secret sauce algorithm would go here
    // For now, some basic heuristics

    // Stuck at top of page for too long
    if (signals.timeOnPage > 10000 && signals.scrollDepth < 10 && signals.previousInterventions === 0) {
      this.recordBehavioralSignal('analysis_paralysis', signals);
    }

    // Multiple hover points = comparison shopping
    if (signals.activeHovers > 2) {
      this.recordBehavioralSignal('comparison_mode', signals);
    }
  }

  // Public API for external control
  public connectToIntelligence(wsUrl: string) {
    this.intelligenceSocket = new WebSocket(wsUrl);

    this.intelligenceSocket.onmessage = (event) => {
      const command = JSON.parse(event.data);
      if (command.type === 'intervention_command') {
        this.scheduleIntervention(command.decision);
      }
    };
  }

  public setUserArchetype(archetype: typeof this.userArchetype) {
    this.userArchetype = archetype;
  }

  public recordConversion(interventionType: string, value: number) {
    const intervention = this.interventionHistory.find(i => i.type === interventionType);
    if (intervention) {
      intervention.interacted = true;
      intervention.conversionImpact = value;

      // Learn from success
      const currentSuccess = this.successPatterns.get(interventionType) || 0;
      this.successPatterns.set(interventionType, currentSuccess + value);
    }
  }
}

export const choreographer = InterventionChoreographer.getInstance();