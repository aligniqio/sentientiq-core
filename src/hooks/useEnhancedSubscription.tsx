import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTenant } from './useTenant';
import { tenantService } from '../services/tenant';

// Map old tier names to new ones
const TIER_MAPPING: Record<string, string> = {
  'free': 'free',
  'starter': 'starter',
  'growth': 'professional',
  'scale': 'professional',
  'pro': 'professional',
  'team': 'professional',
  'enterprise': 'enterprise'
};

// Updated tier limits matching our new schema
export const TIER_LIMITS = {
  free: {
    monthlyEvents: 10000,
    apiKeys: 1,
    teamMembers: 1,
    dataRetentionDays: 7,
    features: {
      emotional_detection: true,
      behavioral_analytics: true,
      sage_assistant: true,
      gtm_integration: true,
      api_access: false,
      custom_events: false,
      white_label: false,
      priority_support: false
    }
  },
  starter: {
    monthlyEvents: 100000,
    apiKeys: 3,
    teamMembers: 3,
    dataRetentionDays: 30,
    features: {
      emotional_detection: true,
      behavioral_analytics: true,
      sage_assistant: true,
      gtm_integration: true,
      api_access: true,
      custom_events: false,
      white_label: false,
      priority_support: false
    }
  },
  professional: {
    monthlyEvents: 1000000,
    apiKeys: 10,
    teamMembers: 10,
    dataRetentionDays: 90,
    features: {
      emotional_detection: true,
      behavioral_analytics: true,
      sage_assistant: true,
      gtm_integration: true,
      api_access: true,
      custom_events: true,
      white_label: false,
      priority_support: true
    }
  },
  enterprise: {
    monthlyEvents: -1, // Unlimited
    apiKeys: -1,
    teamMembers: -1,
    dataRetentionDays: 365,
    features: {
      emotional_detection: true,
      behavioral_analytics: true,
      sage_assistant: true,
      gtm_integration: true,
      api_access: true,
      custom_events: true,
      white_label: true,
      priority_support: true
    }
  }
};

interface EnhancedSubscriptionData {
  // Current subscription info
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  status: string;
  currentPeriodEnd: Date | null;

  // Usage tracking
  eventsUsed: number;
  eventsLimit: number;
  eventsPercentage: number;
  apiKeysUsed: number;
  apiKeysLimit: number;
  teamMembersCount: number;
  teamMembersLimit: number;

  // Feature flags
  features: typeof TIER_LIMITS.free.features;

  // Actions
  canAddApiKey: boolean;
  canAddTeamMember: boolean;
  canTrackMoreEvents: boolean;

  // Loading state
  loading: boolean;
  error: string | null;
}

export function useEnhancedSubscription(): EnhancedSubscriptionData {
  const { user, isSignedIn } = useUser();
  const { organization, loading: tenantLoading } = useTenant();

  const [data, setData] = useState<EnhancedSubscriptionData>({
    tier: 'free',
    status: 'active',
    currentPeriodEnd: null,
    eventsUsed: 0,
    eventsLimit: 10000,
    eventsPercentage: 0,
    apiKeysUsed: 0,
    apiKeysLimit: 1,
    teamMembersCount: 1,
    teamMembersLimit: 1,
    features: TIER_LIMITS.free.features,
    canAddApiKey: false,
    canAddTeamMember: false,
    canTrackMoreEvents: true,
    loading: true,
    error: null
  });

  useEffect(() => {
    async function fetchEnhancedSubscription() {
      if (!isSignedIn || !user || tenantLoading) {
        setData(prev => ({ ...prev, loading: tenantLoading }));
        return;
      }

      try {
        // First check if we have organization data from our tenant system
        if (organization) {
          // Use organization data as primary source
          const tier = organization.subscription_tier;
          const limits = TIER_LIMITS[tier];

          setData({
            tier,
            status: organization.subscription_status,
            currentPeriodEnd: organization.subscription_ends_at ? new Date(organization.subscription_ends_at) : null,

            eventsUsed: organization.monthly_events_used,
            eventsLimit: organization.monthly_event_limit,
            eventsPercentage: organization.monthly_event_limit > 0
              ? Math.round((organization.monthly_events_used / organization.monthly_event_limit) * 100)
              : 0,

            apiKeysUsed: await tenantService.checkUsageLimit('api_keys') ? 0 : organization.api_keys_limit,
            apiKeysLimit: organization.api_keys_limit,

            teamMembersCount: await tenantService.checkUsageLimit('team_members') ? 1 : organization.team_members_limit,
            teamMembersLimit: organization.team_members_limit,

            features: organization.features,

            canAddApiKey: await tenantService.checkUsageLimit('api_keys'),
            canAddTeamMember: await tenantService.checkUsageLimit('team_members'),
            canTrackMoreEvents: await tenantService.checkUsageLimit('events'),

            loading: false,
            error: null
          });
        } else {
          // Fallback to Clerk metadata (for backward compatibility)
          const clerkTier = (user.publicMetadata?.tier as string) || 'free';
          const mappedTier = (TIER_MAPPING[clerkTier] || 'free') as keyof typeof TIER_LIMITS;
          const limits = TIER_LIMITS[mappedTier];

          setData({
            tier: mappedTier,
            status: (user.publicMetadata?.subscriptionStatus as string) || 'active',
            currentPeriodEnd: user.publicMetadata?.currentPeriodEnd
              ? new Date(user.publicMetadata.currentPeriodEnd as string)
              : null,

            eventsUsed: 0, // Would need to fetch from usage tracking
            eventsLimit: limits.monthlyEvents,
            eventsPercentage: 0,

            apiKeysUsed: 0,
            apiKeysLimit: limits.apiKeys,

            teamMembersCount: 1,
            teamMembersLimit: limits.teamMembers,

            features: limits.features,

            canAddApiKey: true,
            canAddTeamMember: true,
            canTrackMoreEvents: true,

            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Error fetching enhanced subscription:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load subscription data'
        }));
      }
    }

    fetchEnhancedSubscription();
  }, [user, isSignedIn, organization, tenantLoading]);

  return data;
}

// Helper functions for formatting
export function formatEventCount(count: number): string {
  if (count < 0) return 'Unlimited';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case 'enterprise':
      return 'from-yellow-500 to-amber-500';
    case 'professional':
      return 'from-purple-500 to-indigo-500';
    case 'starter':
      return 'from-blue-500 to-cyan-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
}

export function getTierBadgeColor(tier: string): string {
  switch (tier) {
    case 'enterprise':
      return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
    case 'professional':
      return 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/30';
    case 'starter':
      return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30';
    default:
      return 'bg-gray-500/20 border-gray-500/30';
  }
}