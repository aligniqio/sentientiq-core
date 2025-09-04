import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Tier, TIERS, checkUsageLimits, getUserUsage } from '../lib/billing';

interface SubscriptionData {
  tier: Tier;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null;
  currentPeriodEnd: Date | null;
  questionsUsed: number;
  questionsLimit: number;
  canAsk: boolean;
  canAccessEvi: boolean;
  canExport: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionData {
  const { user, isSignedIn } = useUser();
  const [data, setData] = useState<SubscriptionData>({
    tier: TIERS.FREE,
    status: null,
    currentPeriodEnd: null,
    questionsUsed: 0,
    questionsLimit: 20,
    canAsk: true,
    canAccessEvi: true,
    canExport: false,
    loading: true,
  });

  useEffect(() => {
    async function fetchSubscription() {
      if (!isSignedIn || !user) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Get subscription from user metadata (set by webhook)
        const tier = (user.publicMetadata?.tier as Tier) || TIERS.FREE;
        const subscriptionStatus = user.publicMetadata?.subscriptionStatus as string;
        
        // Get current usage
        const usage = await getUserUsage(user.id);
        const limits = await checkUsageLimits(user.id, tier);
        
        setData({
          tier,
          status: subscriptionStatus as any || null,
          currentPeriodEnd: user.publicMetadata?.currentPeriodEnd 
            ? new Date(user.publicMetadata.currentPeriodEnd as string)
            : null,
          questionsUsed: usage.questionsThisMonth,
          questionsLimit: tier === TIERS.FREE ? 20 : -1,
          canAsk: limits.allowed,
          canAccessEvi: true, // Everyone can access, but with delays for free
          canExport: tier !== TIERS.FREE,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    }

    fetchSubscription();
  }, [user, isSignedIn]);

  return data;
}

// Hook to track and update usage
export function useTrackUsage() {
  const { user } = useUser();

  const trackQuestion = async () => {
    if (!user) return;

    try {
      // In production, this would update your database
      await fetch('/api/usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'question',
        }),
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  };

  const trackApiCall = async () => {
    if (!user) return;

    try {
      await fetch('/api/usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'api_call',
        }),
      });
    } catch (error) {
      console.error('Error tracking API usage:', error);
    }
  };

  return { trackQuestion, trackApiCall };
}