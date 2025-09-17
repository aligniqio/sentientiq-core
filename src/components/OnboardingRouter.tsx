/**
 * Onboarding Router
 * Automatically routes new users to implementation setup
 * Once onboarded, they go to /pulse
 */

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useOrganization, useUser } from '@clerk/clerk-react';
import { getSupabaseClient } from '@/lib/supabase';

interface OnboardingRouterProps {
  children: React.ReactNode;
}

export const OnboardingRouter: React.FC<OnboardingRouterProps> = ({ children }) => {
  const { organization } = useOrganization();
  const { user } = useUser();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    checkOnboardingStatus();
  }, [organization, user]);

  const checkOnboardingStatus = async () => {
    if (!supabase || !organization?.id || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      // First check if organization has valid subscription or is a house account
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('subscription_status, subscription_tier, features')
        .eq('id', organization.id)
        .single();

      if (orgError || !orgData) {
        console.error('Error checking organization subscription:', orgError);
        setLoading(false);
        return;
      }

      // Check if they have valid access (paid, house account, or trial)
      const hasValidAccess =
        orgData.subscription_status === 'active' ||
        orgData.subscription_status === 'house_account' ||
        orgData.subscription_status === 'trialing' ||
        orgData.features?.is_house_account === true;

      if (!hasValidAccess) {
        // No valid subscription - redirect to payment required page
        window.location.href = '/payment-required';
        return;
      }

      // Check organization member's onboarding status
      const { data, error } = await supabase
        .from('organization_members')
        .select('is_onboarded')
        .eq('organization_id', organization.id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        // No record found - create one
        if (error.code === 'PGRST116') {
          await supabase
            .from('organization_members')
            .insert({
              organization_id: organization.id,
              user_id: user.id,
              is_onboarded: false
            });
          setIsOnboarded(false);
        } else {
          console.error('Error checking onboarding status:', error);
        }
      } else {
        setIsOnboarded(data.is_onboarded);
      }
    } catch (error) {
      console.error('Error in onboarding check:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark as onboarded (call this from implementation page when setup is complete)
  const completeOnboarding = async () => {
    if (!supabase || !organization?.id || !user?.id) return;

    try {
      await supabase
        .from('organization_members')
        .update({
          is_onboarded: true
        })
        .eq('organization_id', organization.id)
        .eq('user_id', user.id);

      setIsOnboarded(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  // Store completeOnboarding in window for implementation page to call
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).completeOnboarding = completeOnboarding;
    }
  }, [organization]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // If not onboarded, always go to implementation
  if (isOnboarded === false) {
    const currentPath = window.location.pathname;
    // Allow access to implementation and configuration pages during onboarding
    if (currentPath === '/system/implementation' || currentPath === '/system/configuration') {
      return <>{children}</>;
    }
    return <Navigate to="/system/implementation" replace />;
  }

  // If onboarded, allow normal routing
  return <>{children}</>;
};

export default OnboardingRouter;