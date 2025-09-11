/**
 * Identity Resolution Service
 * 
 * This connects emotions to actual people and their value.
 * We're not tracking anonymous sessions - we're tracking your $100k ARR customer having a meltdown.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Lazy-initialize Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

export interface UserIdentity {
  userId: string;
  email?: string;
  company?: string;
  tier?: 'enterprise' | 'scale' | 'growth' | 'starter';
  value?: number; // LTV or ARR
  traits?: Record<string, any>;
  source?: 'direct' | 'segment' | 'amplitude' | 'hubspot' | 'salesforce' | 'cookie';
  enriched?: boolean;
}

export interface IdentitySession {
  sessionId: string;
  userId?: string;
  anonymousId?: string;
  identifiedAt?: Date;
  traits?: Record<string, any>;
  pageViews: number;
  emotionalEvents: number;
  lastActivity: Date;
}

export interface EnrichmentData {
  company?: {
    name: string;
    domain: string;
    industry?: string;
    employeeCount?: number;
    revenue?: number;
  };
  person?: {
    name?: string;
    title?: string;
    department?: string;
    seniority?: string;
  };
  value?: {
    ltv?: number;
    arr?: number;
    mrr?: number;
    tier?: string;
    churnRisk?: number;
  };
}

class IdentityResolutionService {
  private sessionMap: Map<string, IdentitySession> = new Map();
  private userProfiles: Map<string, UserIdentity> = new Map();
  
  /**
   * Identify a user and associate with their session
   */
  async identify(params: {
    sessionId: string;
    userId?: string;
    email?: string;
    traits?: Record<string, any>;
    source?: UserIdentity['source'];
  }): Promise<UserIdentity> {
    const { sessionId, userId, email, traits = {}, source = 'direct' } = params;
    
    // Generate userId from email if not provided
    const resolvedUserId = userId || (email ? this.hashEmail(email) : `anon_${sessionId}`);
    
    // Get or create session
    let session = this.sessionMap.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        anonymousId: `anon_${sessionId}`,
        pageViews: 0,
        emotionalEvents: 0,
        lastActivity: new Date()
      };
      this.sessionMap.set(sessionId, session);
    }
    
    // Update session with identity
    session.userId = resolvedUserId;
    session.identifiedAt = new Date();
    session.traits = { ...session.traits, ...traits };
    
    // Create or update user profile
    let userProfile = this.userProfiles.get(resolvedUserId);
    if (!userProfile) {
      userProfile = {
        userId: resolvedUserId,
        email,
        source,
        traits: {}
      };
      this.userProfiles.set(resolvedUserId, userProfile);
    }
    
    // Merge traits
    userProfile.traits = { ...userProfile.traits, ...traits };
    if (email) userProfile.email = email;
    
    // Enrich with additional data if available
    if (email || traits.company) {
      const enrichment = await this.enrichProfile(userProfile);
      if (enrichment) {
        userProfile = { ...userProfile, ...enrichment, enriched: true };
        this.userProfiles.set(resolvedUserId, userProfile);
      }
    }
    
    // Persist to database
    await this.persistIdentity(userProfile, session);
    
    // Check if this is a high-value user
    if (userProfile.tier === 'enterprise' || (userProfile.value && userProfile.value > 10000)) {
      await this.flagHighValueUser(userProfile);
    }
    
    return userProfile;
  }
  
  /**
   * Get user identity from session
   */
  async getIdentity(sessionId: string): Promise<UserIdentity | null> {
    const session = this.sessionMap.get(sessionId);
    if (!session?.userId) return null;
    
    return this.userProfiles.get(session.userId) || null;
  }
  
  /**
   * Enrich user profile with additional data
   */
  private async enrichProfile(profile: UserIdentity): Promise<Partial<UserIdentity> | null> {
    try {
      const enrichment: Partial<UserIdentity> = {};
      
      // Determine customer tier based on email domain or traits
      if (profile.email) {
        const domain = profile.email.split('@')[1];
        
        // Check for enterprise domains
        const enterpriseDomains = ['fortune500.com', 'enterprise.com', 'corp.com'];
        if (enterpriseDomains.some(d => domain.includes(d))) {
          enrichment.tier = 'enterprise';
          enrichment.value = 100000; // Default enterprise value
        }
      }
      
      // Use provided traits to determine value
      if (profile.traits?.plan) {
        const planToTier: Record<string, UserIdentity['tier']> = {
          'enterprise': 'enterprise',
          'scale': 'scale',
          'growth': 'growth',
          'starter': 'starter'
        };
        enrichment.tier = planToTier[profile.traits.plan] || 'starter';
      }
      
      if (profile.traits?.mrr) {
        enrichment.value = profile.traits.mrr * 12; // Convert MRR to ARR
      }
      
      // Company enrichment from traits
      if (profile.traits?.company_name) {
        enrichment.company = profile.traits.company_name;
      }
      
      return Object.keys(enrichment).length > 0 ? enrichment : null;
    } catch (error) {
      console.error('Failed to enrich profile:', error);
      return null;
    }
  }
  
  /**
   * Persist identity to database
   */
  private async persistIdentity(profile: UserIdentity, session: IdentitySession): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      // Upsert user profile
      await supabase
        .from('user_identities')
        .upsert({
          user_id: profile.userId,
          email: profile.email,
          company: profile.company,
          tier: profile.tier,
          value: profile.value,
          traits: profile.traits,
          source: profile.source,
          enriched: profile.enriched || false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      // Update session mapping
      await supabase
        .from('identity_sessions')
        .upsert({
          session_id: session.sessionId,
          user_id: session.userId,
          anonymous_id: session.anonymousId,
          identified_at: session.identifiedAt?.toISOString(),
          traits: session.traits,
          page_views: session.pageViews,
          emotional_events: session.emotionalEvents,
          last_activity: session.lastActivity.toISOString()
        }, {
          onConflict: 'session_id'
        });
    } catch (error) {
      console.error('Failed to persist identity:', error);
    }
  }
  
  /**
   * Flag high-value users for special treatment
   */
  private async flagHighValueUser(profile: UserIdentity): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      await supabase
        .from('high_value_users')
        .upsert({
          user_id: profile.userId,
          email: profile.email,
          company: profile.company,
          tier: profile.tier,
          value: profile.value,
          flagged_at: new Date().toISOString(),
          alert_on_rage: true,
          alert_on_confusion: true,
          alert_on_abandonment: true,
          priority_support: profile.tier === 'enterprise'
        }, {
          onConflict: 'user_id'
        });
      
      console.log(`🎯 HIGH-VALUE USER FLAGGED: ${profile.email || profile.userId} (${profile.tier}, $${profile.value}/yr)`);
    } catch (error) {
      console.error('Failed to flag high-value user:', error);
    }
  }
  
  /**
   * Link anonymous session to identified user
   */
  async linkSession(anonymousSessionId: string, userId: string): Promise<void> {
    const session = this.sessionMap.get(anonymousSessionId);
    if (!session) return;
    
    session.userId = userId;
    session.identifiedAt = new Date();
    
    // Merge any anonymous events with user profile
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Update all emotional events from this session
        await supabase
          .from('emotional_events')
          .update({ user_id: userId })
          .eq('session_id', anonymousSessionId);
        
        console.log(`Linked session ${anonymousSessionId} to user ${userId}`);
      } catch (error) {
        console.error('Failed to link session:', error);
      }
    }
  }
  
  /**
   * Track page view for session
   */
  trackPageView(sessionId: string): void {
    const session = this.sessionMap.get(sessionId);
    if (session) {
      session.pageViews++;
      session.lastActivity = new Date();
    }
  }
  
  /**
   * Track emotional event for session
   */
  trackEmotionalEvent(sessionId: string): void {
    const session = this.sessionMap.get(sessionId);
    if (session) {
      session.emotionalEvents++;
      session.lastActivity = new Date();
    }
  }
  
  /**
   * Get high-value users in distress
   */
  async getDistressedHighValueUsers(): Promise<Array<{
    user: UserIdentity;
    emotion: string;
    confidence: number;
    timestamp: Date;
  }>> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    
    try {
      const { data } = await supabase
        .from('emotional_events')
        .select(`
          *,
          user_identities!inner(*)
        `)
        .in('emotion', ['rage', 'frustration', 'abandonment', 'anxiety'])
        .gte('confidence', 80)
        .gte('user_identities.value', 10000)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (!data) return [];
      
      return data.map(event => ({
        user: {
          userId: event.user_identities.user_id,
          email: event.user_identities.email,
          company: event.user_identities.company,
          tier: event.user_identities.tier,
          value: event.user_identities.value,
          traits: event.user_identities.traits
        },
        emotion: event.emotion,
        confidence: event.confidence,
        timestamp: new Date(event.timestamp)
      }));
    } catch (error) {
      console.error('Failed to get distressed high-value users:', error);
      return [];
    }
  }
  
  /**
   * Hash email for privacy
   */
  private hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
  }
  
  /**
   * Clean up old sessions
   */
  cleanupSessions(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.sessionMap.entries()) {
      if (session.lastActivity < oneHourAgo && !session.userId) {
        this.sessionMap.delete(sessionId);
      }
    }
  }
}

// Singleton instance
export const identityService = new IdentityResolutionService();

// Clean up sessions periodically
setInterval(() => {
  identityService.cleanupSessions();
}, 30 * 60 * 1000); // Every 30 minutes

export default identityService;