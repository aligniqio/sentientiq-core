/**
 * Global TypeScript type definitions for the orchestrator project
 */

import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  isAdmin?: boolean;
  isSuper?: boolean;
  clerkId?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  tier?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface EmotionWeights {
  [key: string]: number;
  rage: number;
  frustration: number;
  confusion: number;
  dead_link: number;
  skepticism: number;
  sticker_shock: number;
  confidence: number;
  delight: number;
  exploration: number;
  purchase_intent: number;
  abandonment_risk?: number;
  hesitation?: number;
  engagement?: number;
  evaluation?: number;
}

export interface InterventionWeights {
  [key: string]: number;
  sms_ceo: number;
  chat_immediate: number;
  discount_offer: number;
  email_followup: number;
  ui_change: number;
  no_intervention: number;
}

export interface SectionEmotionConfig {
  [sectionName: string]: {
    emotions: {
      [emotionName: string]: {
        minConfidence: number;
        dollarImpact: number;
      };
    };
  };
}