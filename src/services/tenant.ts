import { createClient } from '@supabase/supabase-js';
import { useAuth, useOrganization } from '@clerk/clerk-react';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Organization {
  id: string;
  clerk_org_id: string;
  name: string;
  slug?: string;
  subscription_tier: 'free' | 'starter' | 'professional' | 'enterprise';
  subscription_status: string;
  subscription_ends_at?: string;
  trial_ends_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  features: {
    emotional_detection: boolean;
    behavioral_analytics: boolean;
    sage_assistant: boolean;
    gtm_integration: boolean;
    api_access: boolean;
    custom_events: boolean;
    white_label: boolean;
    priority_support: boolean;
  };
  monthly_event_limit: number;
  monthly_events_used: number;
  api_keys_limit: number;
  team_members_limit: number;
  settings?: any;
  metadata?: any;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  clerk_user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  email: string;
  name: string;
  joined_at: string;
  last_seen_at?: string;
  preferences: {
    show_onboarding: boolean;
    sage_hints_dismissed: boolean;
    email_notifications: boolean;
  };
}

export interface SageInteraction {
  id: string;
  organization_id: string;
  user_id: string;
  interaction_type: 'hint_shown' | 'hint_dismissed' | 'query_made' | 'feedback_given';
  page_context: string;
  details: any;
  created_at: string;
}

class TenantService {
  private static instance: TenantService;
  private currentOrganization: Organization | null = null;
  private currentMember: OrganizationMember | null = null;

  static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  // Get or create organization from Clerk org
  async syncOrganization(clerkOrgId: string, clerkOrgData: any): Promise<Organization | null> {
    try {
      // First try to get existing organization
      let { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('clerk_org_id', clerkOrgId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Organization doesn't exist, create it
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({
            clerk_org_id: clerkOrgId,
            name: clerkOrgData.name || 'My Organization',
            slug: clerkOrgData.slug,
            subscription_tier: 'free'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating organization:', createError);
          return null;
        }

        org = newOrg;
      }

      this.currentOrganization = org;
      return org;
    } catch (error) {
      console.error('Error syncing organization:', error);
      return null;
    }
  }

  // Get or create organization member
  async syncMember(clerkUserId: string, organizationId: string, userData: any): Promise<OrganizationMember | null> {
    try {
      // First try to get existing member
      let { data: member, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Member doesn't exist, create them
        const { data: newMember, error: createError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: organizationId,
            clerk_user_id: clerkUserId,
            email: userData.email,
            name: userData.name || userData.firstName + ' ' + userData.lastName,
            role: 'member' // Default role, can be updated later
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating member:', createError);
          return null;
        }

        member = newMember;
      }

      // Update last seen
      await supabase
        .from('organization_members')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', member.id);

      this.currentMember = member;
      return member;
    } catch (error) {
      console.error('Error syncing member:', error);
      return null;
    }
  }

  // Check if user should see Sage hints
  async shouldShowSageHint(userId: string, pageContext: string): Promise<boolean> {
    try {
      // Check if user has dismissed hints
      if (this.currentMember?.preferences?.sage_hints_dismissed) {
        return false;
      }

      // Check if hint was shown recently on this page
      const { data: recentInteractions } = await supabase
        .from('sage_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('page_context', pageContext)
        .in('interaction_type', ['hint_shown', 'hint_dismissed'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .limit(1);

      if (recentInteractions && recentInteractions.length > 0) {
        return false; // Already shown or dismissed recently
      }

      // Check if user is new (joined in last 7 days)
      if (this.currentMember) {
        const joinedDate = new Date(this.currentMember.joined_at);
        const daysSinceJoined = (Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceJoined <= 7) {
          return true; // Show hints to new users
        }
      }

      // Check total interactions with Sage
      const { count } = await supabase
        .from('sage_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('interaction_type', 'query_made');

      // Show hints if user hasn't interacted much with Sage
      return (count || 0) < 5;
    } catch (error) {
      console.error('Error checking Sage hint visibility:', error);
      return false; // Don't show on error
    }
  }

  // Track Sage interaction
  async trackSageInteraction(
    type: 'hint_shown' | 'hint_dismissed' | 'query_made' | 'feedback_given',
    pageContext: string,
    details: any = {}
  ): Promise<void> {
    if (!this.currentOrganization || !this.currentMember) {
      return;
    }

    try {
      await supabase
        .from('sage_interactions')
        .insert({
          organization_id: this.currentOrganization.id,
          user_id: this.currentMember.clerk_user_id,
          interaction_type: type,
          page_context: pageContext,
          details
        });
    } catch (error) {
      console.error('Error tracking Sage interaction:', error);
    }
  }

  // Dismiss Sage hints permanently
  async dismissSageHints(): Promise<void> {
    if (!this.currentMember) {
      return;
    }

    try {
      await supabase
        .from('organization_members')
        .update({
          preferences: {
            ...this.currentMember.preferences,
            sage_hints_dismissed: true
          }
        })
        .eq('id', this.currentMember.id);

      // Update local cache
      this.currentMember.preferences.sage_hints_dismissed = true;
    } catch (error) {
      console.error('Error dismissing Sage hints:', error);
    }
  }

  // Get current organization
  getCurrentOrganization(): Organization | null {
    return this.currentOrganization;
  }

  // Get current member
  getCurrentMember(): OrganizationMember | null {
    return this.currentMember;
  }

  // Check feature availability
  hasFeature(feature: keyof Organization['features']): boolean {
    return this.currentOrganization?.features[feature] || false;
  }

  // Check usage limits
  async checkUsageLimit(type: 'events' | 'api_keys' | 'team_members'): Promise<boolean> {
    if (!this.currentOrganization) return false;

    switch (type) {
      case 'events':
        return this.currentOrganization.monthly_events_used < this.currentOrganization.monthly_event_limit;

      case 'api_keys':
        const { count: keyCount } = await supabase
          .from('api_keys')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', this.currentOrganization.id)
          .eq('is_active', true);
        return (keyCount || 0) < this.currentOrganization.api_keys_limit;

      case 'team_members':
        const { count: memberCount } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', this.currentOrganization.id);
        return (memberCount || 0) < this.currentOrganization.team_members_limit;

      default:
        return false;
    }
  }

  // Track usage
  async trackUsage(eventCount: number = 1): Promise<void> {
    if (!this.currentOrganization) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      // Upsert usage for today
      await supabase
        .from('organization_usage')
        .upsert({
          organization_id: this.currentOrganization.id,
          date: today,
          event_count: eventCount
        }, {
          onConflict: 'organization_id,date',
          ignoreDuplicates: false
        });

      // Update monthly usage
      await supabase
        .from('organizations')
        .update({
          monthly_events_used: this.currentOrganization.monthly_events_used + eventCount
        })
        .eq('id', this.currentOrganization.id);
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }
}

export const tenantService = TenantService.getInstance();