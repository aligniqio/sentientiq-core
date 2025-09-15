/**
 * Intervention Trigger API
 *
 * Receives triggers from Intent Brain and routes based on tenant tier
 * Starter → Log only (UI handles display)
 * Growth → Email + basic processing
 * Scale → Full intervention engine
 * Enterprise → White glove everything
 */

import { Router, Request, Response } from 'express';
import { routeIntervention, getTenantConfig } from '../services/tenant-router.js';

const router = Router();

/**
 * Main intervention trigger endpoint
 * Called by detect-v4.js Intent Brain when action threshold reached
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.body.tenantId;
    const apiKey = req.headers['x-api-key'] as string || req.body.apiKey;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID required',
        hint: 'Include X-Tenant-ID header or tenantId in body'
      });
    }

    // Validate API key matches tenant
    const tenant = await getTenantConfig(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (apiKey && tenant.apiKey !== apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { action, emotion, confidence, behavior, context, sessionId, userId, pageUrl } = req.body;

    if (!action || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['action', 'sessionId']
      });
    }

    // Route based on tenant tier
    const result = await routeIntervention(tenantId, {
      action,
      emotion: emotion || 'unknown',
      confidence: confidence || 50,
      behavior: behavior || 'unknown',
      context: context || {},
      sessionId,
      userId,
      pageUrl: pageUrl || ''
    });

    // Return instructions for frontend
    res.json({
      success: true,
      handled: result.handled,
      method: result.method,
      features: result.features,
      tier: tenant.tier,

      // Tell frontend what to do
      instructions: getInstructions(tenant.tier, action, result)
    });

  } catch (error: any) {
    console.error('Error processing intervention trigger:', error);
    res.status(500).json({
      error: 'Failed to process intervention',
      message: error.message
    });
  }
});

/**
 * Get tenant configuration for frontend
 * Called on page load to cache tier info
 */
router.get('/config/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getTenantConfig(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Return tier and features for frontend caching
    res.json({
      success: true,
      tenantId: tenant.tenantId,
      tier: tenant.tier,
      features: tenant.features,
      limits: tenant.limits,

      // Frontend behavior flags
      frontend: {
        showUiInterventions: tenant.tier === 'starter' || tenant.tier === 'growth',
        sendToBackend: tenant.tier === 'scale' || tenant.tier === 'enterprise',
        hybridMode: tenant.tier === 'growth'
      }
    });

  } catch (error: any) {
    console.error('Error fetching tenant config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check feature availability
 */
router.get('/feature-check/:tenantId/:feature', async (req: Request, res: Response) => {
  try {
    const { tenantId, feature } = req.params;
    const tenant = await getTenantConfig(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const hasFeature = tenant.features[feature as keyof typeof tenant.features] === true;

    res.json({
      success: true,
      feature,
      enabled: hasFeature,
      tier: tenant.tier,
      upgradeRequired: !hasFeature ? getUpgradeTier(feature) : null
    });

  } catch (error: any) {
    console.error('Error checking feature:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Generate frontend instructions based on tier
 */
function getInstructions(tier: string, action: string, result: any) {
  switch (tier) {
    case 'starter':
      return {
        display: 'ui',
        message: 'Show intervention popup/tooltip as configured',
        tracking: 'Log to analytics only'
      };

    case 'growth':
      return {
        display: 'ui',
        message: 'Show intervention UI',
        tracking: 'Email may be sent',
        features: result.features
      };

    case 'scale':
    case 'enterprise':
      return {
        display: 'optional',
        message: 'Backend handling intervention',
        tracking: 'Full processing active',
        features: result.features
      };

    default:
      return {
        display: 'ui',
        message: 'Default to UI intervention'
      };
  }
}

/**
 * Helper: Find minimum tier for feature
 */
function getUpgradeTier(feature: string): string {
  const featureTiers: Record<string, string> = {
    emailInterventions: 'growth',
    abTesting: 'growth',
    slackIntegration: 'scale',
    crmSync: 'scale',
    customWebhooks: 'scale',
    executiveAlerts: 'enterprise',
    dedicatedSlack: 'enterprise'
  };

  return featureTiers[feature] || 'enterprise';
}

export default router;