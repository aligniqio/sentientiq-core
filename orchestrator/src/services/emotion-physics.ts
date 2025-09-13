/**
 * Emotional Physics Engine - Server Side
 * 
 * Porting detect-v4.js behavioral physics to server for validation,
 * enrichment, and real-time intervention decisions.
 * 
 * NO BULLSHIT. NO RANDOM. JUST PHYSICS.
 */

import { EventEmitter } from 'events';
import { connect, NatsConnection, JetStreamClient, KV } from 'nats';
import { identityService } from './identity-resolution.js';
import { interventionEngine } from './intervention-engine.js';
import type { SectionEmotionConfig } from '../types.js';

// Physics constants - same as detect-v4.js
const PHYSICS_CONSTANTS = {
  RAGE_VELOCITY_THRESHOLD: 800,
  RAGE_ACCELERATION: 500,
  CONFIDENCE_VELOCITY_MAX: 300,
  CONFUSION_DIRECTION_CHANGES: 3,
  HESITATION_PAUSE_MS: 1500,
  ABANDONMENT_EXIT_VELOCITY: 1000,
  SCROLL_SAMPLE_RATE: 50, // ms
  VELOCITY_DECAY: 0.95,
  JERK_THRESHOLD: 1000, // Rate of acceleration change
  ENTROPY_WINDOW: 10, // samples for chaos calculation
};

// Section-specific emotional contexts from v4
const SECTION_EMOTIONS: SectionEmotionConfig = {
  hero: {
    emotions: {
      'curiosity': { minConfidence: 70, dollarImpact: 0 },
      'skepticism': { minConfidence: 65, dollarImpact: -0.1 },
      'intrigue': { minConfidence: 75, dollarImpact: 0.05 },
      'immediate_bounce_risk': { minConfidence: 85, dollarImpact: -0.8 }
    }
  },
  demo: {
    emotions: {
      'engagement': { minConfidence: 80, dollarImpact: 0.2 },
      'understanding': { minConfidence: 75, dollarImpact: 0.15 },
      'confusion': { minConfidence: 70, dollarImpact: -0.3 },
      'delight': { minConfidence: 85, dollarImpact: 0.4 },
      'technical_overwhelm': { minConfidence: 65, dollarImpact: -0.5 }
    }
  },
  pricing: {
    emotions: {
      'price_evaluation': { minConfidence: 85, dollarImpact: 0 },
      'sticker_shock': { minConfidence: 90, dollarImpact: -0.7 },
      'value_comparison': { minConfidence: 85, dollarImpact: 0.1 },
      'purchase_intent': { minConfidence: 90, dollarImpact: 0.8 },
      'budget_concern': { minConfidence: 75, dollarImpact: -0.4 },
      'tier_confusion': { minConfidence: 70, dollarImpact: -0.3 }
    }
  },
  testimonials: {
    emotions: {
      'trust_building': { minConfidence: 75, dollarImpact: 0.3 },
      'skepticism': { minConfidence: 65, dollarImpact: -0.2 },
      'validation': { minConfidence: 80, dollarImpact: 0.4 },
      'social_proof_fatigue': { minConfidence: 60, dollarImpact: -0.1 }
    }
  },
  contact: {
    emotions: {
      'commitment_ready': { minConfidence: 85, dollarImpact: 0.9 },
      'last_minute_hesitation': { minConfidence: 80, dollarImpact: -0.6 },
      'trust_verification': { minConfidence: 70, dollarImpact: 0 },
      'submission_confidence': { minConfidence: 95, dollarImpact: 1.0 }
    }
  }
};

export interface PhysicsEvent {
  sessionId: string;
  userId: string;
  timestamp: number;
  section: string;
  motion: {
    mouseX: number;
    mouseY: number;
    scrollY: number;
    velocity: number;
    acceleration: number;
    jerk?: number;
    entropy?: number;
  };
  interactions: {
    clicks: Array<{ x: number; y: number; element: string; time: number }>;
    hovers: Array<{ element: string; duration: number }>;
    scrolls: Array<{ position: number; velocity: number; time: number }>;
  };
}

export interface EmotionalState {
  sessionId: string;
  userId: string;
  email?: string;
  company?: string;
  ltv: number;
  currentEmotion: string;
  confidence: number;
  section: string;
  physics: {
    velocity: number;
    acceleration: number;
    jerk: number;
    entropy: number;
  };
  dollarValue: number; // What this emotion costs/gains
  interventionNeeded: boolean;
  interventionPriority: 'low' | 'medium' | 'high' | 'critical';
}

class EmotionPhysicsEngine extends EventEmitter {
  private nats: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private kv: KV | null = null;
  private sessions: Map<string, SessionPhysics> = new Map();
  private interventionThresholds = {
    critical: 10000, // $10k+ customers
    high: 5000,
    medium: 1000,
    low: 0
  };

  constructor() {
    super();
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.nats = await connect({ 
        servers: process.env.NATS_URL || 'nats://localhost:4222',
        name: 'emotion-physics-engine'
      });
      
      this.js = this.nats.jetstream();
      
      // KV store for session state (replaces Redis)
      this.kv = await this.js.views.kv('emotional_states', {
        ttl: 3600 * 1000, // 1 hour TTL
        history: 10
      });
      
      console.log('✅ Emotion Physics Engine connected to NATS');
    } catch (error) {
      console.error('Failed to connect to NATS:', error);
    }
  }

  /**
   * Process incoming physics event and determine emotional state
   */
  async processPhysicsEvent(event: PhysicsEvent): Promise<EmotionalState | null> {
    // Get or create session physics
    let session = this.sessions.get(event.sessionId);
    if (!session) {
      session = new SessionPhysics(event.sessionId, event.userId);
      this.sessions.set(event.sessionId, session);
    }

    // Update physics calculations
    session.updatePhysics(event);

    // Get user identity for value calculation
    const identity = await identityService.getIdentity(event.sessionId);
    if (!identity || !identity.userId) {
      // No intervention without identity
      return null;
    }

    // Detect emotion based on physics + section context
    const emotion = this.detectEmotion(session, event.section);
    if (!emotion) {
      return null;
    }

    // Calculate dollar impact
    const dollarValue = this.calculateDollarImpact(emotion, identity.value || 0, event.section);

    // Determine intervention priority
    const priority = this.getInterventionPriority(identity.value || 0, emotion.confidence);

    const emotionalState: EmotionalState = {
      sessionId: event.sessionId,
      userId: identity.userId,
      email: identity.email,
      company: identity.company,
      ltv: identity.value || 0,
      currentEmotion: emotion.type,
      confidence: emotion.confidence,
      section: event.section,
      physics: {
        velocity: session.velocity,
        acceleration: session.acceleration,
        jerk: session.jerk,
        entropy: session.entropy
      },
      dollarValue,
      interventionNeeded: Math.abs(dollarValue) > 0.3 && emotion.confidence > 80,
      interventionPriority: priority
    };

    // Store in NATS KV (replaces Redis)
    if (this.kv) {
      await this.kv.put(
        `state:${event.sessionId}`,
        JSON.stringify(emotionalState)
      );
    }

    // Emit for real-time processing
    this.emit('emotional:state', emotionalState);

    // Trigger intervention if needed
    if (emotionalState.interventionNeeded && emotionalState.ltv > 1000) {
      await this.triggerIntervention(emotionalState);
    }

    return emotionalState;
  }

  /**
   * Detect emotion based on physics patterns
   */
  private detectEmotion(session: SessionPhysics, section: string): { type: string; confidence: number } | null {
    const sectionEmotions = SECTION_EMOTIONS[section];
    if (!sectionEmotions) {
      return null;
    }

    // RAGE DETECTION - Universal across sections
    if (session.velocity > PHYSICS_CONSTANTS.RAGE_VELOCITY_THRESHOLD &&
        session.acceleration > PHYSICS_CONSTANTS.RAGE_ACCELERATION) {
      return { type: 'rage', confidence: 95 };
    }

    // ABANDONMENT DETECTION - High exit velocity
    if (session.mouseGone && session.lastVelocity > PHYSICS_CONSTANTS.ABANDONMENT_EXIT_VELOCITY) {
      return { type: 'abandonment_risk', confidence: 90 };
    }

    // CONFUSION DETECTION - Chaotic movement
    if (session.directionChanges >= PHYSICS_CONSTANTS.CONFUSION_DIRECTION_CHANGES &&
        session.entropy > 0.7) {
      return { type: 'confusion', confidence: 80 };
    }

    // Section-specific emotions
    for (const [emotionType, config] of Object.entries(sectionEmotions.emotions)) {
      if (this.matchesEmotionPattern(session, emotionType, section)) {
        return { 
          type: emotionType, 
          confidence: (config as any).minConfidence 
        };
      }
    }

    return null;
  }

  /**
   * Match specific emotion patterns
   */
  private matchesEmotionPattern(session: SessionPhysics, emotion: string, section: string): boolean {
    // Section-specific pattern matching
    switch (section) {
      case 'pricing':
        if (emotion === 'sticker_shock') {
          return session.mouseRecoil && session.velocity > 600;
        }
        if (emotion === 'purchase_intent') {
          return session.hoverDuration > 2000 && session.velocity < 200;
        }
        if (emotion === 'tier_confusion') {
          return session.backForthCount > 3 && session.entropy > 0.6;
        }
        break;
        
      case 'demo':
        if (emotion === 'engagement') {
          return session.interactionCount > 3 && session.velocity < 300;
        }
        if (emotion === 'delight') {
          return session.positiveAcceleration && session.interactionCount > 5;
        }
        break;
        
      case 'hero':
        if (emotion === 'immediate_bounce_risk') {
          return session.timeInSection < 2000 && session.velocity > 700;
        }
        if (emotion === 'curiosity') {
          return session.slowRead && session.hoverCount > 2;
        }
        break;
    }
    
    return false;
  }

  /**
   * Calculate dollar impact of emotion
   */
  private calculateDollarImpact(
    emotion: { type: string; confidence: number },
    userLTV: number,
    section: string
  ): number {
    const sectionEmotions = SECTION_EMOTIONS[section as keyof typeof SECTION_EMOTIONS];
    if (!sectionEmotions) return 0;

    const emotionConfig = sectionEmotions.emotions[emotion.type as keyof typeof sectionEmotions.emotions] as any;
    if (!emotionConfig) return 0;

    // Base impact from emotion type
    const baseImpact = emotionConfig.dollarImpact || 0;
    
    // Scale by confidence
    const confidenceMultiplier = emotion.confidence / 100;
    
    // Scale by user value
    return userLTV * baseImpact * confidenceMultiplier;
  }

  /**
   * Determine intervention priority based on user value
   */
  private getInterventionPriority(userLTV: number, confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: High-value customer with high-confidence negative emotion
    if (userLTV >= this.interventionThresholds.critical && confidence > 85) {
      return 'critical';
    }
    
    if (userLTV >= this.interventionThresholds.high && confidence > 80) {
      return 'high';
    }
    
    if (userLTV >= this.interventionThresholds.medium && confidence > 75) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Trigger intervention based on emotional state
   */
  private async triggerIntervention(state: EmotionalState): Promise<void> {
    const startTime = Date.now();
    
    // Process through intervention engine
    await interventionEngine.processEmotionalEvent({
      sessionId: state.sessionId,
      userId: state.userId,
      emotion: state.currentEmotion,
      confidence: state.confidence,
      pageUrl: `/${state.section}`,
      predictedAction: this.predictAction(state),
      interventionWindow: 5000
    });
    
    const processingTime = Date.now() - startTime;
    
    // Log if we exceed 300ms target
    if (processingTime > 300) {
      console.warn(`⚠️ Intervention processing exceeded 300ms: ${processingTime}ms for ${state.userId}`);
    }
    
    // Emit metrics
    this.emit('intervention:triggered', {
      userId: state.userId,
      emotion: state.currentEmotion,
      value: state.ltv,
      processingTime,
      priority: state.interventionPriority
    });
  }

  /**
   * Predict user's next action based on physics
   */
  private predictAction(state: EmotionalState): string {
    const { currentEmotion, physics, section } = state;
    
    // High velocity + negative emotion = likely exit
    if (physics.velocity > 700 && ['rage', 'frustration', 'abandonment_risk'].includes(currentEmotion)) {
      return 'exit_imminent';
    }
    
    // Slow velocity + positive emotion in pricing = likely purchase
    if (section === 'pricing' && physics.velocity < 200 && currentEmotion === 'purchase_intent') {
      return 'purchase_likely';
    }
    
    // High entropy = confusion, needs help
    if (physics.entropy > 0.7) {
      return 'assistance_needed';
    }
    
    return 'monitoring';
  }

  /**
   * Get real-time statistics
   */
  getStats(): any {
    const stats = {
      activeSessions: this.sessions.size,
      sessionsWithIdentity: 0,
      highValueSessions: 0,
      criticalEmotions: 0,
      averageConfidence: 0,
      totalDollarAtRisk: 0
    };
    
    for (const [sessionId, session] of this.sessions) {
      if (session.userId) {
        stats.sessionsWithIdentity++;
      }
      if (session.ltv > 10000) {
        stats.highValueSessions++;
      }
      if (session.lastEmotion && session.lastEmotion.confidence && session.lastEmotion.confidence > 85) {
        stats.criticalEmotions++;
      }
      stats.averageConfidence += session.lastEmotion?.confidence || 0;
      stats.totalDollarAtRisk += Math.abs(session.lastDollarImpact || 0);
    }
    
    stats.averageConfidence /= this.sessions.size || 1;
    
    return stats;
  }
}

/**
 * Session-specific physics tracking
 */
class SessionPhysics {
  sessionId: string;
  userId: string;
  ltv: number = 0;
  
  // Position tracking
  mouseX: number = 0;
  mouseY: number = 0;
  scrollY: number = 0;
  
  // Velocity & acceleration
  velocity: number = 0;
  acceleration: number = 0;
  jerk: number = 0;
  lastVelocity: number = 0;
  
  // Movement patterns
  directionChanges: number = 0;
  backForthCount: number = 0;
  entropy: number = 0;
  velocityHistory: number[] = [];
  
  // Interaction tracking
  interactionCount: number = 0;
  hoverCount: number = 0;
  hoverDuration: number = 0;
  timeInSection: number = 0;
  sectionStartTime: number = Date.now();
  
  // State flags
  mouseGone: boolean = false;
  mouseRecoil: boolean = false;
  slowRead: boolean = false;
  positiveAcceleration: boolean = false;
  
  // Emotional state
  lastEmotion: { type: string; confidence: number } | null = null;
  lastDollarImpact: number = 0;
  
  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
  }
  
  updatePhysics(event: PhysicsEvent): void {
    const deltaX = event.motion.mouseX - this.mouseX;
    const deltaY = event.motion.mouseY - this.mouseY;
    const deltaTime = 50; // ms between samples
    
    // Calculate velocity
    this.lastVelocity = this.velocity;
    this.velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime * 1000;
    
    // Calculate acceleration
    const lastAcceleration = this.acceleration;
    this.acceleration = (this.velocity - this.lastVelocity) / deltaTime * 1000;
    
    // Calculate jerk (rate of acceleration change)
    this.jerk = (this.acceleration - lastAcceleration) / deltaTime * 1000;
    
    // Track velocity history for entropy calculation
    this.velocityHistory.push(this.velocity);
    if (this.velocityHistory.length > PHYSICS_CONSTANTS.ENTROPY_WINDOW) {
      this.velocityHistory.shift();
    }
    
    // Calculate entropy (chaos in movement)
    this.entropy = this.calculateEntropy();
    
    // Detect patterns
    this.detectPatterns(deltaX, deltaY);
    
    // Update position
    this.mouseX = event.motion.mouseX;
    this.mouseY = event.motion.mouseY;
    this.scrollY = event.motion.scrollY;
    
    // Update interaction counts
    this.interactionCount = event.interactions.clicks.length + event.interactions.hovers.length;
    this.hoverCount = event.interactions.hovers.length;
    this.hoverDuration = event.interactions.hovers.reduce((sum, h) => sum + h.duration, 0);
    
    // Update time in section
    this.timeInSection = Date.now() - this.sectionStartTime;
  }
  
  private calculateEntropy(): number {
    if (this.velocityHistory.length < 2) return 0;
    
    // Calculate variance in velocity (measure of chaos)
    const mean = this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length;
    const variance = this.velocityHistory.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / this.velocityHistory.length;
    
    // Normalize to 0-1 range
    return Math.min(1, variance / 1000000);
  }
  
  private detectPatterns(deltaX: number, deltaY: number): void {
    // Direction change detection
    if (Math.sign(deltaX) !== Math.sign(this.mouseX) || Math.sign(deltaY) !== Math.sign(this.mouseY)) {
      this.directionChanges++;
    }
    
    // Back-forth detection
    if (Math.abs(deltaX) > 100 && Math.sign(deltaX) !== Math.sign(this.mouseX)) {
      this.backForthCount++;
    }
    
    // Mouse recoil (sudden backward movement)
    if (this.velocity > 600 && deltaY < -50) {
      this.mouseRecoil = true;
    }
    
    // Slow read pattern
    if (this.velocity < 100 && this.velocity > 10) {
      this.slowRead = true;
    }
    
    // Positive acceleration (building excitement)
    if (this.acceleration > 100 && this.velocity < 500) {
      this.positiveAcceleration = true;
    }
  }
}

// Singleton instance
export const emotionPhysicsEngine = new EmotionPhysicsEngine();

export default emotionPhysicsEngine;