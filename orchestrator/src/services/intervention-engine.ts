/**
 * Intervention Engine
 * 
 * This is where we turn emotional detection into revenue protection.
 * Every emotion has a prescribed intervention. Every intervention has a revenue impact.
 */

import { EventEmitter } from 'events';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { identityService, UserIdentity } from './identity-resolution.js';
import { crmService } from './crm-integration.js';
import { webhookDispatcher, WebhookPayload } from './webhook-dispatcher.js';

// Lazy-initialize Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

export interface InterventionRule {
  id: string;
  name: string;
  emotion: string;
  minConfidence: number;
  conditions: InterventionCondition[];
  actions: InterventionAction[];
  priority: number;
  cooldownMinutes?: number; // Don't repeat intervention for X minutes
  maxPerDay?: number; // Max interventions per day per user
}

export interface InterventionCondition {
  type: 'user_tier' | 'user_value' | 'page_url' | 'time_on_site' | 'previous_emotion';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: any;
}

export interface InterventionAction {
  type: 'slack' | 'email' | 'sms' | 'chat' | 'ui_change' | 'webhook' | 'crm_update' | 'discount';
  config: Record<string, any>;
  delay?: number; // Delay in milliseconds
}

export interface InterventionExecution {
  id: string;
  ruleId: string;
  userId?: string;
  sessionId: string;
  emotion: string;
  confidence: number;
  triggeredAt: Date;
  actions: InterventionActionResult[];
  revenue_impact?: number;
  prevented_churn?: boolean;
}

export interface InterventionActionResult {
  type: string;
  status: 'success' | 'failed' | 'pending';
  executedAt?: Date;
  error?: string;
  result?: any;
}

class InterventionEngine extends EventEmitter {
  private rules: Map<string, InterventionRule> = new Map();
  private executionHistory: Map<string, InterventionExecution[]> = new Map();
  private userCooldowns: Map<string, Map<string, Date>> = new Map();
  
  constructor() {
    super();
    this.loadDefaultRules();
  }
  
  /**
   * Load default intervention rules
   */
  private loadDefaultRules(): void {
    // High-value customer rage intervention
    this.addRule({
      id: 'high_value_rage',
      name: 'High-Value Customer Rage Intervention',
      emotion: 'rage',
      minConfidence: 85,
      conditions: [
        { type: 'user_value', operator: 'greater_than', value: 10000 }
      ],
      actions: [
        {
          type: 'slack',
          config: {
            channel: '#customer-emergency',
            message: '🚨 HIGH-VALUE CUSTOMER RAGE ALERT 🚨\nCustomer: {{email}}\nCompany: {{company}}\nValue: ${{value}}/yr\nPage: {{pageUrl}}\n\nIMMEDIATE ACTION REQUIRED'
          }
        },
        {
          type: 'chat',
          config: {
            autoOpen: true,
            message: "We noticed you might be having trouble. Can we help?",
            assignToAgent: true,
            priority: 'urgent'
          }
        },
        {
          type: 'crm_update',
          config: {
            field: 'needs_immediate_attention',
            value: true
          }
        }
      ],
      priority: 1,
      cooldownMinutes: 30
    });
    
    // Enterprise confusion intervention
    this.addRule({
      id: 'enterprise_confusion',
      name: 'Enterprise Customer Confusion',
      emotion: 'confusion',
      minConfidence: 75,
      conditions: [
        { type: 'user_tier', operator: 'equals', value: 'enterprise' }
      ],
      actions: [
        {
          type: 'ui_change',
          config: {
            action: 'show_help_beacon',
            highlight: 'current_element'
          }
        },
        {
          type: 'email',
          config: {
            template: 'confusion_help',
            subject: 'Need help with {{product}}?',
            sendToAccountManager: true
          },
          delay: 5000 // Wait 5 seconds
        }
      ],
      priority: 2,
      cooldownMinutes: 60
    });
    
    // Abandonment prevention
    this.addRule({
      id: 'abandonment_prevention',
      name: 'Abandonment Prevention',
      emotion: 'abandonment',
      minConfidence: 80,
      conditions: [],
      actions: [
        {
          type: 'ui_change',
          config: {
            action: 'show_exit_intent_modal',
            offer: 'assistance'
          }
        },
        {
          type: 'webhook',
          config: {
            eventType: 'abandonment_detected'
          }
        }
      ],
      priority: 3,
      cooldownMinutes: 120
    });
    
    // Decision paralysis intervention
    this.addRule({
      id: 'decision_paralysis',
      name: 'Decision Paralysis Resolution',
      emotion: 'decision_paralysis',
      minConfidence: 70,
      conditions: [
        { type: 'page_url', operator: 'contains', value: '/pricing' }
      ],
      actions: [
        {
          type: 'ui_change',
          config: {
            action: 'highlight_recommended_plan',
            showComparison: false
          }
        },
        {
          type: 'chat',
          config: {
            proactiveMessage: "I can help you choose the right plan. What's most important to you?"
          },
          delay: 3000
        }
      ],
      priority: 4,
      cooldownMinutes: 30
    });
    
    // Delight amplification
    this.addRule({
      id: 'delight_amplification',
      name: 'Delight Moment Amplification',
      emotion: 'delight',
      minConfidence: 85,
      conditions: [],
      actions: [
        {
          type: 'ui_change',
          config: {
            action: 'show_share_prompt',
            incentive: 'account_credit'
          },
          delay: 2000
        },
        {
          type: 'crm_update',
          config: {
            field: 'nps_opportunity',
            value: true,
            note: 'Customer showing delight - good time for NPS'
          }
        }
      ],
      priority: 5,
      cooldownMinutes: 240
    });
  }
  
  /**
   * Add intervention rule
   */
  addRule(rule: InterventionRule): void {
    this.rules.set(rule.id, rule);
    console.log(`Added intervention rule: ${rule.name}`);
  }
  
  /**
   * Process emotional event and trigger interventions
   */
  async processEmotionalEvent(event: {
    sessionId: string;
    userId?: string;
    emotion: string;
    confidence: number;
    pageUrl: string;
    predictedAction: string;
    interventionWindow: number;
  }): Promise<InterventionExecution[]> {
    const executions: InterventionExecution[] = [];
    
    // Get user identity if available
    const identity = event.userId ? 
      await identityService.getIdentity(event.sessionId) : 
      null;
    
    // Find matching rules
    const matchingRules = this.findMatchingRules(event, identity);
    
    // Sort by priority
    matchingRules.sort((a, b) => a.priority - b.priority);
    
    // Execute interventions
    for (const rule of matchingRules) {
      // Check cooldown
      if (this.isInCooldown(event.userId || event.sessionId, rule)) {
        console.log(`Skipping ${rule.name} - in cooldown period`);
        continue;
      }
      
      // Check daily limit
      if (this.exceededDailyLimit(event.userId || event.sessionId, rule)) {
        console.log(`Skipping ${rule.name} - exceeded daily limit`);
        continue;
      }
      
      // Execute intervention
      const execution = await this.executeIntervention(rule, event, identity);
      executions.push(execution);
      
      // Set cooldown
      this.setCooldown(event.userId || event.sessionId, rule);
      
      // Track execution
      this.trackExecution(event.userId || event.sessionId, execution);
      
      // Emit event
      this.emit('intervention:executed', execution);
    }
    
    return executions;
  }
  
  /**
   * Find rules that match the event
   */
  private findMatchingRules(event: any, identity: UserIdentity | null): InterventionRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      // Check emotion match
      if (rule.emotion !== event.emotion) return false;
      
      // Check confidence threshold
      if (event.confidence < rule.minConfidence) return false;
      
      // Check conditions
      for (const condition of rule.conditions) {
        if (!this.evaluateCondition(condition, event, identity)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: InterventionCondition,
    event: any,
    identity: UserIdentity | null
  ): boolean {
    let value: any;
    
    switch (condition.type) {
      case 'user_tier':
        value = identity?.tier;
        break;
      case 'user_value':
        value = identity?.value || 0;
        break;
      case 'page_url':
        value = event.pageUrl;
        break;
      case 'time_on_site':
        // Would need session tracking for this
        value = 0;
        break;
      case 'previous_emotion':
        // Would need emotion history for this
        value = null;
        break;
      default:
        return false;
    }
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      default:
        return false;
    }
  }
  
  /**
   * Execute intervention actions
   */
  private async executeIntervention(
    rule: InterventionRule,
    event: any,
    identity: UserIdentity | null
  ): Promise<InterventionExecution> {
    const execution: InterventionExecution = {
      id: this.generateExecutionId(),
      ruleId: rule.id,
      userId: event.userId,
      sessionId: event.sessionId,
      emotion: event.emotion,
      confidence: event.confidence,
      triggeredAt: new Date(),
      actions: []
    };
    
    // Execute each action
    for (const action of rule.actions) {
      const actionResult = await this.executeAction(action, event, identity);
      execution.actions.push(actionResult);
      
      // Add delay if specified
      if (action.delay) {
        await new Promise(resolve => setTimeout(resolve, action.delay));
      }
    }
    
    // Persist execution
    await this.persistExecution(execution);
    
    // Calculate revenue impact (would need more data in production)
    execution.revenue_impact = this.estimateRevenueImpact(rule, identity);
    
    return execution;
  }
  
  /**
   * Execute a single action
   */
  private async executeAction(
    action: InterventionAction,
    event: any,
    identity: UserIdentity | null
  ): Promise<InterventionActionResult> {
    const result: InterventionActionResult = {
      type: action.type,
      status: 'pending'
    };
    
    try {
      switch (action.type) {
        case 'slack':
          await this.sendSlackAlert(action.config, event, identity);
          break;
          
        case 'email':
          await this.sendEmail(action.config, event, identity);
          break;
          
        case 'chat':
          await this.triggerChat(action.config, event);
          break;
          
        case 'ui_change':
          await this.triggerUIChange(action.config, event);
          break;
          
        case 'webhook':
          await this.triggerWebhook(action.config, event, identity);
          break;
          
        case 'crm_update':
          await this.updateCRM(action.config, event, identity);
          break;
          
        case 'discount':
          await this.applyDiscount(action.config, event, identity);
          break;
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
      
      result.status = 'success';
      result.executedAt = new Date();
      
    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
      console.error(`Failed to execute ${action.type} action:`, error);
    }
    
    return result;
  }
  
  /**
   * Send Slack alert
   */
  private async sendSlackAlert(config: any, event: any, identity: UserIdentity | null): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) {
      console.warn('Slack webhook not configured');
      return;
    }
    
    const message = this.interpolateTemplate(config.message, event, identity);
    
    // Send to Slack (simplified - would use proper Slack client in production)
    console.log(`📢 Slack Alert: ${message}`);
  }
  
  /**
   * Send email
   */
  private async sendEmail(config: any, event: any, identity: UserIdentity | null): Promise<void> {
    if (!identity?.email) {
      console.warn('No email address for user');
      return;
    }
    
    const subject = this.interpolateTemplate(config.subject, event, identity);
    
    // Send email (would integrate with SendGrid/etc in production)
    console.log(`📧 Email: ${subject} to ${identity.email}`);
  }
  
  /**
   * Trigger chat
   */
  private async triggerChat(config: any, event: any): Promise<void> {
    // Would integrate with Intercom/Zendesk/etc
    console.log(`💬 Chat triggered: ${config.message || config.proactiveMessage}`);
  }
  
  /**
   * Trigger UI change
   */
  private async triggerUIChange(config: any, event: any): Promise<void> {
    // Send to frontend via WebSocket
    console.log(`🎨 UI Change: ${config.action}`);
  }
  
  /**
   * Trigger webhook
   */
  private async triggerWebhook(config: any, event: any, identity: UserIdentity | null): Promise<void> {
    const payload: WebhookPayload = {
      eventId: this.generateExecutionId(),
      timestamp: new Date().toISOString(),
      type: 'intervention_triggered',
      data: {
        userId: event.userId,
        email: identity?.email,
        company: identity?.company,
        tier: identity?.tier,
        value: identity?.value,
        sessionId: event.sessionId,
        emotion: event.emotion,
        confidence: event.confidence,
        pageUrl: event.pageUrl,
        predictedAction: event.predictedAction,
        interventionWindow: event.interventionWindow
      },
      metadata: config
    };
    
    await webhookDispatcher.dispatch(payload);
  }
  
  /**
   * Update CRM
   */
  private async updateCRM(config: any, event: any, identity: UserIdentity | null): Promise<void> {
    if (!identity?.email) return;
    
    await crmService.syncEmotionalEvent({
      userId: event.userId || event.sessionId,
      email: identity.email,
      emotion: event.emotion,
      confidence: event.confidence,
      timestamp: new Date(),
      pageUrl: event.pageUrl,
      predictedAction: event.predictedAction,
      interventionSuggested: config.field
    });
  }
  
  /**
   * Apply discount
   */
  private async applyDiscount(config: any, event: any, identity: UserIdentity | null): Promise<void> {
    // Would integrate with billing system
    console.log(`💰 Discount applied: ${config.amount || config.percentage}`);
  }
  
  /**
   * Interpolate template variables
   */
  private interpolateTemplate(template: string, event: any, identity: UserIdentity | null): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (identity && key in identity) {
        return String((identity as any)[key]);
      }
      if (key in event) {
        return String(event[key]);
      }
      return match;
    });
  }
  
  /**
   * Check if user is in cooldown for rule
   */
  private isInCooldown(userId: string, rule: InterventionRule): boolean {
    if (!rule.cooldownMinutes) return false;
    
    const userCooldowns = this.userCooldowns.get(userId);
    if (!userCooldowns) return false;
    
    const cooldownUntil = userCooldowns.get(rule.id);
    if (!cooldownUntil) return false;
    
    return cooldownUntil > new Date();
  }
  
  /**
   * Set cooldown for user and rule
   */
  private setCooldown(userId: string, rule: InterventionRule): void {
    if (!rule.cooldownMinutes) return;
    
    if (!this.userCooldowns.has(userId)) {
      this.userCooldowns.set(userId, new Map());
    }
    
    const cooldownUntil = new Date(Date.now() + rule.cooldownMinutes * 60 * 1000);
    this.userCooldowns.get(userId)!.set(rule.id, cooldownUntil);
  }
  
  /**
   * Check if user exceeded daily limit for rule
   */
  private exceededDailyLimit(userId: string, rule: InterventionRule): boolean {
    if (!rule.maxPerDay) return false;
    
    const userHistory = this.executionHistory.get(userId) || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayExecutions = userHistory.filter(exec => 
      exec.ruleId === rule.id && 
      exec.triggeredAt >= today
    );
    
    return todayExecutions.length >= rule.maxPerDay;
  }
  
  /**
   * Track execution history
   */
  private trackExecution(userId: string, execution: InterventionExecution): void {
    if (!this.executionHistory.has(userId)) {
      this.executionHistory.set(userId, []);
    }
    
    this.executionHistory.get(userId)!.push(execution);
    
    // Keep only last 100 executions per user
    const history = this.executionHistory.get(userId)!;
    if (history.length > 100) {
      this.executionHistory.set(userId, history.slice(-100));
    }
  }
  
  /**
   * Persist execution to database
   */
  private async persistExecution(execution: InterventionExecution): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      await supabase
        .from('interventions')
        .insert({
          id: execution.id,
          rule_id: execution.ruleId,
          user_id: execution.userId,
          session_id: execution.sessionId,
          emotion: execution.emotion,
          confidence: execution.confidence,
          triggered_at: execution.triggeredAt.toISOString(),
          actions: execution.actions,
          status: execution.actions.every(a => a.status === 'success') ? 'success' : 'partial'
        });
    } catch (error) {
      console.error('Failed to persist intervention:', error);
    }
  }
  
  /**
   * Estimate revenue impact
   */
  private estimateRevenueImpact(rule: InterventionRule, identity: UserIdentity | null): number {
    if (!identity?.value) return 0;
    
    // Rough estimates based on emotion and intervention type
    const impactMultipliers: Record<string, number> = {
      'rage': 0.8, // 80% chance of losing customer
      'abandonment': 0.7,
      'frustration': 0.5,
      'confusion': 0.3,
      'anxiety': 0.4,
      'decision_paralysis': 0.6,
      'hesitation': 0.2,
      'delight': -0.2, // Negative = opportunity for upsell
      'confidence': -0.3,
      'discovery': -0.1
    };
    
    const multiplier = impactMultipliers[rule.emotion] || 0;
    
    // If intervention was successful, we saved this potential loss
    return Math.abs(identity.value * multiplier);
  }
  
  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get intervention statistics
   */
  getStats(): {
    totalRules: number;
    totalExecutions: number;
    successRate: number;
    estimatedRevenueSaved: number;
  } {
    let totalExecutions = 0;
    let successfulExecutions = 0;
    let revenueSaved = 0;
    
    for (const history of this.executionHistory.values()) {
      for (const execution of history) {
        totalExecutions++;
        if (execution.actions.every(a => a.status === 'success')) {
          successfulExecutions++;
        }
        revenueSaved += execution.revenue_impact || 0;
      }
    }
    
    return {
      totalRules: this.rules.size,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      estimatedRevenueSaved: revenueSaved
    };
  }
}

// Singleton instance
export const interventionEngine = new InterventionEngine();

export default interventionEngine;