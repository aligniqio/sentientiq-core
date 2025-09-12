/**
 * Emotional API Service
 * HTTP endpoints for emotional data ingestion and polling fallback
 */

import express from 'express';
import cors from 'cors';
import { emotionalStream } from './nats-emotional-stream';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'emotional-api' });
});

// Ingest emotional event from detect.js
app.post('/api/emotional/ingest', async (req, res) => {
  try {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...req.body
    };
    
    // Publish to NATS JetStream
    await emotionalStream.publishEvent(event);
    
    res.json({ success: true, event_id: event.id });
  } catch (error) {
    console.error('Failed to ingest event:', error);
    res.status(500).json({ error: 'Failed to process event' });
  }
});

// Polling fallback endpoint (with ETag support)
const eventCache = new Map<string, { events: any[], stats: any, etag: string }>();

app.get('/api/emotional/poll', async (req, res) => {
  const tenantId = req.query.tenant_id as string;
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenant_id' });
  }
  
  // Check ETag
  const ifNoneMatch = req.headers['if-none-match'];
  const cached = eventCache.get(tenantId);
  
  if (cached && ifNoneMatch === cached.etag) {
    return res.status(304).end(); // Not Modified
  }
  
  // Generate new data (in production, this would query JetStream)
  const data = {
    events: [],
    stats: {
      totalSessions: 0,
      totalEvents: 0,
      interventionRate: 0,
      activeUsers: 0,
      volatilityIndex: 0
    }
  };
  
  // Generate ETag
  const etag = `"${Date.now()}-${Math.random().toString(36).substr(2, 9)}"`;
  eventCache.set(tenantId, { ...data, etag });
  
  res.setHeader('ETag', etag);
  res.json(data);
});

// WebSocket upgrade info endpoint
app.get('/api/emotional/ws-info', (req, res) => {
  res.json({
    ws_url: process.env.WS_URL || `ws://localhost:8080`,
    protocol: 'sentientiq-v1',
    features: ['real-time', 'evi', 'jetstream-backed']
  });
});

const PORT = process.env.PORT || 3001;

export function startEmotionalAPI() {
  app.listen(PORT, () => {
    console.log(`✅ Emotional API listening on port ${PORT}`);
  });
}

if (require.main === module) {
  emotionalStream.initialize().then(() => {
    startEmotionalAPI();
  });
}