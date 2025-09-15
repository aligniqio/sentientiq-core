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

// Emotion event endpoint
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

      // Send intervention to the specific session
      const sent = unifiedWS.sendIntervention(session_id, intervention);

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

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Clean Orchestrator running on port ${PORT}`);
  console.log(`✨ Emotional Intelligence Engine active`);
});

// Initialize unified WebSocket server
unifiedWS.init(server);

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