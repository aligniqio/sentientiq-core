/**
 * Identity & Intervention API
 * 
 * The REST endpoints that power emotional revenue generation.
 * Every request here could be the difference between a saved customer and lost revenue.
 */

import { Router, Request, Response } from 'express';
import { identityService } from '../services/identity-resolution.js';
import { interventionEngine } from '../services/intervention-engine.js';
import { webhookDispatcher, WebhookEndpoint, WebhookPayload } from '../services/webhook-dispatcher.js';
import { EmotionalAnalytics } from '../services/emotional-analytics.js';
import { crmService } from '../services/crm-integration.js';

const router = Router();

/**
 * Identify a user and link to their session
 * POST /api/identify
 */
router.post('/identify', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, email, traits, source } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    
    // Perform identity resolution
    const identity = await identityService.identify({
      sessionId,
      userId,
      email,
      traits,
      source: source || 'direct'
    });
    
    // Track the identification
    identityService.trackPageView(sessionId);
    
    // If this is a high-value user, dispatch webhook
    if (identity.tier === 'enterprise' || (identity.value && identity.value > 10000)) {
      const webhookPayload: WebhookPayload = {
        eventId: `id_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'user_identified',
        data: {
          userId: identity.userId,
          email: identity.email,
          company: identity.company,
          tier: identity.tier,
          value: identity.value,
          sessionId
        }
      };
      
      await webhookDispatcher.dispatch(webhookPayload);
    }
    
    res.json({
      success: true,
      identity: {
        userId: identity.userId,
        email: identity.email,
        company: identity.company,
        tier: identity.tier,
        enriched: identity.enriched
      }
    });
    
  } catch (error: any) {
    console.error('Identity error:', error);
    res.status(500).json({ error: 'Failed to identify user' });
  }
});

/**
 * Get user's emotional history
 * GET /api/emotions/:userId
 */
router.get('/emotions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 100, emotion, minConfidence } = req.query;
    
    // Get emotional events from database
    const supabase = (global as any).supabase;
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    let query = supabase
      .from('emotional_events')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(Number(limit));
    
    if (emotion) {
      query = query.eq('emotion', emotion);
    }
    
    if (minConfidence) {
      query = query.gte('confidence', Number(minConfidence));
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      userId,
      events: data,
      summary: {
        total: data.length,
        emotions: [...new Set(data.map((e: any) => e.emotion))],
        avgConfidence: data.reduce((sum: number, e: any) => sum + e.confidence, 0) / data.length
      }
    });
    
  } catch (error: any) {
    console.error('Failed to get emotions:', error);
    res.status(500).json({ error: 'Failed to retrieve emotional history' });
  }
});

/**
 * Trigger a custom intervention
 * POST /api/interventions
 */
router.post('/interventions', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, emotion, confidence, pageUrl, customActions } = req.body;
    
    if (!sessionId || !emotion) {
      return res.status(400).json({ error: 'sessionId and emotion are required' });
    }
    
    // Process through intervention engine
    const executions = await interventionEngine.processEmotionalEvent({
      sessionId,
      userId,
      emotion,
      confidence: confidence || 100,
      pageUrl: pageUrl || '',
      predictedAction: 'custom_trigger',
      interventionWindow: 0
    });
    
    // If custom actions provided, execute them
    if (customActions && Array.isArray(customActions)) {
      // Would execute custom actions here
      console.log('Custom actions requested:', customActions);
    }
    
    res.json({
      success: true,
      interventions: executions.length,
      executions: executions.map(e => ({
        id: e.id,
        ruleId: e.ruleId,
        actions: e.actions.length,
        status: e.actions.every(a => a.status === 'success') ? 'success' : 'partial'
      }))
    });
    
  } catch (error: any) {
    console.error('Intervention error:', error);
    res.status(500).json({ error: 'Failed to trigger intervention' });
  }
});

/**
 * Get accountability scorecard for a company
 * GET /api/scorecard/:companyId
 */
router.get('/scorecard/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { period = '30d' } = req.query;
    
    // Get accountability data from database
    const supabase = (global as any).supabase;
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { data: scorecard } = await supabase
      .from('accountability_scores')
      .select('*')
      .eq('company_id', companyId)
      .single();
    
    // Get recent interventions
    const { data: interventions } = await supabase
      .from('interventions')
      .select('*')
      .eq('company_id', companyId)
      .order('triggered_at', { ascending: false })
      .limit(100);
    
    // Calculate metrics
    const totalRecommendations = interventions?.length || 0;
    const actionsTaken = interventions?.filter((i: any) => i.acknowledged).length || 0;
    const ignoredInterventions = totalRecommendations - actionsTaken;
    
    // Estimate revenue impact
    const revenueSaved = interventions?.reduce((sum: number, i: any) => 
      sum + (i.revenue_impact || 0), 0) || 0;
    
    const revenueLost = interventions?.filter((i: any) => !i.acknowledged)
      .reduce((sum: number, i: any) => sum + (i.revenue_impact || 0), 0) || 0;
    
    const score = totalRecommendations > 0 ? 
      Math.round((actionsTaken / totalRecommendations) * 100) : 
      100;
    
    res.json({
      companyId,
      period,
      scorecard: scorecard || {
        score,
        totalRecommendations,
        actionsTaken,
        ignoredInterventions,
        revenueSaved,
        revenueLost,
        grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
      },
      recentInterventions: interventions?.slice(0, 10) || [],
      insights: {
        mostIgnoredEmotion: 'rage', // Would calculate from data
        costOfInaction: revenueLost,
        improvementPotential: revenueLost * 0.7 // 70% could be saved with action
      }
    });
    
  } catch (error: any) {
    console.error('Scorecard error:', error);
    res.status(500).json({ error: 'Failed to retrieve scorecard' });
  }
});

/**
 * Register a webhook endpoint
 * POST /api/webhooks
 */
router.post('/webhooks', async (req: Request, res: Response) => {
  try {
    const { url, events, secret, filters, headers } = req.body;
    
    if (!url || !events) {
      return res.status(400).json({ error: 'url and events are required' });
    }
    
    const endpoint: WebhookEndpoint = {
      id: `webhook_${Date.now()}`,
      url,
      secret,
      events,
      filters,
      headers,
      active: true
    };
    
    webhookDispatcher.registerEndpoint(endpoint);
    
    res.json({
      success: true,
      endpoint: {
        id: endpoint.id,
        url: endpoint.url,
        events: endpoint.events,
        active: endpoint.active
      }
    });
    
  } catch (error: any) {
    console.error('Webhook registration error:', error);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

/**
 * Get webhook delivery status
 * GET /api/webhooks/:endpointId/deliveries
 */
router.get('/webhooks/:endpointId/deliveries', async (req: Request, res: Response) => {
  try {
    const { endpointId } = req.params;
    
    const deliveries = webhookDispatcher.getEndpointDeliveries(endpointId);
    
    res.json({
      endpointId,
      deliveries: deliveries.slice(0, 50), // Last 50 deliveries
      stats: {
        total: deliveries.length,
        successful: deliveries.filter(d => d.status === 'success').length,
        failed: deliveries.filter(d => d.status === 'failed').length,
        pending: deliveries.filter(d => d.status === 'pending' || d.status === 'retrying').length
      }
    });
    
  } catch (error: any) {
    console.error('Webhook deliveries error:', error);
    res.status(500).json({ error: 'Failed to retrieve deliveries' });
  }
});

/**
 * Process emotional event (main ingestion endpoint)
 * POST /api/emotional-events
 */
router.post('/emotional-events', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    // Validate required fields
    if (!event.sessionId || !event.emotion || !event.confidence) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get user identity if session is identified
    const identity = await identityService.getIdentity(event.sessionId);
    if (identity) {
      event.userId = identity.userId;
      event.email = identity.email;
      event.company = identity.company;
      event.tier = identity.tier;
      event.value = identity.value;
    }
    
    // Track emotional event for session
    identityService.trackEmotionalEvent(event.sessionId);
    
    // Record to database
    await EmotionalAnalytics.recordEmotionalEvent({
      ...event,
      timestamp: new Date(),
      micro_behaviors: event.microBehaviors || []
    });
    
    // Process interventions
    const interventions = await interventionEngine.processEmotionalEvent(event);
    
    // Sync to CRM if identified
    if (identity?.email) {
      await crmService.syncEmotionalEvent({
        userId: identity.userId,
        email: identity.email,
        emotion: event.emotion,
        confidence: event.confidence,
        timestamp: new Date(),
        pageUrl: event.pageUrl || '',
        predictedAction: event.predictedAction || '',
        interventionSuggested: interventions[0]?.ruleId || 'none'
      });
    }
    
    // Dispatch webhooks
    const webhookPayload: WebhookPayload = {
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'emotional_event',
      data: {
        ...event,
        interventionsTriggered: interventions.length
      }
    };
    
    await webhookDispatcher.dispatch(webhookPayload);
    
    // Check for high-value alerts
    if (identity && identity.value && identity.value > 10000) {
      if (['rage', 'abandonment', 'frustration'].includes(event.emotion) && event.confidence > 80) {
        const alertPayload: WebhookPayload = {
          eventId: `alert_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'high_value_alert',
          data: event
        };
        
        await webhookDispatcher.dispatch(alertPayload);
      }
    }
    
    res.json({
      success: true,
      eventId: event.id,
      interventions: interventions.length,
      identified: !!identity
    });
    
  } catch (error: any) {
    console.error('Emotional event processing error:', error);
    res.status(500).json({ error: 'Failed to process emotional event' });
  }
});

/**
 * Get intervention statistics
 * GET /api/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const interventionStats = interventionEngine.getStats();
    const webhookStats = webhookDispatcher.getStats();
    
    res.json({
      interventions: interventionStats,
      webhooks: webhookStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

export default router;