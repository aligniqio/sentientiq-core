/**
 * Emotional Events API
 * Receives emotions from frontend, triggers pattern recognition
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { patternEngine } from '../services/pattern-engine.js';
import { wsManager } from '../services/_archived_2025_01_15/websocket-manager.js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting map (in-memory for now)
const rateLimitMap = new Map<string, number>();

/**
 * POST /api/emotional/event
 * Receive emotion event from detection script
 */
router.post('/event', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const apiKey = req.headers['x-api-key'] as string;

    // Basic validation
    if (!event.session_id || !event.emotion || !event.tenant_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Rate limiting check (per session)
    const lastCall = rateLimitMap.get(event.session_id) || 0;
    const now = Date.now();

    if (now - lastCall < 2000) { // 2 second minimum between calls
      return res.status(429).json({ error: 'Too many requests' });
    }
    rateLimitMap.set(event.session_id, now);

    // Store emotion event in database
    const { error: dbError } = await supabase
      .from('emotional_events')
      .insert({
        session_id: event.session_id,
        tenant_id: event.tenant_id,
        user_id: event.user_id || null,
        emotion: event.emotion,
        confidence: event.confidence,
        behavior: event.behavior,
        page_url: event.page_url,
        metadata: event.metadata,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Failed to store emotion event:', dbError);
    }

    // Process through pattern engine
    const intervention = await patternEngine.processEmotion(event);

    if (intervention) {
      console.log(`🎯 Pattern matched! Triggering ${intervention} for session ${event.session_id}`);

      // Send intervention via WebSocket if client is connected
      wsManager.sendToSession(event.session_id, {
        type: 'intervention',
        intervention: intervention,
        timestamp: new Date().toISOString()
      });

      // Return intervention in response (backup delivery method)
      return res.json({
        success: true,
        intervention: intervention
      });
    }

    // No intervention triggered
    res.json({ success: true });

  } catch (error) {
    console.error('Emotional event processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

/**
 * GET /api/emotional/stats
 * Get emotional statistics for a tenant
 */
router.get('/stats/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const since = new Date(Date.now() - 86400000).toISOString(); // Last 24 hours

    // Get emotion counts
    const { data: emotions, error } = await supabase
      .from('emotional_events')
      .select('emotion, confidence')
      .eq('tenant_id', tenantId)
      .gte('created_at', since);

    if (error) throw error;

    // Calculate statistics
    const emotionCounts: Record<string, number> = {};
    const avgConfidence: Record<string, number> = {};

    emotions?.forEach(e => {
      emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
      if (!avgConfidence[e.emotion]) {
        avgConfidence[e.emotion] = 0;
      }
      avgConfidence[e.emotion] += e.confidence;
    });

    // Calculate averages
    Object.keys(avgConfidence).forEach(emotion => {
      avgConfidence[emotion] = avgConfidence[emotion] / emotionCounts[emotion];
    });

    // Get pattern performance
    const patternStats = await patternEngine.getPatternStats(tenantId);

    res.json({
      period: '24h',
      total_emotions: emotions?.length || 0,
      emotion_breakdown: emotionCounts,
      avg_confidence: avgConfidence,
      interventions: patternStats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * POST /api/emotional/intervention-feedback
 * Record whether user interacted with intervention
 */
router.post('/intervention-feedback', async (req: Request, res: Response) => {
  try {
    const { session_id, intervention_type, interacted, converted } = req.body;

    await supabase
      .from('intervention_events')
      .update({
        interacted: interacted,
        converted: converted,
        feedback_at: new Date().toISOString()
      })
      .eq('session_id', session_id)
      .eq('intervention_type', intervention_type)
      .order('triggered_at', { ascending: false })
      .limit(1);

    res.json({ success: true });

  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Clean up rate limit map periodically
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [session, time] of rateLimitMap.entries()) {
    if (time < oneHourAgo) {
      rateLimitMap.delete(session);
    }
  }
}, 600000); // Every 10 minutes

export default router;