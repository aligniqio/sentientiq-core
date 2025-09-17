/**
 * Unified WebSocket Server
 * Single server, multiple channels for different client types
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { Server } from 'http';
import { IncomingMessage } from 'http';

interface Client {
  ws: WebSocket;
  sessionId: string;
  tenantId: string;
  type: string;
  connectedAt?: Date;
}

class UnifiedWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null;
  private channels: {
    emotions: Set<Client>;
    interventions: Map<string, Client>;
    telemetry: Map<string, Client>;
  };

  constructor() {
    super();
    this.wss = null;
    this.channels = {
      emotions: new Set<Client>(),      // Dashboard clients watching emotions
      interventions: new Map<string, Client>(), // Marketing site clients receiving interventions
      telemetry: new Map<string, Client>()      // Bundled script clients (telemetry + interventions in one)
    };
  }

  init(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const channel = url.searchParams.get('channel') || 'interventions';
      const sessionId = url.searchParams.get('session') || `ws_${Date.now()}`;
      const tenantId = url.searchParams.get('tenant_id') || url.searchParams.get('tenant') || 'unknown';

      console.log(`🔌 WebSocket connected: ${channel} channel, session: ${sessionId}`);

      // Route to appropriate channel
      switch(channel) {
        case 'emotions':
          this.handleEmotionClient(ws, sessionId, tenantId);
          break;
        case 'interventions':
          this.handleInterventionClient(ws, sessionId, tenantId);
          break;
        case 'telemetry':
          // Bundled script - handles both telemetry and interventions
          this.handleTelemetryClient(ws, sessionId, tenantId);
          break;
        default:
          ws.close(1008, 'Unknown channel');
      }
    });

    console.log('✅ Unified WebSocket server initialized on /ws');
  }

  private handleEmotionClient(ws: WebSocket, sessionId: string, tenantId: string): void {
    const client = { ws, sessionId, tenantId, type: 'emotions' };
    this.channels.emotions.add(client);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      channel: 'emotions',
      sessionId
    }));

    // Handle disconnect
    ws.on('close', () => {
      console.log(`📊 Emotion client disconnected: ${sessionId}`);
      this.channels.emotions.delete(client);
    });

    ws.on('error', (error: Error) => {
      console.error(`Emotion client error ${sessionId}:`, error);
      this.channels.emotions.delete(client);
    });

    // Keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  private handleInterventionClient(ws: WebSocket, sessionId: string, tenantId: string): void {
    const client = {
      ws,
      sessionId,
      tenantId,
      type: 'interventions',
      connectedAt: new Date()
    };

    // Dashboard clients connect with generic session IDs, website clients have specific sessions
    // Store dashboard clients separately so we can broadcast to them
    const isDashboard = sessionId.startsWith('ws_') || sessionId.includes('dashboard');

    this.channels.interventions.set(sessionId, client);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      channel: 'interventions',
      sessionId,
      isDashboard,
      message: isDashboard ? 'Dashboard ready to monitor interventions' : 'Ready to receive interventions'
    }));

    // Handle messages from client
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(sessionId, data);
      } catch (error) {
        console.error('Invalid message from client:', error);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`🎯 Intervention client disconnected: ${sessionId}`);
      this.channels.interventions.delete(sessionId);
    });

    ws.on('error', (error: Error) => {
      console.error(`Intervention client error ${sessionId}:`, error);
      this.channels.interventions.delete(sessionId);
    });

    // Keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  private handleClientMessage(sessionId: string, data: any): void {
    switch(data.type) {
      case 'ping':
        // Check both intervention and telemetry channels
        const interventionClient = this.channels.interventions.get(sessionId);
        const telemetryClient = this.channels.telemetry.get(sessionId);
        const client = interventionClient || telemetryClient;

        if (client) {
          client.ws.send(JSON.stringify({ type: 'pong' }));
        }
        break;

      case 'telemetry':
        // Handle telemetry data from bundled script
        console.log(`📡 Telemetry received via WebSocket: ${data.events?.length || 0} events`);

        // Don't broadcast raw telemetry to dashboard - it's just physics data (velocity, coordinates)
        // Only meaningful emotions and interventions should reach the dashboard

        this.emit('telemetry_received', {
          sessionId,
          tenantId: data.tenant_id,
          events: data.events
        });
        break;

      case 'intervention_shown':
        console.log(`📊 Intervention shown: ${data.intervention} for ${sessionId}`);
        this.emit('intervention_shown', { sessionId, intervention: data.intervention });
        break;

      case 'intervention_clicked':
        console.log(`🎯 Intervention clicked: ${data.intervention} for ${sessionId}`);
        this.emit('intervention_clicked', { sessionId, intervention: data.intervention });
        break;

      default:
        console.log(`Unknown message type from ${sessionId}: ${data.type}`);
    }
  }

  private handleTelemetryClient(ws: WebSocket, sessionId: string, tenantId: string): void {
    const client = {
      ws,
      sessionId,
      tenantId,
      type: 'telemetry',
      connectedAt: new Date()
    };

    // Store by session ID for intervention delivery
    this.channels.telemetry.set(sessionId, client);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      channel: 'telemetry',
      sessionId
    }));

    // Handle messages from bundled script
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(sessionId, data);
      } catch (error) {
        console.error(`Failed to parse telemetry message from ${sessionId}:`, error);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`📉 Telemetry client disconnected: ${sessionId}`);
      this.channels.telemetry.delete(sessionId);
    });

    ws.on('error', (error: Error) => {
      console.error(`Telemetry client error ${sessionId}:`, error);
      this.channels.telemetry.delete(sessionId);
    });

    // Keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  // Broadcast emotion to all dashboard clients
  broadcastEmotion(emotionData: any): void {
    const message = JSON.stringify({
      type: 'event',
      payload: {
        id: `${emotionData.session_id}_${Date.now()}`,
        ...emotionData,
        timestamp: Date.now()
      }
    });

    let sent = 0;
    this.channels.emotions.forEach(client => {
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(message);
        sent++;
      }
    });

    console.log(`📡 Broadcasted emotion to ${sent} dashboard clients`);
  }

  // Send intervention to specific session with rich context
  sendIntervention(sessionId: string, interventionType: string, context: any = {}): boolean {
    // Check both channels - telemetry channel handles both telemetry and interventions
    const telemetryClient = this.channels.telemetry.get(sessionId);
    const interventionClient = this.channels.interventions.get(sessionId);
    const client = telemetryClient || interventionClient;

    if (client && client.ws.readyState === client.ws.OPEN) {
      // Generate correlation ID for tracking
      const correlationId = `int-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Get intervention content
      const interventionContent = this.getInterventionContent(interventionType, context);

      const interventionData = {
        type: 'intervention',
        intervention_type: interventionType,
        interventionType, // Both formats for compatibility
        correlationId,
        timestamp: new Date().toISOString(),
        template: interventionContent.template,
        timing: interventionContent.timing,
        content: interventionContent.content,
        discount: interventionContent.discount,
        context: {
          emotion: context.emotion,
          confidence: context.confidence,
          frustration: context.frustration,
          urgency: context.urgency
        }
      };

      // Send to the specific client (website)
      client.ws.send(JSON.stringify(interventionData));

      console.log(`🎯 Sent ${interventionType} intervention to ${sessionId} (${client.type} channel) - ${correlationId}`);

      // Broadcast websocket delivery stage
      this.broadcastPipelineEvent('websocket', {
        sessionId,
        interventionType,
        correlationId,
        delivered: true
      });

      // ALSO broadcast to all dashboard clients on the interventions channel for monitoring
      this.broadcastInterventionToDashboard({
        sessionId,
        ...interventionData,
        stage: 'engine',  // Mark this as coming from the intervention engine
        component: 'intervention-engine'
      });

      // Emit for diagnostics
      this.emit('intervention_sent', {
        sessionId,
        interventionType,
        correlationId,
        timestamp: Date.now()
      });

      return true;
    }

    console.log(`⚠️ Client ${sessionId} not connected for intervention`);
    return false;
  }

  // Get connection stats
  getStats() {
    return {
      emotions: this.channels.emotions.size,
      interventions: this.channels.interventions.size,
      total: this.channels.emotions.size + this.channels.interventions.size
    };
  }

  // Broadcast pipeline stage events to dashboard for monitoring
  broadcastPipelineEvent(stage: string, eventData: any): void {
    const message = JSON.stringify({
      type: 'pipeline_event',
      component: stage,
      stage: stage,
      timestamp: Date.now(),
      sessionId: eventData.sessionId || eventData.session_id,
      payload: eventData
    });

    let sent = 0;
    // Send to all dashboard clients watching the intervention channel
    this.channels.interventions.forEach((client) => {
      const isDashboard = client.sessionId.startsWith('ws_') || client.sessionId.includes('dashboard');
      if (isDashboard && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(message);
        sent++;
      }
    });

    if (sent > 0) {
      console.log(`📊 Pipeline [${stage}] event broadcast to ${sent} dashboard clients`);
    }
  }

  // Broadcast intervention event to all dashboard clients
  broadcastInterventionToDashboard(interventionData: any): void {
    const message = JSON.stringify({
      type: 'intervention_event',  // Changed from 'event' to distinguish from telemetry
      component: 'intervention-engine',
      stage: 'engine',
      sessionId: interventionData.sessionId,
      payload: {
        ...interventionData,
        behavior: 'intervention_triggered',
        event: 'intervention_triggered',
        interventionType: interventionData.interventionType || interventionData.intervention_type
      }
    });

    let sent = 0;
    // Broadcast to all dashboard clients on the interventions channel
    this.channels.interventions.forEach((client) => {
      // Send to dashboard clients (those with generic session IDs)
      const isDashboard = client.sessionId.startsWith('ws_') || client.sessionId.includes('dashboard');
      if (isDashboard && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(message);
        sent++;
      }
    });

    if (sent > 0) {
      console.log(`📊 Broadcasted intervention ${interventionData.interventionType} to ${sent} dashboard clients`);
    }
  }

  private getInterventionContent(type: string, context: any = {}): any {
    const interventions: Record<string, any> = {
      'value_proposition': {
        template: 'value_highlight',
        timing: { delay: 500, duration: 15000, persistence: 'until-scroll' },
        content: {
          headline: 'Still Considering Your Options?',
          body: 'Here\'s why thousands choose us: ✓ 30-day guarantee ✓ Free shipping ✓ 24/7 support',
          cta: 'See Why We\'re Different'
        },
        discount: 0
      },

      'discount_offer': {
        template: 'discount_modal',
        timing: { delay: 0, duration: 0, persistence: 'sticky' },
        content: {
          headline: 'Wait! Here\'s Something Special',
          body: `We noticed you've been carefully considering. Here's an exclusive ${context.discount || 15}% off just for you.`,
          cta: 'Claim My Discount'
        },
        discount: context.discount || 15
      },

      'trust_signal': {
        template: 'trust_badges',
        timing: { delay: 1000, duration: 10000, persistence: 'timed' },
        content: {
          headline: '🔒 Shop with Confidence',
          body: 'SSL Secured • Money-Back Guarantee • 50,000+ Happy Customers',
          cta: 'Continue Securely'
        },
        discount: 0
      },

      'urgency_scarcity': {
        template: 'urgency_banner',
        timing: { delay: 0, duration: 20000, persistence: 'until-interaction' },
        content: {
          headline: '⏰ Limited Time Offer',
          body: 'Only 3 items left at this price! Sale ends in 2 hours.',
          cta: 'Secure My Order'
        },
        discount: 0
      },

      'social_proof': {
        template: 'social_toast',
        timing: { delay: 2000, duration: 8000, persistence: 'timed' },
        content: {
          headline: '🔥 Trending Now',
          body: '12 people are viewing this • 5 purchased in the last hour',
          cta: ''
        },
        discount: 0
      },

      'help_offer': {
        template: 'help_floating',
        timing: { delay: 3000, duration: 0, persistence: 'sticky' },
        content: {
          headline: 'Need Help Deciding?',
          body: 'Our product experts are here to help you find the perfect fit.',
          cta: 'Chat with Expert'
        },
        discount: 0
      },

      'comparison_table': {
        template: 'comparison_modal',
        timing: { delay: 1000, duration: 0, persistence: 'sticky' },
        content: {
          headline: 'See How We Compare',
          body: 'We\'ve done the research for you. See why we\'re the #1 choice.',
          cta: 'View Comparison'
        },
        discount: 0
      },

      'exit_rescue': {
        template: 'exit_modal',
        timing: { delay: 0, duration: 0, persistence: 'sticky' },
        content: {
          headline: 'Before You Go...',
          body: 'We\'d hate to see you leave empty-handed. How about 20% off your entire order?',
          cta: 'Yes, I\'ll Take It!'
        },
        discount: 20
      }
    };

    // Get base intervention or default
    const intervention = interventions[type] || interventions['trust_signal'];

    // Adjust based on emotional context
    if (context.frustration > 0.7) {
      intervention.content.headline = 'Let Us Help You';
      intervention.timing.delay = 0; // Immediate help
    }

    if (context.urgency > 0.8) {
      intervention.timing.persistence = 'sticky'; // Don't let high-urgency interventions disappear
    }

    return intervention;
  }
}

export const unifiedWS = new UnifiedWebSocketServer();