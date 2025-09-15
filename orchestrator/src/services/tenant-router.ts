/**
 * Tenant-Aware Intervention Router
 *
 * Routes interventions based on pricing tier
 * Starter ($497) → Lightweight UI
 * Growth ($1,997) → UI + Email + Basic integrations
 * Scale ($4,997) → Full backend engine
 * Enterprise (Custom) → Everything + white glove
 */

import { interventionEngine } from './intervention-engine.js';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export type PricingTier = 'starter' | 'growth' | 'scale' | 'enterprise';

export interface TenantConfig {
  tenantId: string;
  tier: PricingTier;
  apiKey: string;
  features: TenantFeatures;
  limits: TenantLimits;
  metadata?: {
    companyName?: string;
    industry?: string;
    mrr?: number;
  };
}

export interface TenantFeatures {
  // Starter ($497/mo) - GTM-friendly lightweight
  uiInterventions: boolean;
  basicAnalytics: boolean;
  emotionDashboard: boolean;

  // Growth ($1,997/mo) - Growing businesses
  emailInterventions: boolean;
  abTesting: boolean;
  advancedAnalytics: boolean;
  calendarIntegration: boolean;
  customBranding: boolean;

  // Scale ($4,997/mo) - Serious revenue protection
  slackIntegration: boolean;
  crmSync: boolean;
  customWebhooks: boolean;
  multipleProperties: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;

  // Enterprise (Let's talk) - White glove
  executiveAlerts: boolean;
  dedicatedSlack: boolean;
  customIntegrations: boolean;
  slaGuarantee: boolean;
  dedicatedCsm: boolean;
}

export interface TenantLimits {
  eventsPerMonth: number;
  interventionsPerDay: number;
  teamMembers: number;
  properties: number;
}

// Tier definitions with features and limits
const TIER_CONFIGS: Record<PricingTier, Partial<TenantConfig>> = {
  starter: {
    tier: 'starter',
    features: {
      uiInterventions: true,
      basicAnalytics: true,
      emotionDashboard: true,
      emailInterventions: false,
      abTesting: false,
      advancedAnalytics: false,
      calendarIntegration: false,
      customBranding: true, // They can upload logo/colors
      slackIntegration: false,
      crmSync: false,
      customWebhooks: false,
      multipleProperties: false,
      apiAccess: false,
      prioritySupport: false,
      executiveAlerts: false,
      dedicatedSlack: false,
      customIntegrations: false,
      slaGuarantee: false,
      dedicatedCsm: false
    },
    limits: {
      eventsPerMonth: 50000,
      interventionsPerDay: 100,
      teamMembers: 3,
      properties: 1
    }
  },

  growth: {
    tier: 'growth',
    features: {
      uiInterventions: true,
      basicAnalytics: true,
      emotionDashboard: true,
      emailInterventions: true,
      abTesting: true,
      advancedAnalytics: true,
      calendarIntegration: true,
      customBranding: true,
      slackIntegration: false,
      crmSync: false,
      customWebhooks: false,
      multipleProperties: true,
      apiAccess: false,
      prioritySupport: false,
      executiveAlerts: false,
      dedicatedSlack: false,
      customIntegrations: false,
      slaGuarantee: false,
      dedicatedCsm: false
    },
    limits: {
      eventsPerMonth: 250000,
      interventionsPerDay: 500,
      teamMembers: 10,
      properties: 3
    }
  },

  scale: {
    tier: 'scale',
    features: {
      uiInterventions: true,
      basicAnalytics: true,
      emotionDashboard: true,
      emailInterventions: true,
      abTesting: true,
      advancedAnalytics: true,
      calendarIntegration: true,
      customBranding: true,
      slackIntegration: true,
      crmSync: true,
      customWebhooks: true,
      multipleProperties: true,
      apiAccess: true,
      prioritySupport: true,
      executiveAlerts: false,
      dedicatedSlack: false,
      customIntegrations: false,
      slaGuarantee: false,
      dedicatedCsm: false
    },
    limits: {
      eventsPerMonth: 1000000,
      interventionsPerDay: 2000,
      teamMembers: 25,
      properties: 10
    }
  },

  enterprise: {
    tier: 'enterprise',
    features: {
      uiInterventions: true,
      basicAnalytics: true,
      emotionDashboard: true,
      emailInterventions: true,
      abTesting: true,
      advancedAnalytics: true,
      calendarIntegration: true,
      customBranding: true,
      slackIntegration: true,
      crmSync: true,
      customWebhooks: true,
      multipleProperties: true,
      apiAccess: true,
      prioritySupport: true,
      executiveAlerts: true,
      dedicatedSlack: true,
      customIntegrations: true,
      slaGuarantee: true,
      dedicatedCsm: true
    },
    limits: {
      eventsPerMonth: -1, // Unlimited
      interventionsPerDay: -1, // Unlimited
      teamMembers: -1, // Unlimited
      properties: -1 // Unlimited
    }
  }
};

/**
 * Get tenant configuration with tier-based features
 */
export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  if (!supabase) {
    console.warn('Supabase not configured, using default starter config');
    return {
      tenantId,
      tier: 'starter',
      apiKey: 'demo',
      ...TIER_CONFIGS.starter
    } as TenantConfig;
  }

  try {
    // Fetch tenant from database
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      console.error('Tenant not found:', tenantId);
      return null;
    }

    // Merge with tier defaults
    const tierConfig = TIER_CONFIGS[tenant.tier as PricingTier] || TIER_CONFIGS.starter;

    return {
      tenantId: tenant.id,
      tier: tenant.tier,
      apiKey: tenant.api_key,
      features: tierConfig.features!,
      limits: tierConfig.limits!,
      metadata: {
        companyName: tenant.company_name,
        industry: tenant.industry,
        mrr: tenant.mrr
      }
    };
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    return null;
  }
}

/**
 * Route intervention based on tenant tier
 */
export async function routeIntervention(
  tenantId: string,
  event: {
    action: string;
    emotion: string;
    confidence: number;
    behavior: string;
    context: any;
    sessionId: string;
    userId?: string;
    pageUrl: string;
  }
): Promise<{
  handled: boolean;
  method: 'ui' | 'backend' | 'hybrid';
  features: string[];
}> {
  const tenant = await getTenantConfig(tenantId);

  if (!tenant) {
    return { handled: false, method: 'ui', features: [] };
  }

  const enabledFeatures: string[] = [];

  // Check limits
  if (tenant.limits.interventionsPerDay !== -1) {
    const todayCount = await getTodayInterventionCount(tenantId);
    if (todayCount >= tenant.limits.interventionsPerDay) {
      console.warn(`Tenant ${tenantId} exceeded daily intervention limit`);
      return { handled: false, method: 'ui', features: ['limit_exceeded'] };
    }
  }

  // Route based on tier
  switch (tenant.tier) {
    case 'starter':
      // Lightweight UI only - no backend processing
      enabledFeatures.push('ui_interventions');
      await logInterventionTrigger(tenantId, event);
      return {
        handled: true,
        method: 'ui',
        features: enabledFeatures
      };

    case 'growth':
      // UI + Email interventions
      enabledFeatures.push('ui_interventions', 'email_interventions');

      if (tenant.features.emailInterventions) {
        await processEmailIntervention(tenantId, event);
        enabledFeatures.push('email_sent');
      }

      if (tenant.features.abTesting) {
        await trackAbTestVariant(tenantId, event);
        enabledFeatures.push('ab_test_tracked');
      }

      await logInterventionTrigger(tenantId, event);
      return {
        handled: true,
        method: 'hybrid',
        features: enabledFeatures
      };

    case 'scale':
      // Full backend engine with integrations
      enabledFeatures.push('full_backend_engine');

      // Use the powerful intervention engine
      const interventionResult = await interventionEngine.processEmotionalEvent({
        ...event,
        predictedAction: event.action,
        interventionWindow: 5000
      });

      if (tenant.features.slackIntegration) {
        enabledFeatures.push('slack_integration');
      }

      if (tenant.features.crmSync) {
        enabledFeatures.push('crm_sync');
      }

      if (tenant.features.customWebhooks) {
        enabledFeatures.push('webhooks');
      }

      return {
        handled: true,
        method: 'backend',
        features: enabledFeatures
      };

    case 'enterprise':
      // Everything + white glove treatment
      enabledFeatures.push('full_backend_engine', 'white_glove');

      // Full engine processing
      await interventionEngine.processEmotionalEvent({
        ...event,
        predictedAction: event.action,
        interventionWindow: 5000
      });

      // Executive alerts for high-value situations
      if (tenant.features.executiveAlerts && event.emotion === 'rage') {
        await sendExecutiveAlert(tenant, event);
        enabledFeatures.push('executive_alert');
      }

      // Dedicated Slack channel updates
      if (tenant.features.dedicatedSlack) {
        await postToDedicatedSlack(tenant, event);
        enabledFeatures.push('dedicated_slack');
      }

      return {
        handled: true,
        method: 'backend',
        features: enabledFeatures
      };

    default:
      return { handled: false, method: 'ui', features: [] };
  }
}

/**
 * Helper functions for tier-specific processing
 */

async function getTodayInterventionCount(tenantId: string): Promise<number> {
  if (!supabase) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('intervention_logs')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', today.toISOString());

  return count || 0;
}

async function logInterventionTrigger(tenantId: string, event: any): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('intervention_logs')
    .insert({
      tenant_id: tenantId,
      action: event.action,
      emotion: event.emotion,
      confidence: event.confidence,
      session_id: event.sessionId,
      page_url: event.pageUrl,
      created_at: new Date()
    });
}

async function processEmailIntervention(tenantId: string, event: any): Promise<void> {
  // Simplified email intervention for Growth tier
  console.log(`📧 Email intervention for tenant ${tenantId}:`, event.action);

  // In production, integrate with SendGrid/Postmark
  // For now, just log it
  if (supabase) {
    await supabase
      .from('email_queue')
      .insert({
        tenant_id: tenantId,
        type: 'intervention',
        template: event.action,
        data: event,
        status: 'pending'
      });
  }
}

async function trackAbTestVariant(tenantId: string, event: any): Promise<void> {
  // Track which variant was shown for A/B testing
  console.log(`🧪 A/B test variant tracked for ${tenantId}`);
}

async function sendExecutiveAlert(tenant: TenantConfig, event: any): Promise<void> {
  // SMS/Call to executive for critical situations
  console.log(`🚨 EXECUTIVE ALERT for ${tenant.metadata?.companyName}:`, event);

  // In production, use Twilio
  // For now, high priority Slack
}

async function postToDedicatedSlack(tenant: TenantConfig, event: any): Promise<void> {
  // Post to tenant's dedicated Slack channel
  console.log(`💬 Posting to ${tenant.metadata?.companyName} dedicated Slack:`, event);

  // In production, use tenant's webhook URL
}

/**
 * Check if tenant has access to a feature
 */
export function hasFeature(tenant: TenantConfig, feature: keyof TenantFeatures): boolean {
  return tenant.features[feature] === true;
}

/**
 * Get upgrade prompt for locked features
 */
export function getUpgradePrompt(currentTier: PricingTier, requiredFeature: keyof TenantFeatures): string {
  // Find minimum tier that has this feature
  const tiers: PricingTier[] = ['starter', 'growth', 'scale', 'enterprise'];

  for (const tier of tiers) {
    if (TIER_CONFIGS[tier].features![requiredFeature]) {
      if (tier === currentTier) {
        return ''; // They already have it
      }

      const prices = {
        starter: '$497',
        growth: '$1,997',
        scale: '$4,997',
        enterprise: 'Contact us'
      };

      return `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)} (${prices[tier]}/mo) to unlock this feature`;
    }
  }

  return 'Contact us for custom pricing';
}

export default {
  getTenantConfig,
  routeIntervention,
  hasFeature,
  getUpgradePrompt
};