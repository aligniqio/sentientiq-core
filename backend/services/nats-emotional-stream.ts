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

import { connect, NatsConnection, JetStreamManager, JetStreamClient, StringCodec, DeliverPolicy, AckPolicy, ReplayPolicy } from 'nats';
import { WebSocketServer, WebSocket } from 'ws';
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
  private tenantEvents: Map<string, EmotionalEvent[]> = new Map();
  
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
    
    // Start consuming messages (non-blocking)
    this.startConsumer().catch(console.error);
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
    this.wss = new WebSocketServer({ server });

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
    // Create or get durable consumer with queue group for scaling
    let consumer;
    try {
      consumer = await this.js!.consumers.get(this.STREAM_NAME, 'emotional-processor');
    } catch (err) {
      // Create consumer if it doesn't exist
      await this.jsm!.consumers.add(this.STREAM_NAME, {
        durable_name: 'emotional-processor',
        deliver_policy: DeliverPolicy.All,
        ack_policy: AckPolicy.Explicit,
        replay_policy: ReplayPolicy.Instant,
        max_deliver: 3
      });
      consumer = await this.js!.consumers.get(this.STREAM_NAME, 'emotional-processor');
    }
    
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
    // Store event for EVI calculation
    if (!this.tenantEvents.has(event.tenant_id)) {
      this.tenantEvents.set(event.tenant_id, []);
    }
    const events = this.tenantEvents.get(event.tenant_id)!;
    events.push(event);
    
    // Keep only recent events (last 100)
    if (events.length > 100) {
      events.shift();
    }
    
    // Calculate Emotional Volatility Index™ contribution
    const eviContribution = this.calculateEVIContribution(event);
    const currentEVI = await this.calculateCurrentEVI(event.tenant_id);
    
    // Broadcast to tenant connections
    const connections = this.tenantConnections.get(event.tenant_id);
    if (connections) {
      const message = JSON.stringify({
        type: 'event',
        payload: event,
        evi: eviContribution,
        currentEVI,
        timestamp: Date.now()
      });
      
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
    
    // Publish to EVI calculation stream
    if (eviContribution !== 0) {
      await this.publishEVI(event.tenant_id, eviContribution);
    }
  }

  private calculateEVIContribution(event: EmotionalEvent): number {
    // Emotional Volatility Index™ (EVI) - The VIX for Digital Experiences
    // Scale: 0-100 where:
    //   0-30: Calm waters (everything flowing smoothly)
    //   30-50: Normal conditions (typical digital friction)
    //   50-70: Choppy (users struggling, needs attention)
    //   70-85: Volatile (significant user distress)
    //   85-100: Crisis (mass abandonment risk)
    
    const emotionWeights: Record<string, number> = {
      // High-impact negative emotions (increase volatility)
      rage: 3.5,           // Rage clicks = system breakdown
      abandonment: 3.0,    // User giving up = critical failure
      sticker_shock: 2.5,  // Price rejection = revenue risk
      frustration: 2.0,    // Building negative momentum
      confusion: 1.5,      // Lost users = conversion killer
      anxiety: 1.2,        // Uncertainty building
      hesitation: 0.8,     // Mild friction
      
      // Stabilizing emotions (decrease volatility)
      confidence: -2.0,    // Smooth, decisive actions
      delight: -2.5,       // Exceptional experience
      normal: 0.0,         // Baseline state
      session_start: 0.2   // New session = slight uncertainty
    };
    
    const weight = emotionWeights[event.emotion] || 0;
    const confidence = (event.confidence || 75) / 100;
    
    // Time decay factor - recent emotions matter more
    const recencyFactor = 1.0; // Could decay over time
    
    // Calculate raw contribution (-2.5 to +3.5 range)
    const rawContribution = weight * confidence * recencyFactor;
    
    // Normalize to 0-100 scale impact
    // Positive contributions increase EVI, negative decrease it
    const normalizedContribution = rawContribution * 10;
    
    return normalizedContribution;
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
  
  private async calculateCurrentEVI(tenantId: string): Promise<number> {
    // Calculate current EVI from recent emotional events with time decay
    const recentEvents = this.tenantEvents.get(tenantId) || [];
    if (recentEvents.length === 0) return 50; // Baseline
    
    // Apply time decay and calculate weighted average
    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;
    
    recentEvents.slice(-50).forEach(event => {
      const age = (now - event.timestamp) / 1000; // Age in seconds
      const decayFactor = Math.exp(-age / 300); // 5-minute half-life
      const contribution = this.calculateEVIContribution(event);
      
      weightedSum += contribution * decayFactor;
      totalWeight += decayFactor;
    });
    
    // Calculate EVI centered at 50 (normal conditions)
    const evi = totalWeight > 0 
      ? Math.max(0, Math.min(100, 50 + (weightedSum / totalWeight)))
      : 50;
    
    return Math.round(evi * 100) / 100; // Round to 2 decimals
  }

  private async sendStats(tenantId: string, ws: WebSocket) {
    // Aggregate stats from JetStream
    const baselineEVI = 50; // Normal digital experience baseline
    const currentEVI = await this.calculateCurrentEVI(tenantId);
    
    const stats: EmotionalStats = {
      totalSessions: 0,
      totalEvents: 0,
      interventionRate: 0,
      activeUsers: 0,
      volatilityIndex: currentEVI || baselineEVI
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