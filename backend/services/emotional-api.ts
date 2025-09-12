/**
 * Emotional API Service
 * HTTP endpoints for emotional data ingestion and polling fallback
 */

import express from 'express';
import cors from 'cors';
import { emotionalStream } from './nats-emotional-stream';

const app = express();
app.use(cors({
  origin: ['https://sentientiq.app', 'https://sentientiq.ai', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match', 'X-API-Key']
}));
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
  res.setHeader('Access-Control-Allow-Origin', 'https://sentientiq.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.json({
    ws_url: process.env.WS_URL || `wss://api.sentientiq.app/ws`,
    protocol: 'sentientiq-v1',
    features: ['real-time', 'evi', 'jetstream-backed']
  });
});

// Scorecard endpoint (stub for now)
app.get('/api/scorecard/:userId', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://sentientiq.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Return complete demo data structure
  res.json({
    grade: 'B',
    score: 85,
    interventions: {
      successful: 42,
      failed: 8,
      total: 50,
      successRate: 84
    },
    revenueSaved: 125000,
    revenueAtRisk: 50000,
    recommendations: {
      pending: [],
      ignored: [],
      acted: []
    },
    insights: [],
    activityTrend: [
      { date: '2024-01-01', interventions: 5, revenue: 15000 },
      { date: '2024-01-02', interventions: 8, revenue: 25000 },
      { date: '2024-01-03', interventions: 6, revenue: 18000 },
      { date: '2024-01-04', interventions: 10, revenue: 35000 },
      { date: '2024-01-05', interventions: 7, revenue: 22000 },
      { date: '2024-01-06', interventions: 9, revenue: 30000 },
      { date: '2024-01-07', interventions: 5, revenue: 15000 }
    ]
  });
});

const PORT = process.env.PORT || 3001;

export function startEmotionalAPI() {
  app.listen(PORT, () => {
    console.log(`✅ Emotional API listening on port ${PORT}`);
  });
}

// Start the service
emotionalStream.initialize().then(() => {
  startEmotionalAPI();
}).catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down emotional API...');
  await emotionalStream.shutdown();
  process.exit(0);
});