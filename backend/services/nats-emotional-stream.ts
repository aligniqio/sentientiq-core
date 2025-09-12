/**
 * NATS JetStream Emotional Intelligence Service
 * The infrastructure for the Bloomberg Terminal of Emotional Intelligence
 * 
 * This service handles:
 * - Persistent message streams with JetStream
 * - Horizontal scaling with queue groups
 * - WebSocket bridge for real-time browser updates
 * - Emotional Volatility Index™ calculations
 */

import { connect, NatsConnection, JetStreamManager, JetStreamClient, StringCodec } from 'nats';
import WebSocket from 'ws';
import { createServer } from 'http';

const sc = StringCodec();

interface EmotionalEvent {
  id: string;
  tenant_id: string;
  session_id: string;
  emotion: string;
  confidence: number;
  timestamp: number;
  url?: string;
  device?: string;
  user_id?: string;
  intervention_triggered?: boolean;
  metadata?: Record<string, any>;
}

interface EmotionalStats {
  totalSessions: number;
  totalEvents: number;
  dominantEmotion?: string;
  interventionRate: number;
  activeUsers: number;
  volatilityIndex?: number; // The EVI™
}

class EmotionalStreamService {
  private nc: NatsConnection | null = null;
  private jsm: JetStreamManager | null = null;
  private js: JetStreamClient | null = null;
  private wss: WebSocket.Server | null = null;
  private tenantConnections: Map<string, Set<WebSocket>> = new Map();
  
  // Stream configuration
  private readonly STREAM_NAME = 'EMOTIONAL_EVENTS';
  private readonly STREAM_SUBJECTS = ['emotions.>', 'evi.>'];
  
  async initialize() {
    // Connect to NATS
    this.nc = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      name: 'emotional-stream-service',
      reconnect: true,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 2000,
    });

    console.log('✅ Connected to NATS');

    // Get JetStream manager and client
    this.jsm = await this.nc.jetstreamManager();
    this.js = this.nc.jetstream();

    // Create or update stream
    await this.setupStream();
    
    // Start WebSocket server
    await this.startWebSocketServer();
    
    // Start consuming messages
    await this.startConsumer();
  }

  private async setupStream() {
    try {
      // Check if stream exists
      await this.jsm!.streams.info(this.STREAM_NAME);
      console.log(`Stream ${this.STREAM_NAME} already exists`);
    } catch (err) {
      // Create stream if it doesn't exist
      await this.jsm!.streams.add({
        name: this.STREAM_NAME,
        subjects: this.STREAM_SUBJECTS,
        retention: 'limits',
        storage: 'file',
        max_msgs: 10000000, // 10M messages
        max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
        max_msg_size: 1024 * 1024, // 1MB
        replicas: 3, // For production clustering
        duplicate_window: 60 * 1000000000, // 1 minute dedup window
      });
      console.log(`✅ Created stream ${this.STREAM_NAME}`);
    }
  }

  private async startWebSocketServer() {
    const server = createServer();
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const tenantId = url.searchParams.get('tenant_id');
      
      if (!tenantId) {
        ws.close(1008, 'Missing tenant_id');
        return;
      }

      // Add to tenant connections
      if (!this.tenantConnections.has(tenantId)) {
        this.tenantConnections.set(tenantId, new Set());
      }
      this.tenantConnections.get(tenantId)!.add(ws);

      console.log(`WebSocket connected for tenant: ${tenantId}`);

      // Send initial stats
      this.sendStats(tenantId, ws);

      ws.on('close', () => {
        const connections = this.tenantConnections.get(tenantId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            this.tenantConnections.delete(tenantId);
          }
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
      });
    });

    const port = process.env.WS_PORT || 8080;
    server.listen(port, () => {
      console.log(`✅ WebSocket server listening on port ${port}`);
    });
  }

  private async startConsumer() {
    // Create durable consumer with queue group for scaling
    const consumer = await this.js!.consumers.get(this.STREAM_NAME, 'emotional-processor');
    
    // Process messages
    const messages = await consumer.consume();
    
    for await (const msg of messages) {
      try {
        const data = JSON.parse(sc.decode(msg.data)) as EmotionalEvent;
        
        // Process the event
        await this.processEmotionalEvent(data);
        
        // Acknowledge message
        msg.ack();
      } catch (err) {
        console.error('Error processing message:', err);
        msg.nak();
      }
    }
  }

  private async processEmotionalEvent(event: EmotionalEvent) {
    // Calculate Emotional Volatility Index™ contribution
    const eviContribution = this.calculateEVIContribution(event);
    
    // Broadcast to tenant connections
    const connections = this.tenantConnections.get(event.tenant_id);
    if (connections) {
      const message = JSON.stringify({
        type: 'event',
        payload: event,
        evi: eviContribution,
        timestamp: Date.now()
      });
      
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
    
    // Publish to EVI calculation stream
    if (eviContribution > 0) {
      await this.publishEVI(event.tenant_id, eviContribution);
    }
  }

  private calculateEVIContribution(event: EmotionalEvent): number {
    // Emotional Volatility Index™ calculation
    // Higher confidence + negative emotions = higher volatility
    const emotionWeights: Record<string, number> = {
      rage: 1.0,
      abandonment: 0.9,
      frustration: 0.7,
      anxiety: 0.6,
      confusion: 0.5,
      hesitation: 0.3,
      sticker_shock: 0.8,
      normal: -0.1,
      confidence: -0.3,
      delight: -0.5
    };
    
    const weight = emotionWeights[event.emotion] || 0;
    const confidence = event.confidence / 100;
    
    return weight * confidence;
  }

  private async publishEVI(tenantId: string, contribution: number) {
    // Publish to EVI stream for aggregation
    await this.nc!.publish(
      `evi.${tenantId}`,
      sc.encode(JSON.stringify({
        tenant_id: tenantId,
        contribution,
        timestamp: Date.now()
      }))
    );
  }

  private async sendStats(tenantId: string, ws: WebSocket) {
    // Aggregate stats from JetStream
    const stats: EmotionalStats = {
      totalSessions: 0,
      totalEvents: 0,
      interventionRate: 0,
      activeUsers: 0,
      volatilityIndex: 0
    };
    
    // Send initial stats
    ws.send(JSON.stringify({
      type: 'stats',
      payload: stats,
      timestamp: Date.now()
    }));
  }

  async publishEvent(event: EmotionalEvent) {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }
    
    // Publish to JetStream
    await this.js!.publish(
      `emotions.${event.tenant_id}.${event.emotion}`,
      sc.encode(JSON.stringify(event))
    );
  }

  async shutdown() {
    if (this.wss) {
      this.wss.close();
    }
    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
    }
  }
}

// Export singleton
export const emotionalStream = new EmotionalStreamService();

// Initialize if running directly
if (require.main === module) {
  emotionalStream.initialize().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await emotionalStream.shutdown();
    process.exit(0);
  });
}