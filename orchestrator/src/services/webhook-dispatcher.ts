/**
 * Webhook Dispatcher Service
 * 
 * This fires emotional intelligence to any endpoint in real-time.
 * Your systems will know about customer rage before the customer finishes clicking.
 */

import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { EventEmitter } from 'events';

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret?: string;
  events: string[]; // Which emotions/events to send
  filters?: WebhookFilters;
  retryPolicy?: RetryPolicy;
  headers?: Record<string, string>;
  active: boolean;
  metadata?: Record<string, any>;
}

export interface WebhookFilters {
  minConfidence?: number;
  emotions?: string[];
  userTiers?: string[];
  minValue?: number; // Minimum customer value
  urls?: string[]; // Only fire on specific URLs
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffSeconds: number;
}

export interface WebhookPayload {
  eventId: string;
  timestamp: string;
  type: 'emotional_event' | 'intervention_triggered' | 'user_identified' | 'high_value_alert';
  data: {
    userId?: string;
    email?: string;
    company?: string;
    tier?: string;
    value?: number;
    sessionId: string;
    emotion?: string;
    confidence?: number;
    intensity?: number;
    pageUrl?: string;
    predictedAction?: string;
    interventionWindow?: number;
    suggestedIntervention?: string;
    microBehaviors?: any[];
  };
  metadata?: Record<string, any>;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  payload: WebhookPayload;
  attemptNumber: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  responseCode?: number;
  responseBody?: string;
  error?: string;
  sentAt?: Date;
  nextRetryAt?: Date;
}

class WebhookDispatcher extends EventEmitter {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveryQueue: Map<string, WebhookDelivery> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Register a webhook endpoint
   */
  registerEndpoint(endpoint: WebhookEndpoint): void {
    // Set defaults
    endpoint.retryPolicy = endpoint.retryPolicy || {
      maxRetries: 3,
      backoffMultiplier: 2,
      maxBackoffSeconds: 60
    };
    
    this.endpoints.set(endpoint.id, endpoint);
    console.log(`Registered webhook endpoint: ${endpoint.id} -> ${endpoint.url}`);
  }
  
  /**
   * Dispatch webhook to all matching endpoints
   */
  async dispatch(payload: WebhookPayload): Promise<void> {
    const matchingEndpoints = this.getMatchingEndpoints(payload);
    
    console.log(`Dispatching ${payload.type} to ${matchingEndpoints.length} endpoints`);
    
    for (const endpoint of matchingEndpoints) {
      const deliveryId = this.generateDeliveryId();
      const delivery: WebhookDelivery = {
        id: deliveryId,
        endpointId: endpoint.id,
        payload,
        attemptNumber: 1,
        status: 'pending'
      };
      
      this.deliveryQueue.set(deliveryId, delivery);
      await this.sendWebhook(delivery, endpoint);
    }
  }
  
  /**
   * Send webhook with retries
   */
  private async sendWebhook(delivery: WebhookDelivery, endpoint: WebhookEndpoint): Promise<void> {
    try {
      delivery.sentAt = new Date();
      delivery.status = 'pending';
      
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-SentientIQ-Event': delivery.payload.type,
        'X-SentientIQ-Delivery': delivery.id,
        'X-SentientIQ-Timestamp': delivery.payload.timestamp,
        ...endpoint.headers
      };
      
      // Add signature if secret is configured
      if (endpoint.secret) {
        headers['X-SentientIQ-Signature'] = this.generateSignature(delivery.payload, endpoint.secret);
      }
      
      // Send the webhook
      const response = await axios.post(endpoint.url, delivery.payload, {
        headers,
        timeout: 10000, // 10 second timeout
        validateStatus: () => true // Don't throw on any status code
      });
      
      delivery.responseCode = response.status;
      delivery.responseBody = typeof response.data === 'string' ? 
        response.data : 
        JSON.stringify(response.data);
      
      if (response.status >= 200 && response.status < 300) {
        delivery.status = 'success';
        this.emit('delivery:success', { delivery, endpoint });
        console.log(`✅ Webhook delivered to ${endpoint.id}: ${response.status}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${delivery.responseBody}`);
      }
      
    } catch (error) {
      delivery.error = this.extractErrorMessage(error);
      
      // Check if we should retry
      if (delivery.attemptNumber < endpoint.retryPolicy!.maxRetries) {
        delivery.status = 'retrying';
        delivery.attemptNumber++;
        
        const backoffSeconds = this.calculateBackoff(
          delivery.attemptNumber,
          endpoint.retryPolicy!
        );
        
        delivery.nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);
        
        console.log(`⏳ Retrying webhook to ${endpoint.id} in ${backoffSeconds}s (attempt ${delivery.attemptNumber})`);
        
        // Schedule retry
        const timer = setTimeout(() => {
          this.sendWebhook(delivery, endpoint);
          this.retryTimers.delete(delivery.id);
        }, backoffSeconds * 1000);
        
        this.retryTimers.set(delivery.id, timer);
        
      } else {
        delivery.status = 'failed';
        this.emit('delivery:failed', { delivery, endpoint });
        console.error(`❌ Webhook failed to ${endpoint.id} after ${delivery.attemptNumber} attempts: ${delivery.error}`);
        
        // Alert on critical failures
        if (delivery.payload.type === 'high_value_alert') {
          this.emit('critical:failure', { delivery, endpoint });
        }
      }
    }
    
    // Update delivery record
    this.deliveryQueue.set(delivery.id, delivery);
  }
  
  /**
   * Get endpoints that match the payload
   */
  private getMatchingEndpoints(payload: WebhookPayload): WebhookEndpoint[] {
    return Array.from(this.endpoints.values()).filter(endpoint => {
      // Check if endpoint is active
      if (!endpoint.active) return false;
      
      // Check if event type matches
      if (!endpoint.events.includes('*') && !endpoint.events.includes(payload.type)) {
        return false;
      }
      
      // Apply filters
      if (endpoint.filters) {
        const filters = endpoint.filters;
        
        // Confidence filter
        if (filters.minConfidence && payload.data.confidence) {
          if (payload.data.confidence < filters.minConfidence) return false;
        }
        
        // Emotion filter
        if (filters.emotions && payload.data.emotion) {
          if (!filters.emotions.includes(payload.data.emotion)) return false;
        }
        
        // User tier filter
        if (filters.userTiers && payload.data.tier) {
          if (!filters.userTiers.includes(payload.data.tier)) return false;
        }
        
        // Value filter
        if (filters.minValue && payload.data.value) {
          if (payload.data.value < filters.minValue) return false;
        }
        
        // URL filter
        if (filters.urls && payload.data.pageUrl) {
          const matchesUrl = filters.urls.some(url => 
            payload.data.pageUrl!.includes(url)
          );
          if (!matchesUrl) return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Generate webhook signature
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }
  
  /**
   * Calculate exponential backoff
   */
  private calculateBackoff(attemptNumber: number, policy: RetryPolicy): number {
    const backoff = Math.min(
      Math.pow(policy.backoffMultiplier, attemptNumber - 1),
      policy.maxBackoffSeconds
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * backoff;
    
    return Math.floor(backoff + jitter);
  }
  
  /**
   * Extract error message
   */
  private extractErrorMessage(error: any): string {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNREFUSED') {
        return 'Connection refused';
      }
      if (error.code === 'ETIMEDOUT') {
        return 'Request timeout';
      }
      if (error.response) {
        return `HTTP ${error.response.status}: ${error.response.statusText}`;
      }
      return error.message;
    }
    return String(error);
  }
  
  /**
   * Generate unique delivery ID
   */
  private generateDeliveryId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get delivery status
   */
  getDelivery(deliveryId: string): WebhookDelivery | undefined {
    return this.deliveryQueue.get(deliveryId);
  }
  
  /**
   * Get all deliveries for an endpoint
   */
  getEndpointDeliveries(endpointId: string): WebhookDelivery[] {
    return Array.from(this.deliveryQueue.values())
      .filter(d => d.endpointId === endpointId)
      .sort((a, b) => (b.sentAt?.getTime() || 0) - (a.sentAt?.getTime() || 0));
  }
  
  /**
   * Cancel pending retries
   */
  cancelRetries(deliveryId: string): void {
    const timer = this.retryTimers.get(deliveryId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(deliveryId);
      
      const delivery = this.deliveryQueue.get(deliveryId);
      if (delivery && delivery.status === 'retrying') {
        delivery.status = 'failed';
        delivery.error = 'Cancelled';
      }
    }
  }
  
  /**
   * Remove endpoint
   */
  removeEndpoint(endpointId: string): void {
    this.endpoints.delete(endpointId);
    
    // Cancel any pending retries for this endpoint
    for (const [deliveryId, delivery] of this.deliveryQueue.entries()) {
      if (delivery.endpointId === endpointId && delivery.status === 'retrying') {
        this.cancelRetries(deliveryId);
      }
    }
  }
  
  /**
   * Clean up old deliveries
   */
  cleanupDeliveries(olderThanHours: number = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    for (const [id, delivery] of this.deliveryQueue.entries()) {
      if (delivery.sentAt && delivery.sentAt.getTime() < cutoff) {
        this.deliveryQueue.delete(id);
      }
    }
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    totalEndpoints: number;
    activeEndpoints: number;
    pendingDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
  } {
    const deliveries = Array.from(this.deliveryQueue.values());
    
    return {
      totalEndpoints: this.endpoints.size,
      activeEndpoints: Array.from(this.endpoints.values()).filter(e => e.active).length,
      pendingDeliveries: deliveries.filter(d => d.status === 'pending' || d.status === 'retrying').length,
      successfulDeliveries: deliveries.filter(d => d.status === 'success').length,
      failedDeliveries: deliveries.filter(d => d.status === 'failed').length
    };
  }
}

// Singleton instance
export const webhookDispatcher = new WebhookDispatcher();

// Clean up old deliveries periodically
setInterval(() => {
  webhookDispatcher.cleanupDeliveries(24);
}, 60 * 60 * 1000); // Every hour

// Log critical failures
webhookDispatcher.on('critical:failure', ({ delivery, endpoint }) => {
  console.error(`🚨 CRITICAL: Failed to deliver high-value alert to ${endpoint.id}`, {
    userId: delivery.payload.data.userId,
    emotion: delivery.payload.data.emotion,
    value: delivery.payload.data.value,
    error: delivery.error
  });
});

export default webhookDispatcher;