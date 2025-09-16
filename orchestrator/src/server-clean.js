/**
 * Clean Orchestrator Server
 * Single WebSocket, clear separation of concerns
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { unifiedWS } from './services/unified-websocket.js';
import { patternEngine } from './services/pattern-engine.js';
import { behaviorProcessor } from './services/behavior-processor.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const stats = unifiedWS.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    websocket_connections: stats
  });
});

// NEW: Telemetry stream endpoint (behaviors → emotions)
app.post('/api/telemetry/stream', async (req, res) => {
  try {
    const { session_id, tenant_id, events } = req.body;

    console.log(`📡 Telemetry received: ${events.length} events from ${session_id}`);

    // Process behaviors into emotions
    const { emotions, patterns } = behaviorProcessor.processBatch(session_id, events);

    // Store and broadcast each diagnosed emotion
    for (const emotion of emotions) {
      // Store in database
      await supabase
        .from('emotional_events')
        .insert({
          session_id,
          tenant_id,
          emotion: emotion.emotion,
          confidence: emotion.confidence,
          behavior: emotion.behavior,
          metadata: emotion.context,
          timestamp: new Date(emotion.timestamp).toISOString()
        });

      // Broadcast to dashboard
      unifiedWS.broadcastEmotion({
        session_id,
        tenant_id,
        emotion: emotion.emotion,
        confidence: emotion.confidence,
        metadata: emotion.context
      });
    }

    // Check patterns for interventions
    for (const pattern of patterns) {
      console.log(`🎯 Pattern detected: ${pattern.type} → ${pattern.intervention}`);

      // Pass emotional context from the processor
      const emotionalContext = {
        emotion: emotions[emotions.length - 1]?.emotion || 'unknown',
        confidence: emotions[emotions.length - 1]?.confidence || 0,
        frustration: emotions[emotions.length - 1]?.context?.frustration || 0,
        urgency: emotions[emotions.length - 1]?.context?.urgency || 0
      };
      const sent = unifiedWS.sendIntervention(session_id, pattern.intervention, emotionalContext);

      if (sent) {
        await supabase
          .from('intervention_logs')
          .insert({
            session_id,
            tenant_id,
            intervention_type: pattern.intervention,
            pattern_type: pattern.type,
            triggered_at: new Date().toISOString()
          });
      }
    }

    res.json({
      success: true,
      processed: events.length,
      diagnosed: emotions.length,
      patterns: patterns.length
    });
  } catch (error) {
    console.error('Error processing telemetry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy emotion event endpoint (for v4 scripts)
app.post('/api/emotional/event', async (req, res) => {
  try {
    const { session_id, tenant_id, emotion, confidence, metadata } = req.body;

    console.log(`📊 Emotion received: ${emotion} from session: ${session_id}`);

    // Store event
    const { error } = await supabase
      .from('emotional_events')
      .insert({
        session_id,
        tenant_id,
        emotion,
        confidence,
        metadata,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing emotion:', error);
    }

    // Broadcast to dashboard clients
    unifiedWS.broadcastEmotion({
      session_id,
      tenant_id,
      emotion,
      confidence,
      metadata
    });

    // Check for intervention patterns
    const intervention = await patternEngine.analyzePattern(session_id, emotion);

    if (intervention) {
      console.log(`🎯 Pattern matched! Triggering ${intervention} for ${session_id}`);

      // Send intervention to the specific session with emotional context
      const emotionalContext = {
        emotion,
        confidence,
        frustration: metadata?.frustration || 0,
        urgency: metadata?.urgency || 0,
        anxiety: metadata?.anxiety || 0
      };
      const sent = unifiedWS.sendIntervention(session_id, intervention, emotionalContext);

      if (sent) {
        // Record intervention trigger
        await supabase
          .from('intervention_logs')
          .insert({
            session_id,
            tenant_id,
            intervention_type: intervention,
            triggered_at: new Date().toISOString()
          });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing emotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket info endpoint (for debugging)
app.get('/api/emotional/ws-info', (req, res) => {
  const stats = unifiedWS.getStats();
  res.json({
    ws_url: 'wss://api.sentientiq.app/ws',
    channels: {
      emotions: 'wss://api.sentientiq.app/ws?channel=emotions',
      interventions: 'wss://api.sentientiq.app/ws?channel=interventions'
    },
    connected_clients: stats
  });
});

// BLOOMBERG TERMINAL ENDPOINT - The crown jewel
app.get('/api/emotional/market-insights', (req, res) => {
  const insights = behaviorProcessor.getMarketInsights();
  res.json(insights);
});

// EVI endpoint for dashboard widget
app.get('/api/emotional/evi', (req, res) => {
  const evi = behaviorProcessor.calculateEVI();
  const prediction = {
    value: evi,
    trend: evi > 50 ? 'volatile' : 'stable',
    timestamp: Date.now(),
    sessions_tracked: behaviorProcessor.sessions.size,
    patterns_learned: behaviorProcessor.patternMemory.conversionPaths.size +
                     behaviorProcessor.patternMemory.abandonmentPaths.size
  };
  res.json(prediction);
});

// Tenant pattern insights endpoint - CRO dashboard data
app.get('/api/emotional/tenant-insights/:tenantId', async (req, res) => {
  try {
    const insights = await behaviorProcessor.getTenantInsights(req.params.tenantId);
    res.json(insights);
  } catch (error) {
    console.error('Error fetching tenant insights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Intervention feedback endpoint
app.post('/api/emotional/intervention-feedback', async (req, res) => {
  try {
    const { session_id, intervention_type, interacted, converted } = req.body;

    await supabase
      .from('intervention_feedback')
      .insert({
        session_id,
        intervention_type,
        interacted,
        converted,
        timestamp: new Date().toISOString()
      });

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track discount code generation
app.post('/api/track-discount', async (req, res) => {
  try {
    const { code, session_id, intervention } = req.body;

    console.log(`💰 Discount generated: ${code} for session: ${session_id}`);

    // Store discount generation event
    await supabase
      .from('discount_codes')
      .insert({
        code,
        session_id,
        intervention_type: intervention,
        percent_off: 10,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        status: 'active'
      });

    // Log discount generation (trackInteraction removed in refactor)
    console.log(`💰 Discount code generated: ${code} for intervention: ${intervention}`);

    res.json({ success: true, code });
  } catch (error) {
    console.error('Error tracking discount:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Stripe discount (optional - requires Stripe integration)
app.post('/api/create-discount', async (req, res) => {
  try {
    const { code, percent_off, duration, max_redemptions, metadata } = req.body;

    // For now, just acknowledge - full Stripe integration would go here
    console.log(`🎟️ Stripe discount request: ${code} (${percent_off}% off)`);

    // In production, you'd use Stripe API:
    // const coupon = await stripe.coupons.create({
    //   percent_off,
    //   duration,
    //   id: code,
    //   max_redemptions,
    //   metadata
    // });

    res.json({
      success: true,
      code,
      message: 'Discount code ready for use'
    });
  } catch (error) {
    console.error('Error creating Stripe discount:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Clean Orchestrator running on port ${PORT}`);
  console.log(`✨ Emotional Intelligence Engine active`);

  // Load learned patterns from database
  console.log(`📊 Loading pattern learning data...`);
  await behaviorProcessor.loadPatterns();
});

// Initialize unified WebSocket server
unifiedWS.init(server);

// Connect WebSocket server to behavior processor for interventions
behaviorProcessor.setWebSocketServer(unifiedWS);
console.log('🔗 Connected WebSocket to behavior processor for interventions');

// Listen for intervention events
unifiedWS.on('intervention_shown', async (data) => {
  await supabase
    .from('intervention_events')
    .insert({
      session_id: data.sessionId,
      event_type: 'shown',
      intervention_type: data.intervention,
      timestamp: new Date().toISOString()
    });
});

unifiedWS.on('intervention_clicked', async (data) => {
  await supabase
    .from('intervention_events')
    .insert({
      session_id: data.sessionId,
      event_type: 'clicked',
      intervention_type: data.intervention,
      timestamp: new Date().toISOString()
    });
});

console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
console.log(`📊 Emotion channel: ws://localhost:${PORT}/ws?channel=emotions`);
console.log(`🎯 Intervention channel: ws://localhost:${PORT}/ws?channel=interventions`);