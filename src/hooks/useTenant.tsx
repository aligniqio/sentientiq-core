import { useEffect, useState } from 'react';
import { useAuth, useOrganization, useUser } from '@clerk/clerk-react';
import { tenantService, Organization, OrganizationMember } from '../services/tenant';

interface TenantState {
  organization: Organization | null;
  member: OrganizationMember | null;
  loading: boolean;
  error: string | null;
  hasFeature: (feature: keyof Organization['features']) => boolean;
  shouldShowSageHint: boolean;
}

export function useTenant() {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { organization: clerkOrg, isLoaded: orgLoaded } = useOrganization();
  const { user } = useUser();

  const [state, setState] = useState<TenantState>({
    organization: null,
    member: null,
    loading: true,
    error: null,
    hasFeature: () => false,
    shouldShowSageHint: false,
  });

  useEffect(() => {
    async function syncTenant() {
      // Wait for Clerk to load
      if (!authLoaded || !orgLoaded || !userId || !user) {
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        // If user has an organization, sync it
        if (clerkOrg) {
          // Sync organization
          const org = await tenantService.syncOrganization(clerkOrg.id, {
            name: clerkOrg.name,
            slug: clerkOrg.slug,
          });

          if (org) {
            // Sync member
            const member = await tenantService.syncMember(userId, org.id, {
              email: user.primaryEmailAddress?.emailAddress,
              name: user.fullName || user.firstName + ' ' + user.lastName,
              firstName: user.firstName,
              lastName: user.lastName,
            });

            // Check if should show Sage hint
            const shouldShowHint = await tenantService.shouldShowSageHint(
              userId,
              window.location.pathname
            );

            setState({
              organization: org,
              member,
              loading: false,
              error: null,
              hasFeature: (feature) => tenantService.hasFeature(feature),
              shouldShowSageHint: shouldShowHint,
            });
          }
        } else {
          // User doesn't have an organization yet
          // Create a personal organization for them
          const personalOrg = await tenantService.syncOrganization(
            `personal_${userId}`,
            {
              name: `${user.firstName || 'My'}'s Workspace`,
              slug: `personal-${userId}`,
            }
          );

          if (personalOrg) {
            const member = await tenantService.syncMember(userId, personalOrg.id, {
              email: user.primaryEmailAddress?.emailAddress,
              name: user.fullName || user.firstName + ' ' + user.lastName,
              firstName: user.firstName,
              lastName: user.lastName,
            });

            const shouldShowHint = await tenantService.shouldShowSageHint(
              userId,
              window.location.pathname
            );

            setState({
              organization: personalOrg,
              member,
              loading: false,
              error: null,
              hasFeature: (feature) => tenantService.hasFeature(feature),
              shouldShowSageHint: shouldShowHint,
            });
          }
        }
      } catch (error) {
        console.error('Error syncing tenant:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to sync organization data',
        }));
      }
    }

    syncTenant();
  }, [authLoaded, orgLoaded, userId, clerkOrg, user]);

  return state;
}

// Hook for Sage hint visibility
export function useSageHint(pageContext?: string) {
  const { userId } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);

  const context = pageContext || window.location.pathname;

  useEffect(() => {
    async function checkVisibility() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const show = await tenantService.shouldShowSageHint(userId, context);
        setShouldShow(show);
      } catch (error) {
        console.error('Error checking Sage hint visibility:', error);
        setShouldShow(false);
      } finally {
        setLoading(false);
      }
    }

    checkVisibility();
  }, [userId, context]);

  const trackShown = () => {
    tenantService.trackSageInteraction('hint_shown', context);
  };

  const trackDismissed = () => {
    tenantService.trackSageInteraction('hint_dismissed', context);
    setShouldShow(false);
  };

  const dismissPermanently = async () => {
    await tenantService.dismissSageHints();
    setShouldShow(false);
  };

  return {
    shouldShow: shouldShow && !loading,
    loading,
    trackShown,
    trackDismissed,
    dismissPermanently,
  };
}