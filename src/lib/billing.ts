import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe (client-side)
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
);

// Subscription tiers
export const TIERS = {
  FREE: 'free',
  PRO: 'pro', 
  TEAM: 'team',
  ENTERPRISE: 'enterprise'
} as const;

export type Tier = typeof TIERS[keyof typeof TIERS];

// Usage limits by tier
export const LIMITS = {
  [TIERS.FREE]: {
    questionsPerMonth: 20,
    eviDelayMinutes: 60,
    teamSeats: 1,
    apiCallsPerMonth: 0,
    features: {
      basicWhy: true,
      fullWhy: false,
      consensusMeter: false,
      apiAccess: false,
      slackIntegration: false,
      csvExport: false,
      prioritySupport: false,
    }
  },
  [TIERS.PRO]: {
    questionsPerMonth: -1, // unlimited
    eviDelayMinutes: 0,    // live
    teamSeats: 1,
    apiCallsPerMonth: 0,
    features: {
      basicWhy: true,
      fullWhy: true,
      consensusMeter: true,
      apiAccess: false,
      slackIntegration: false,
      csvExport: true,
      prioritySupport: true,
    }
  },
  [TIERS.TEAM]: {
    questionsPerMonth: -1,
    eviDelayMinutes: 0,
    teamSeats: 10,
    apiCallsPerMonth: 1000,
    features: {
      basicWhy: true,
      fullWhy: true,
      consensusMeter: true,
      apiAccess: true,
      slackIntegration: true,
      csvExport: true,
      prioritySupport: true,
    }
  },
  [TIERS.ENTERPRISE]: {
    questionsPerMonth: -1,
    eviDelayMinutes: 0,
    teamSeats: -1, // unlimited
    apiCallsPerMonth: -1,
    features: {
      basicWhy: true,
      fullWhy: true,
      consensusMeter: true,
      apiAccess: true,
      slackIntegration: true,
      csvExport: true,
      prioritySupport: true,
    }
  }
};

// Check if user can perform action based on their tier
export function canUserPerformAction(
  userTier: Tier,
  action: keyof typeof LIMITS.free.features
): boolean {
  return LIMITS[userTier]?.features[action] || false;
}

// Get user's current usage (this would come from your database)
export async function getUserUsage(_userId: string) {
  // TODO: Fetch from your database
  // For now, return mock data
  return {
    questionsThisMonth: 5,
    apiCallsThisMonth: 0,
    lastResetDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  };
}

// Check if user has exceeded their limits
export async function checkUsageLimits(userId: string, userTier: Tier) {
  const usage = await getUserUsage(userId);
  const limits = LIMITS[userTier];
  
  if (limits.questionsPerMonth > 0 && usage.questionsThisMonth >= limits.questionsPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.questionsPerMonth} questions. Upgrade to Pro for unlimited access.`,
      remainingQuestions: 0
    };
  }
  
  return {
    allowed: true,
    remainingQuestions: limits.questionsPerMonth > 0 
      ? limits.questionsPerMonth - usage.questionsThisMonth
      : -1
  };
}

// Format price for display
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}