/**
 * Supabase Query Filters
 * CRITICAL: These filters ensure demo data NEVER contaminates production
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * The Truth Filter
 * Excludes ALL demo data from queries
 * This is not optional. This is not negotiable.
 */
export function excludeDemoData(query: any) {
  return query.eq('is_demo', false);
}

/**
 * Get ONLY real organizations
 * No demos. No tests. No bullshit.
 */
export async function getRealOrganizations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('is_demo', false)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Get ONLY real emotional events
 * Every emotion returned here actually happened
 */
export async function getRealEmotionalEvents(
  supabase: SupabaseClient, 
  organizationId?: string
) {
  let query = supabase
    .from('emotional_events')
    .select(`
      *,
      organizations!inner(
        id,
        company_name,
        is_demo
      )
    `)
    .eq('organizations.is_demo', false);
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  
  const { data, error } = await query.order('detected_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Get ONLY real accountability metrics
 * These numbers represent actual money saved or lost
 */
export async function getRealAccountabilityScores(
  supabase: SupabaseClient,
  organizationId?: string
) {
  let query = supabase
    .from('accountability_scorecards')
    .select(`
      *,
      organizations!inner(
        id,
        company_name,
        is_demo
      )
    `)
    .eq('organizations.is_demo', false);
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  
  const { data, error } = await query.order('period_start', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Calculate REAL metrics only
 * No padding. No faking. No Math.random().
 */
export async function calculateRealMetrics(supabase: SupabaseClient) {
  // Get only real organizations
  const orgs = await getRealOrganizations(supabase);
  const realOrgIds = orgs.map(o => o.id);
  
  // Get real events for real orgs only
  const { data: events, error: eventsError } = await supabase
    .from('emotional_events')
    .select('*')
    .in('organization_id', realOrgIds);
  
  if (eventsError) throw eventsError;
  
  // Get real interventions for real orgs only
  const { data: interventions, error: interventionsError } = await supabase
    .from('interventions')
    .select('*')
    .in('organization_id', realOrgIds);
  
  if (interventionsError) throw interventionsError;
  
  return {
    totalRealEmotions: events.length,
    totalRealInterventions: interventions.length,
    realOrganizations: orgs.length,
    // Every number here is real
    averageEmotionsPerOrg: events.length / Math.max(orgs.length, 1),
    interventionRate: interventions.length / Math.max(events.length, 1)
  };
}

/**
 * Check if an organization is real (not demo)
 */
export async function isRealOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('organizations')
    .select('is_demo')
    .eq('id', organizationId)
    .single();
  
  if (error || !data) return false;
  return !data.is_demo;
}

/**
 * The Demo Quarantine
 * Use this ONLY when explicitly showing demo data
 */
export async function getDemoOrganizations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('is_demo', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Export a constant reminder
export const DEMO_DATA_WARNING = `
  ⚠️ NEVER mix demo and real data
  ⚠️ ALWAYS use excludeDemoData() on production queries  
  ⚠️ Demo accounts are for clickarounds ONLY
  ⚠️ Every real emotion has a dollar value
  ⚠️ Every fake emotion has a negative value
`;

/**
 * Initialize Supabase with truth filters
 * This wraps the client to automatically exclude demos
 */
export function createTruthfulSupabaseClient(supabase: SupabaseClient) {
  return {
    ...supabase,
    organizations: {
      async list() {
        return getRealOrganizations(supabase);
      }
    },
    emotions: {
      async list(orgId?: string) {
        return getRealEmotionalEvents(supabase, orgId);
      }
    },
    accountability: {
      async list(orgId?: string) {
        return getRealAccountabilityScores(supabase, orgId);
      }
    },
    metrics: {
      async calculate() {
        return calculateRealMetrics(supabase);
      }
    }
  };
}