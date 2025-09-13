/**
 * Sub-300ms WebSocket Pipeline
 * 
 * Binary protocol for speed. Priority queues for high-value customers.
 * NATS JetStream for distribution. Circuit breakers for latency protection.
 * 
 * THE NORTH STAR: CEO text in 3 seconds for $100k rage.
 */

import WebSocket, { WebSocketServer } from 'ws';
import { connect, NatsConnection, JetStreamClient } from 'nats';
import { emotionPhysicsEngine, PhysicsEvent } from '../services/emotion-physics.js';
import { identityService } from '../services/identity-resolution.js';
import msgpack from 'msgpack-lite';

// Performance targets
const LATENCY_TARGETS = {
  P50: 100,  // 50th percentile: 100ms
  P95: 250,  // 95th percentile: 250ms
  P99: 300,  // 99th percentile: 300ms
  MAX: 500   // Circuit breaker at 500ms
};

// Priority thresholds
const PRIORITY_LEVELS = {
  CRITICAL: 100000, // $100k+ customers
  HIGH: 50000,      // $50k+ customers
  MEDIUM: 10000,    // $10k+ customers
  STANDARD: 0       // Everyone else
};

interface StreamMetrics {
  totalEvents: number;
  highPriorityEvents: number;
  criticalEvents: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  circuitBreakerTrips: number;
  interventionsSent: number;
}

class PhysicsStreamServer {
  private wss: WebSocketServer | null = null;
  private nats: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private priorityQueues: Map<string, PriorityQueue> = new Map();
  private metrics: StreamMetrics = {
    totalEvents: 0,
    highPriorityEvents: 0,
    criticalEvents: 0,
    avgLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    circuitBreakerTrips: 0,
    interventionsSent: 0
  };
  private latencyBuffer: number[] = [];
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerResetTime: number = 0;

  constructor() {
    this.initializeQueues();
  }

  private initializeQueues(): void {
    // Create priority queues for different customer tiers
    this.priorityQueues.set('critical', new PriorityQueue(100));
    this.priorityQueues.set('high', new PriorityQueue(500));
    this.priorityQueues.set('medium', new PriorityQueue(1000));
    this.priorityQueues.set('standard', new PriorityQueue(5000));
  }

  async start(port: number = 8080): Promise<void> {
    // Connect to NATS
    await this.connectNATS();
    
    // Start WebSocket server
    this.wss = new WebSocketServer({ 
      port,
      perMessageDeflate: false, // Disable compression for speed
      maxPayload: 64 * 1024 // 64KB max message
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    // Start queue processors
    this.startQueueProcessors();
    
    // Start metrics collector
    this.startMetricsCollector();

    console.log(`✅ Physics Stream Server listening on port ${port}`);
    console.log(`🎯 Target latency: <300ms for 99% of events`);
  }

  private async connectNATS(): Promise<void> {
    try {
      this.nats = await connect({
        servers: process.env.NATS_URL || 'nats://localhost:4222',
        name: 'physics-stream-server'
      });
      
      this.js = this.nats.jetstream();
      
      // Create stream for physics events
      try {
        const jsm = await this.nats.jetstreamManager();
        await jsm.streams.add({
          name: 'PHYSICS_EVENTS',
          subjects: ['physics.>'],
          retention: 'limits' as any,
          max_msgs: 10000000,
          max_age: 24 * 60 * 60 * 1000000000, // 24 hours
          storage: 'memory' as any, // Use memory for speed
          duplicate_window: 60 * 1000000000 // 1 minute dedup
        });
      } catch (streamErr: any) {
        if (streamErr.message?.includes('already exists')) {
          console.log('Stream already exists, continuing...');
        } else {
          throw streamErr;
        }
      }
      
      console.log('✅ Connected to NATS JetStream');
    } catch (error) {
      console.error('Failed to connect to NATS:', error);
      throw error;
    }
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const sessionId = this.extractSessionId(req);
    const clientIp = req.socket.remoteAddress;
    
    console.log(`New connection: ${sessionId} from ${clientIp}`);
    
    const client = new ClientConnection(ws, sessionId);
    this.clients.set(sessionId, client);
    
    // Handle binary messages for speed
    ws.on('message', async (data: Buffer) => {
      const startTime = Date.now();
      
      try {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen()) {
          ws.send(msgpack.encode({ 
            error: 'Service temporarily unavailable',
            retry: 1000 
          }));
          return;
        }
        
        // Decode binary message
        const event = msgpack.decode(data) as PhysicsEvent;
        event.sessionId = sessionId;
        
        // Get user identity for prioritization
        const identity = await identityService.getIdentity(sessionId);
        const priority = this.getPriority(identity?.value || 0);
        
        // Add to appropriate queue
        const queue = this.getQueue(priority);
        queue.enqueue({
          event,
          client,
          priority,
          timestamp: startTime,
          identity
        });
        
        // Track metrics
        this.metrics.totalEvents++;
        if (priority === 'critical') {
          this.metrics.criticalEvents++;
        } else if (priority === 'high') {
          this.metrics.highPriorityEvents++;
        }
        
      } catch (error) {
        console.error('Error processing physics event:', error);
        ws.send(msgpack.encode({ error: 'Processing error' }));
      }
    });
    
    ws.on('close', () => {
      this.clients.delete(sessionId);
      console.log(`Connection closed: ${sessionId}`);
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${sessionId}:`, error);
      this.clients.delete(sessionId);
    });
    
    // Send initial acknowledgment
    ws.send(msgpack.encode({ 
      type: 'connected',
      sessionId,
      timestamp: Date.now()
    }));
  }

  private startQueueProcessors(): void {
    // Process critical queue with highest priority
    setInterval(() => this.processQueue('critical', 10), 10); // Every 10ms
    
    // Process high priority queue
    setInterval(() => this.processQueue('high', 20), 20); // Every 20ms
    
    // Process medium priority queue
    setInterval(() => this.processQueue('medium', 50), 50); // Every 50ms
    
    // Process standard queue
    setInterval(() => this.processQueue('standard', 100), 100); // Every 100ms
  }

  private async processQueue(priority: string, batchSize: number): Promise<void> {
    const queue = this.priorityQueues.get(priority);
    if (!queue || queue.isEmpty()) return;
    
    const batch = queue.dequeueBatch(batchSize);
    
    for (const item of batch) {
      const processingStart = Date.now();
      
      try {
        // Process through physics engine
        const emotionalState = await emotionPhysicsEngine.processPhysicsEvent(item.event);
        
        if (emotionalState) {
          // Send to NATS for distribution
          if (this.js) {
            await this.js.publish(
              `physics.${priority}.${item.event.sessionId}`,
              msgpack.encode(emotionalState)
            );
          }
          
          // Send intervention response if needed
          if (emotionalState.interventionNeeded) {
            const intervention = {
              type: 'intervention',
              emotion: emotionalState.currentEmotion,
              confidence: emotionalState.confidence,
              priority: emotionalState.interventionPriority,
              timestamp: Date.now()
            };
            
            item.client.send(intervention);
            this.metrics.interventionsSent++;
          }
        }
        
        // Track latency
        const latency = Date.now() - item.timestamp;
        this.trackLatency(latency);
        
        // Log if exceeding target
        if (latency > LATENCY_TARGETS.P95) {
          console.warn(`⚠️ Latency exceeded target: ${latency}ms for ${priority} event`);
        }
        
      } catch (error) {
        console.error(`Error processing ${priority} event:`, error);
      }
    }
  }

  private getPriority(userValue: number): string {
    if (userValue >= PRIORITY_LEVELS.CRITICAL) return 'critical';
    if (userValue >= PRIORITY_LEVELS.HIGH) return 'high';
    if (userValue >= PRIORITY_LEVELS.MEDIUM) return 'medium';
    return 'standard';
  }

  private getQueue(priority: string): PriorityQueue {
    return this.priorityQueues.get(priority) || this.priorityQueues.get('standard')!;
  }

  private trackLatency(latency: number): void {
    this.latencyBuffer.push(latency);
    
    // Keep only last 1000 samples
    if (this.latencyBuffer.length > 1000) {
      this.latencyBuffer.shift();
    }
    
    // Update metrics
    this.updateLatencyMetrics();
    
    // Check circuit breaker
    if (latency > LATENCY_TARGETS.MAX) {
      this.tripCircuitBreaker();
    }
  }

  private updateLatencyMetrics(): void {
    if (this.latencyBuffer.length === 0) return;
    
    const sorted = [...this.latencyBuffer].sort((a, b) => a - b);
    const len = sorted.length;
    
    this.metrics.avgLatency = sorted.reduce((a, b) => a + b, 0) / len;
    this.metrics.p95Latency = sorted[Math.floor(len * 0.95)];
    this.metrics.p99Latency = sorted[Math.floor(len * 0.99)];
  }

  private tripCircuitBreaker(): void {
    if (!this.circuitBreakerOpen) {
      console.error('🚨 Circuit breaker tripped! Latency exceeded 500ms');
      this.circuitBreakerOpen = true;
      this.circuitBreakerResetTime = Date.now() + 5000; // Reset after 5 seconds
      this.metrics.circuitBreakerTrips++;
      
      // Clear queues to prevent backup
      for (const queue of this.priorityQueues.values()) {
        queue.clear();
      }
    }
  }

  private isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerOpen && Date.now() > this.circuitBreakerResetTime) {
      console.log('✅ Circuit breaker reset');
      this.circuitBreakerOpen = false;
    }
    return this.circuitBreakerOpen;
  }

  private startMetricsCollector(): void {
    setInterval(() => {
      console.log('📊 Stream Metrics:', {
        ...this.metrics,
        activeSessions: this.clients.size,
        queueDepths: {
          critical: this.priorityQueues.get('critical')?.size() || 0,
          high: this.priorityQueues.get('high')?.size() || 0,
          medium: this.priorityQueues.get('medium')?.size() || 0,
          standard: this.priorityQueues.get('standard')?.size() || 0
        }
      });
      
      // Alert if P99 exceeds target
      if (this.metrics.p99Latency > LATENCY_TARGETS.P99) {
        console.error(`🚨 P99 latency (${this.metrics.p99Latency}ms) exceeds target (${LATENCY_TARGETS.P99}ms)`);
      }
    }, 10000); // Every 10 seconds
  }

  private extractSessionId(req: any): string {
    // Extract from query params or generate new
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('sessionId') || `ws_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }
}

/**
 * Client connection wrapper
 */
class ClientConnection {
  ws: WebSocket;
  sessionId: string;
  userId?: string;
  lastActivity: number;
  messageCount: number = 0;
  
  constructor(ws: WebSocket, sessionId: string) {
    this.ws = ws;
    this.sessionId = sessionId;
    this.lastActivity = Date.now();
  }
  
  send(data: any): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msgpack.encode(data));
      this.messageCount++;
      this.lastActivity = Date.now();
    }
  }
  
  isAlive(): boolean {
    return this.ws.readyState === WebSocket.OPEN && 
           (Date.now() - this.lastActivity) < 60000; // 1 minute timeout
  }
}

/**
 * Priority queue for event processing
 */
class PriorityQueue {
  private items: any[] = [];
  private maxSize: number;
  
  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }
  
  enqueue(item: any): void {
    if (this.items.length >= this.maxSize) {
      console.warn(`Queue full, dropping oldest event`);
      this.items.shift();
    }
    this.items.push(item);
  }
  
  dequeue(): any {
    return this.items.shift();
  }
  
  dequeueBatch(size: number): any[] {
    return this.items.splice(0, Math.min(size, this.items.length));
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  size(): number {
    return this.items.length;
  }
  
  clear(): void {
    this.items = [];
  }
}

// Singleton instance
export const physicsStreamServer = new PhysicsStreamServer();

// Start server if run directly
if (require.main === module) {
  physicsStreamServer.start(parseInt(process.env.WS_PORT || '8080'));
}

export default physicsStreamServer;