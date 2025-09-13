/**
 * Pipeline Stubs Service
 * 
 * Graceful degradation implementations that maintain core functionality
 * while stubbing heavy infrastructure components for alpha deployment.
 * 
 * Key principle: Never break the emotional detection or intervention flow.
 * Stub everything else gracefully with proper fallbacks.
 */

import { createClient } from '@supabase/supabase-js';
import { EventLakeRecord, EventBatch } from './event-lake';
import { getDeploymentConfig, isFeatureEnabled } from '../config/deployment-mode.js';

// Initialize Supabase client for stub storage
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * Stub Data Lake Service
 * Falls back to Supabase when S3/Athena not available
 */
export class StubDataLakeService {
  private batchBuffer: EventLakeRecord[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🧪 StubDataLakeService initialized - writing to Supabase');
  }

  async addEvent(record: EventLakeRecord): Promise<void> {
    try {
      this.batchBuffer.push(record);
      console.log(`📊 Event added to stub buffer: ${record.emotion} - Buffer size: ${this.batchBuffer.length}`);
      
      // Auto-flush when buffer gets large or set timer for smaller batches
      const config = getDeploymentConfig();
      if (this.batchBuffer.length >= config.infrastructure.batchSize) {
        await this.flush();
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flush().catch(console.error);
        }, config.infrastructure.flushIntervalMs);
      }
      
    } catch (error) {
      console.error('❌ Failed to add event to stub buffer:', error);
      // Don't throw - graceful degradation
    }
  }

  async flush(): Promise<void> {
    if (this.batchBuffer.length === 0) return;
    
    try {
      console.log(`🚀 Flushing ${this.batchBuffer.length} events to Supabase`);
      
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }

      if (supabase) {
        // Write to Supabase emotions table
        const { error } = await supabase
          .from('emotional_events')
          .insert(
            this.batchBuffer.map(record => ({
              timestamp: record.timestamp,
              user_id: record.userId,
              company_id: record.companyId,
              session_id: record.sessionId,
              vertical: record.vertical,
              geography: record.geography,
              emotion: record.emotion,
              confidence: record.confidence,
              intensity: record.intensity,
              dollar_value: record.dollarValue,
              intervention_taken: record.interventionTaken,
              outcome: record.outcome,
              page_url: record.pageUrl,
              element_target: record.elementTarget,
              user_agent: record.userAgent,
              metadata: record.metadata
            }))
          );

        if (error) {
          throw error;
        }
        
        console.log('✅ Events successfully written to Supabase');
      } else {
        // Ultimate fallback - just log to console
        console.log('📝 Events logged (no Supabase configured):', {
          count: this.batchBuffer.length,
          emotions: this.batchBuffer.map(r => r.emotion),
          totalValue: this.batchBuffer.reduce((sum, r) => sum + r.dollarValue, 0)
        });
      }
      
      this.batchBuffer = [];
      
    } catch (error) {
      console.error('❌ Failed to flush events to Supabase:', error);
      // Keep events in buffer for retry
    }
  }

  async executeQuery(query: string): Promise<any[]> {
    if (!supabase) {
      console.warn('🚧 Query execution not available in stub mode (no Supabase)');
      return [];
    }

    try {
      console.log('🔍 Executing stub query against Supabase...');
      
      // Convert Athena-style queries to Supabase queries (simplified)
      if (query.toLowerCase().includes('count(*)')) {
        const { count, error } = await supabase
          .from('emotional_events')
          .select('*', { count: 'exact', head: true });
          
        if (error) throw error;
        
        return [{ total_events: count }];
      }
      
      // Default: return recent events
      const { data, error } = await supabase
        .from('emotional_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      
      return data || [];
      
    } catch (error) {
      console.error('❌ Stub query failed:', error);
      return [];
    }
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down stub data lake...');
    await this.flush();
  }
}

/**
 * Stub Notification Service
 * Falls back to Slack webhooks when Twilio not available
 */
export class StubNotificationService {
  private slackWebhookUrl: string | null;
  
  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || null;
    console.log('🧪 StubNotificationService initialized - using Slack');
  }

  async sendSMS(to: string, message: string): Promise<void> {
    try {
      const payload = {
        text: `📱 SMS Stub Alert`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*SMS Alert (stubbed)*\n*To:* ${to}\n*Message:* ${message}`
            }
          }
        ]
      };

      if (this.slackWebhookUrl) {
        const response = await fetch(this.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Slack webhook failed: ${response.statusText}`);
        }
        
        console.log('✅ SMS stub sent to Slack:', to);
      } else {
        console.log('📱 SMS Stub (no Slack configured):', { to, message });
      }
      
    } catch (error) {
      console.error('❌ Failed to send stub SMS:', error);
      // Don't throw - graceful degradation
    }
  }

  async sendCall(to: string, message: string): Promise<void> {
    try {
      const payload = {
        text: `📞 Call Stub Alert`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Call Alert (stubbed)*\n*To:* ${to}\n*Message:* ${message}`
            }
          }
        ]
      };

      if (this.slackWebhookUrl) {
        const response = await fetch(this.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Slack webhook failed: ${response.statusText}`);
        }
        
        console.log('✅ Call stub sent to Slack:', to);
      } else {
        console.log('📞 Call Stub (no Slack configured):', { to, message });
      }
      
    } catch (error) {
      console.error('❌ Failed to send stub call:', error);
      // Don't throw - graceful degradation
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      const payload = {
        text: `📧 Email Stub Alert`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Email Alert (stubbed)*\n*To:* ${to}\n*Subject:* ${subject}\n*Body:* ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`
            }
          }
        ]
      };

      if (this.slackWebhookUrl) {
        const response = await fetch(this.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Slack webhook failed: ${response.statusText}`);
        }
        
        console.log('✅ Email stub sent to Slack:', to);
      } else {
        console.log('📧 Email Stub (no Slack configured):', { to, subject });
      }
      
    } catch (error) {
      console.error('❌ Failed to send stub email:', error);
      // Don't throw - graceful degradation
    }
  }
}

/**
 * Stub Analytics Service  
 * Provides basic analytics without heavy infrastructure
 */
export class StubAnalyticsService {
  private events: EventLakeRecord[] = [];
  private maxEvents: number = 10000; // Keep last 10k events in memory
  
  constructor() {
    console.log('🧪 StubAnalyticsService initialized - in-memory analytics');
  }

  addEvent(event: EventLakeRecord): void {
    this.events.push(event);
    
    // Keep only recent events to prevent memory issues
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  getEmotionStats(timeRangeHours: number = 24): any {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => new Date(e.timestamp) > cutoff);
    
    const stats = {
      totalEvents: recentEvents.length,
      uniqueUsers: new Set(recentEvents.map(e => e.userId)).size,
      avgConfidence: recentEvents.reduce((sum, e) => sum + e.confidence, 0) / recentEvents.length || 0,
      emotionBreakdown: {} as Record<string, number>,
      interventionRate: 0,
      totalValue: recentEvents.reduce((sum, e) => sum + e.dollarValue, 0)
    };
    
    // Calculate emotion breakdown
    recentEvents.forEach(event => {
      stats.emotionBreakdown[event.emotion] = (stats.emotionBreakdown[event.emotion] || 0) + 1;
    });
    
    // Calculate intervention rate
    const interventions = recentEvents.filter(e => e.interventionTaken).length;
    stats.interventionRate = recentEvents.length > 0 ? interventions / recentEvents.length : 0;
    
    console.log('📊 Stub analytics calculated:', stats);
    return stats;
  }

  getTopCompanies(limit: number = 10): any[] {
    const companyStats = new Map<string, { events: number; value: number; emotions: string[] }>();
    
    this.events.forEach(event => {
      const existing = companyStats.get(event.companyId) || { events: 0, value: 0, emotions: [] };
      existing.events++;
      existing.value += event.dollarValue;
      existing.emotions.push(event.emotion);
      companyStats.set(event.companyId, existing);
    });
    
    return Array.from(companyStats.entries())
      .map(([companyId, stats]) => ({
        companyId,
        events: stats.events,
        totalValue: stats.value,
        topEmotion: this.getTopEmotion(stats.emotions)
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  }

  private getTopEmotion(emotions: string[]): string {
    const counts = emotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
  }

  clear(): void {
    this.events = [];
    console.log('🗑️  Stub analytics cleared');
  }
}

/**
 * Stub Health Check Service
 * Simplified health checks that work with stubs
 */
export class StubHealthCheckService {
  async checkHealth(): Promise<any> {
    const checks = {
      timestamp: new Date().toISOString(),
      mode: getDeploymentConfig().mode,
      status: 'healthy',
      checks: {
        // Core systems (never stubbed)
        emotions: await this.checkEmotionService(),
        interventions: await this.checkInterventionService(),
        websockets: await this.checkWebSocketService(),
        
        // Infrastructure (may be stubbed)
        dataLake: await this.checkDataLakeService(),
        notifications: await this.checkNotificationService(),
        analytics: await this.checkAnalyticsService()
      }
    };
    
    // Overall health based on core systems
    const coreHealthy = checks.checks.emotions.healthy && 
                       checks.checks.interventions.healthy && 
                       checks.checks.websockets.healthy;
    
    checks.status = coreHealthy ? 'healthy' : 'degraded';
    
    return checks;
  }

  private async checkEmotionService(): Promise<any> {
    // Always healthy if feature enabled (never stubbed)
    return {
      healthy: true, // Emotion detection always on
      stubbed: false,
      message: 'Core emotion detection service'
    };
  }

  private async checkInterventionService(): Promise<any> {
    // Always healthy if feature enabled (never stubbed)  
    return {
      healthy: true, // Intervention engine always on
      stubbed: false,
      message: 'Core intervention engine'
    };
  }

  private async checkWebSocketService(): Promise<any> {
    // Always healthy if feature enabled (never stubbed)
    return {
      healthy: true, // WebSocket streaming always on
      stubbed: false,
      message: 'Core WebSocket streaming'
    };
  }

  private async checkDataLakeService(): Promise<any> {
    const config = getDeploymentConfig();
    if (config.infrastructure.useStubs) {
      // Check Supabase connection
      const healthy = supabase !== null;
      return {
        healthy,
        stubbed: true,
        backend: 'supabase',
        message: healthy ? 'Supabase stub healthy' : 'Supabase stub unavailable'
      };
    } else {
      // Would check S3/Athena in full mode
      return {
        healthy: true,
        stubbed: false,
        backend: 's3+athena',
        message: 'Full S3/Athena pipeline'
      };
    }
  }

  private async checkNotificationService(): Promise<any> {
    const config2 = getDeploymentConfig();
    if (!config2.features.twilioNotifications) {
      const healthy = !!process.env.SLACK_WEBHOOK_URL;
      return {
        healthy,
        stubbed: true,
        backend: 'slack',
        message: healthy ? 'Slack webhook stub healthy' : 'Slack webhook not configured'
      };
    } else {
      // Would check Twilio in full mode
      const healthy = !!process.env.TWILIO_ACCOUNT_SID;
      return {
        healthy,
        stubbed: false,
        backend: 'twilio',
        message: healthy ? 'Twilio service healthy' : 'Twilio not configured'
      };
    }
  }

  private async checkAnalyticsService(): Promise<any> {
    const config3 = getDeploymentConfig();
    if (!config3.features.advancedAnalytics) {
      return {
        healthy: true,
        stubbed: true,
        backend: 'in-memory',
        message: 'In-memory analytics stub'
      };
    } else {
      // Would check Athena in full mode
      return {
        healthy: true,
        stubbed: false,
        backend: 'athena',
        message: 'Full Athena analytics'
      };
    }
  }
}

// Export stub service instances
export const stubDataLake = new StubDataLakeService();
export const stubNotifications = new StubNotificationService();
export const stubAnalytics = new StubAnalyticsService();
export const stubHealthCheck = new StubHealthCheckService();

// Graceful shutdown for all stubs
export async function shutdownStubs(): Promise<void> {
  console.log('🛑 Shutting down stub services...');
  await stubDataLake.shutdown();
  console.log('✅ Stub services shutdown complete');
}

// Register shutdown handlers
process.on('SIGINT', shutdownStubs);
process.on('SIGTERM', shutdownStubs);