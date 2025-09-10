/**
 * SentientIQ™ Emotional Intelligence Engine
 * 
 * This isn't analytics. This is emotional forensics.
 * We don't count clicks. We read souls.
 */

// Browser-compatible EventEmitter (no Node.js dependencies)
class EventEmitter {
  private events: { [key: string]: Array<(...args: any[]) => void> } = {};

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}

// Emotional states we detect
export enum EmotionalState {
  CURIOSITY = 'curiosity',
  FRUSTRATION = 'frustration',
  ANXIETY = 'anxiety',
  CONFIDENCE = 'confidence',
  HESITATION = 'hesitation',
  URGENCY = 'urgency',
  CONFUSION = 'confusion',
  DELIGHT = 'delight',
  RAGE = 'rage',
  ABANDONMENT = 'abandonment',
  DISCOVERY = 'discovery',
  DECISION_PARALYSIS = 'decision_paralysis'
}

// Micro-behaviors that reveal emotional states
interface MicroBehavior {
  timestamp: number;
  type: 'click' | 'move' | 'scroll' | 'hover' | 'focus' | 'blur' | 'type' | 'pause';
  intensity?: number;
  velocity?: number;
  position?: { x: number; y: number };
  target?: string;
  duration?: number;
  pattern?: string;
}

// Emotional signature - the fingerprint of feeling
interface EmotionalSignature {
  state: EmotionalState;
  confidence: number; // 0-100
  intensity: number; // 0-100
  triggers: string[];
  microBehaviors: MicroBehavior[];
  predictedAction: string;
  interventionWindow: number; // milliseconds until emotion shifts
}

export class EmotionalIntelligence extends EventEmitter {
  private behaviorBuffer: MicroBehavior[] = [];
  private emotionalHistory: EmotionalSignature[] = [];
  private currentState: EmotionalSignature | null = null;
  // private sessionStart: number = Date.now();
  private lastInteraction: number = Date.now();
  
  // Emotional pattern definitions - these are the tells
  private readonly PATTERNS = {
    RAGE_CLICK: {
      signature: (behaviors: MicroBehavior[]) => {
        const recentClicks = behaviors.filter(b => 
          b.type === 'click' && 
          Date.now() - b.timestamp < 2000
        );
        if (recentClicks.length >= 3) {
          const avgInterval = this.calculateAverageInterval(recentClicks);
          return avgInterval < 300; // Less than 300ms between clicks
        }
        return false;
      },
      emotion: EmotionalState.RAGE,
      confidence: 95
    },
    
    HESITATION_HOVER: {
      signature: (behaviors: MicroBehavior[]) => {
        const hovers = behaviors.filter(b => b.type === 'hover');
        const lastHover = hovers[hovers.length - 1];
        return lastHover && lastHover.duration! > 2000; // Hovering for 2+ seconds
      },
      emotion: EmotionalState.HESITATION,
      confidence: 75
    },
    
    SCROLL_HUNTING: {
      signature: (behaviors: MicroBehavior[]) => {
        const scrolls = behaviors.filter(b => 
          b.type === 'scroll' && 
          Date.now() - b.timestamp < 5000
        );
        if (scrolls.length >= 5) {
          // Rapid up-down scrolling indicates searching/frustration
          const directions = scrolls.map(s => s.velocity! > 0 ? 'down' : 'up');
          const changes = directions.filter((d, i) => i > 0 && d !== directions[i-1]).length;
          return changes >= 3;
        }
        return false;
      },
      emotion: EmotionalState.FRUSTRATION,
      confidence: 80
    },
    
    FORM_ANXIETY: {
      signature: (behaviors: MicroBehavior[]) => {
        const formInteractions = behaviors.filter(b => 
          (b.type === 'focus' || b.type === 'blur') &&
          Date.now() - b.timestamp < 10000
        );
        // Multiple focus/blur events on form fields = anxiety
        return formInteractions.length >= 6;
      },
      emotion: EmotionalState.ANXIETY,
      confidence: 70
    },
    
    DECISION_PARALYSIS: {
      signature: (behaviors: MicroBehavior[]) => {
        const hovers = behaviors.filter(b => 
          b.type === 'hover' && 
          b.target?.includes('button') &&
          Date.now() - b.timestamp < 15000
        );
        // Hovering over multiple CTAs without clicking
        return hovers.length >= 3 && !behaviors.some(b => b.type === 'click' && b.target?.includes('button'));
      },
      emotion: EmotionalState.DECISION_PARALYSIS,
      confidence: 85
    },
    
    DELIGHT_DISCOVERY: {
      signature: (behaviors: MicroBehavior[]) => {
        const scrolls = behaviors.filter(b => b.type === 'scroll');
        if (scrolls.length >= 2) {
          // Smooth, consistent downward scrolling = engaged reading
          const avgVelocity = scrolls.reduce((sum, s) => sum + Math.abs(s.velocity!), 0) / scrolls.length;
          return avgVelocity > 50 && avgVelocity < 200;
        }
        return false;
      },
      emotion: EmotionalState.DISCOVERY,
      confidence: 65
    }
  };

  constructor() {
    super();
    this.startCapture();
  }

  private startCapture() {
    if (typeof window === 'undefined') return;

    // Click patterns reveal frustration, confidence, rage
    document.addEventListener('click', (e) => {
      this.recordBehavior({
        timestamp: Date.now(),
        type: 'click',
        position: { x: e.clientX, y: e.clientY },
        target: (e.target as HTMLElement).tagName + '.' + (e.target as HTMLElement).className,
        intensity: this.calculateClickIntensity(e)
      });
    });

    // Mouse movements reveal hesitation, exploration, confusion
    let lastMouseMove = 0;
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMouseMove > 100) { // Throttle to 10Hz
        this.recordBehavior({
          timestamp: now,
          type: 'move',
          position: { x: e.clientX, y: e.clientY },
          velocity: this.calculateMouseVelocity(e)
        });
        lastMouseMove = now;
      }
    });

    // Scroll patterns reveal engagement, frustration, scanning
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const now = Date.now();
      if (now - lastScroll > 200) { // Throttle scroll events
        this.recordBehavior({
          timestamp: now,
          type: 'scroll',
          velocity: window.scrollY - lastScroll,
          position: { x: window.scrollX, y: window.scrollY }
        });
        lastScroll = window.scrollY;
      }
    });

    // Hover duration reveals interest, hesitation
    let hoverTarget: EventTarget | null = null;
    let hoverStart = 0;
    
    document.addEventListener('mouseenter', (e) => {
      hoverTarget = e.target;
      hoverStart = Date.now();
    }, true);

    document.addEventListener('mouseleave', (e) => {
      if (hoverTarget === e.target) {
        this.recordBehavior({
          timestamp: Date.now(),
          type: 'hover',
          target: (e.target as HTMLElement).tagName,
          duration: Date.now() - hoverStart
        });
      }
    }, true);

    // Form interactions reveal anxiety, confidence
    document.addEventListener('focus', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        this.recordBehavior({
          timestamp: Date.now(),
          type: 'focus',
          target: (e.target as HTMLInputElement).name || (e.target as HTMLElement).id || ''
        });
      }
    }, true);

    document.addEventListener('blur', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        this.recordBehavior({
          timestamp: Date.now(),
          type: 'blur',
          target: (e.target as HTMLInputElement).name || (e.target as HTMLElement).id || ''
        });
      }
    }, true);

    // Typing patterns reveal confidence, frustration
    let lastKeypress = 0;
    document.addEventListener('keypress', () => {
      const now = Date.now();
      const interval = now - lastKeypress;
      if (interval > 50 && interval < 5000) { // Normal typing range
        this.recordBehavior({
          timestamp: now,
          type: 'type',
          velocity: 60000 / interval // WPM approximation
        });
      }
      lastKeypress = now;
    });

    // Start analysis loop
    setInterval(() => this.analyzeEmotionalState(), 500);
  }

  private recordBehavior(behavior: MicroBehavior) {
    this.behaviorBuffer.push(behavior);
    this.lastInteraction = Date.now(); // Track for idle detection
    
    // Keep only last 100 behaviors in buffer
    if (this.behaviorBuffer.length > 100) {
      this.behaviorBuffer.shift();
    }
  }

  private analyzeEmotionalState() {
    if (this.behaviorBuffer.length < 3) return;

    // Check each pattern
    for (const [patternName, pattern] of Object.entries(this.PATTERNS)) {
      if (pattern.signature(this.behaviorBuffer)) {
        const signature: EmotionalSignature = {
          state: pattern.emotion,
          confidence: pattern.confidence,
          intensity: this.calculateIntensity(),
          triggers: [patternName],
          microBehaviors: [...this.behaviorBuffer.slice(-10)], // Last 10 behaviors
          predictedAction: this.predictNextAction(pattern.emotion),
          interventionWindow: this.calculateInterventionWindow(pattern.emotion)
        };

        this.updateEmotionalState(signature);
        break;
      }
    }
  }

  private updateEmotionalState(signature: EmotionalSignature) {
    const previousState = this.currentState?.state;
    this.currentState = signature;
    this.emotionalHistory.push(signature);

    // Emit state change event
    if (previousState !== signature.state) {
      this.emit('stateChange', {
        from: previousState,
        to: signature.state,
        confidence: signature.confidence,
        predictedAction: signature.predictedAction
      });

      // Emit intervention opportunity
      if (signature.confidence > 70) {
        this.emit('interventionOpportunity', {
          state: signature.state,
          window: signature.interventionWindow,
          suggestedAction: this.getSuggestedIntervention(signature.state)
        });
      }
    }

    // Track high-confidence emotional moments
    if (signature.confidence > 85) {
      this.emit('highConfidenceEmotion', signature);
    }
  }

  private calculateClickIntensity(event: MouseEvent): number {
    // Factors: speed between clicks, force (if available), movement distance
    const recentClicks = this.behaviorBuffer.filter(b => 
      b.type === 'click' && Date.now() - b.timestamp < 1000
    );
    
    if (recentClicks.length > 0) {
      const lastClick = recentClicks[recentClicks.length - 1];
      const timeDelta = Date.now() - lastClick.timestamp;
      const distance = Math.sqrt(
        Math.pow(event.clientX - lastClick.position!.x, 2) +
        Math.pow(event.clientY - lastClick.position!.y, 2)
      );
      
      // Faster clicks with less movement = higher intensity (frustration)
      return Math.min(100, (1000 / timeDelta) * (100 / (distance + 100)) * 20);
    }
    
    return 50; // Baseline intensity
  }

  private calculateMouseVelocity(event: MouseEvent): number {
    const recentMoves = this.behaviorBuffer.filter(b => 
      b.type === 'move' && Date.now() - b.timestamp < 500
    );
    
    if (recentMoves.length > 0) {
      const lastMove = recentMoves[recentMoves.length - 1];
      const timeDelta = Date.now() - lastMove.timestamp;
      const distance = Math.sqrt(
        Math.pow(event.clientX - lastMove.position!.x, 2) +
        Math.pow(event.clientY - lastMove.position!.y, 2)
      );
      
      return distance / timeDelta * 1000; // pixels per second
    }
    
    return 0;
  }

  private calculateAverageInterval(behaviors: MicroBehavior[]): number {
    if (behaviors.length < 2) return Infinity;
    
    let totalInterval = 0;
    for (let i = 1; i < behaviors.length; i++) {
      totalInterval += behaviors[i].timestamp - behaviors[i-1].timestamp;
    }
    
    return totalInterval / (behaviors.length - 1);
  }

  private calculateIntensity(): number {
    // Intensity based on interaction frequency and variety
    const recentBehaviors = this.behaviorBuffer.filter(b => 
      Date.now() - b.timestamp < 5000
    );
    
    const frequency = recentBehaviors.length / 5; // behaviors per second
    const variety = new Set(recentBehaviors.map(b => b.type)).size;
    
    return Math.min(100, frequency * 10 * variety);
  }

  private predictNextAction(emotion: EmotionalState): string {
    const predictions: Record<EmotionalState, string> = {
      [EmotionalState.RAGE]: 'abandon_session',
      [EmotionalState.FRUSTRATION]: 'seek_help',
      [EmotionalState.ANXIETY]: 'abandon_form',
      [EmotionalState.HESITATION]: 'compare_options',
      [EmotionalState.CURIOSITY]: 'explore_more',
      [EmotionalState.CONFIDENCE]: 'complete_action',
      [EmotionalState.URGENCY]: 'quick_decision',
      [EmotionalState.CONFUSION]: 'seek_clarification',
      [EmotionalState.DELIGHT]: 'share_experience',
      [EmotionalState.ABANDONMENT]: 'leave_site',
      [EmotionalState.DISCOVERY]: 'deep_engagement',
      [EmotionalState.DECISION_PARALYSIS]: 'defer_decision'
    };
    
    return predictions[emotion] || 'continue_browsing';
  }

  private calculateInterventionWindow(emotion: EmotionalState): number {
    // How long before the emotion leads to action (milliseconds)
    const windows: Record<EmotionalState, number> = {
      [EmotionalState.RAGE]: 3000, // 3 seconds before rage quit
      [EmotionalState.FRUSTRATION]: 10000, // 10 seconds
      [EmotionalState.ANXIETY]: 15000, // 15 seconds
      [EmotionalState.HESITATION]: 8000, // 8 seconds
      [EmotionalState.CURIOSITY]: 30000, // 30 seconds of exploration
      [EmotionalState.CONFIDENCE]: 20000, // 20 seconds to conversion
      [EmotionalState.URGENCY]: 5000, // 5 seconds
      [EmotionalState.CONFUSION]: 12000, // 12 seconds
      [EmotionalState.DELIGHT]: 60000, // 1 minute of engagement
      [EmotionalState.ABANDONMENT]: 2000, // 2 seconds
      [EmotionalState.DISCOVERY]: 45000, // 45 seconds
      [EmotionalState.DECISION_PARALYSIS]: 25000 // 25 seconds
    };
    
    return windows[emotion] || 10000;
  }

  private getSuggestedIntervention(emotion: EmotionalState): string {
    const interventions: Record<EmotionalState, string> = {
      [EmotionalState.RAGE]: 'show_instant_help_chat',
      [EmotionalState.FRUSTRATION]: 'simplify_interface',
      [EmotionalState.ANXIETY]: 'show_trust_signals',
      [EmotionalState.HESITATION]: 'display_social_proof',
      [EmotionalState.CURIOSITY]: 'reveal_more_content',
      [EmotionalState.CONFIDENCE]: 'streamline_checkout',
      [EmotionalState.URGENCY]: 'show_availability',
      [EmotionalState.CONFUSION]: 'provide_tooltip',
      [EmotionalState.DELIGHT]: 'offer_share_incentive',
      [EmotionalState.ABANDONMENT]: 'trigger_exit_intent',
      [EmotionalState.DISCOVERY]: 'suggest_related_content',
      [EmotionalState.DECISION_PARALYSIS]: 'reduce_choices'
    };
    
    return interventions[emotion] || 'maintain_current_state';
  }

  // Public API
  public getCurrentEmotionalState(): EmotionalSignature | null {
    return this.currentState;
  }

  public getIdleTime(): number {
    // Returns milliseconds since last interaction
    return Date.now() - this.lastInteraction;
  }

  public getEmotionalJourney(): EmotionalSignature[] {
    return this.emotionalHistory;
  }

  public getEmotionalVelocity(): number {
    // How quickly emotions are changing
    if (this.emotionalHistory.length < 2) return 0;
    
    const recentStates = this.emotionalHistory.slice(-5);
    const uniqueStates = new Set(recentStates.map(s => s.state)).size;
    const timeSpan = recentStates[recentStates.length - 1].microBehaviors[0].timestamp - 
                     recentStates[0].microBehaviors[0].timestamp;
    
    return uniqueStates / (timeSpan / 60000); // state changes per minute
  }

  public getSessionEmotionalProfile(): Record<EmotionalState, number> {
    const profile: Partial<Record<EmotionalState, number>> = {};
    
    for (const signature of this.emotionalHistory) {
      profile[signature.state] = (profile[signature.state] || 0) + 1;
    }
    
    return profile as Record<EmotionalState, number>;
  }

  public getPredictedConversionProbability(): number {
    if (!this.currentState) return 50;
    
    const positiveStates = [
      EmotionalState.CONFIDENCE,
      EmotionalState.CURIOSITY,
      EmotionalState.DELIGHT,
      EmotionalState.DISCOVERY,
      EmotionalState.URGENCY
    ];
    
    const negativeStates = [
      EmotionalState.RAGE,
      EmotionalState.FRUSTRATION,
      EmotionalState.ANXIETY,
      EmotionalState.CONFUSION,
      EmotionalState.ABANDONMENT
    ];
    
    let score = 50; // baseline
    
    if (positiveStates.includes(this.currentState.state)) {
      score += this.currentState.confidence * 0.5;
    } else if (negativeStates.includes(this.currentState.state)) {
      score -= this.currentState.confidence * 0.5;
    }
    
    // Factor in emotional velocity (stability is good)
    const velocity = this.getEmotionalVelocity();
    if (velocity < 2) score += 10; // Stable emotions
    if (velocity > 5) score -= 20; // Chaotic emotions
    
    return Math.max(0, Math.min(100, score));
  }
}

// Singleton instance
let instance: EmotionalIntelligence | null = null;

export function getEmotionalIntelligence(): EmotionalIntelligence {
  if (!instance && typeof window !== 'undefined') {
    instance = new EmotionalIntelligence();
  }
  return instance!;
}

// React hook for emotional intelligence
export function useEmotionalIntelligence() {
  const [emotionalState, setEmotionalState] = useState<EmotionalSignature | null>(null);
  const [conversionProbability, setConversionProbability] = useState(50);
  
  useEffect(() => {
    const ei = getEmotionalIntelligence();
    
    const handleStateChange = (_change: any) => {
      setEmotionalState(ei.getCurrentEmotionalState());
      setConversionProbability(ei.getPredictedConversionProbability());
    };
    
    ei.on('stateChange', handleStateChange);
    
    // Update every second
    const interval = setInterval(() => {
      setConversionProbability(ei.getPredictedConversionProbability());
    }, 1000);
    
    return () => {
      ei.off('stateChange', handleStateChange);
      clearInterval(interval);
    };
  }, []);
  
  return {
    emotionalState,
    conversionProbability,
    journey: instance?.getEmotionalJourney() || [],
    profile: instance?.getSessionEmotionalProfile() || {}
  };
}

// For Next.js/React
import { useState, useEffect } from 'react';
export default EmotionalIntelligence;