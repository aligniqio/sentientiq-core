/**
 * Emotional State Types
 *
 * Clean interfaces for emotional data flow between services.
 * behavior-processor → intervention-engine → unified-websocket
 */

export interface EmotionalState {
  sessionId: string;
  tenantId: string;
  timestamp: number;

  // Core emotional reading
  emotion: string;
  confidence: number;
  intensity: number;

  // Emotional vectors (0-100)
  frustration?: number;
  excitement?: number;
  trust?: number;
  anxiety?: number;
  urgency?: number;
  fatigue?: number;

  // Context
  pageUrl?: string;
  userId?: string;
  userTier?: 'free' | 'premium' | 'enterprise';
  sessionAge: number;

  // Raw telemetry that led to this emotion
  telemetry?: {
    mouseVelocity?: number;
    scrollDepth?: number;
    hoverDuration?: number;
    clickRate?: number;
  };
}

export interface EmotionalPattern {
  type: string;
  emotions: string[];
  confidence: number;
  detectedAt: number;
  metadata?: Record<string, any>;
}

export interface EmotionalSession {
  sessionId: string;
  tenantId: string;
  startTime: number;
  lastActivity: number;

  // Current state
  currentEmotion: string;
  emotionalVectors: {
    frustration: number;
    excitement: number;
    trust: number;
    anxiety: number;
    urgency: number;
    fatigue: number;
  };

  // History
  emotionHistory: EmotionalState[];
  patternHistory: EmotionalPattern[];

  // Intervention tracking
  interventionsSent: string[];
  interventionCooldowns: Map<string, number>;
  interventionFatigue: number;
}

export interface InterventionDecision {
  sessionId: string;
  interventionType: string;
  reason: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timing: 'immediate' | 'delayed' | 'optimal';
  delayMs?: number;
}