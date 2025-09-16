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
import { EmotionalState, EmotionalSession, InterventionDecision } from '../types/emotional-state.js';
import { unifiedWS } from './unified-websocket.js';

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
  abTest?: ABTestConfig; // A/B testing configuration
  effectiveness?: EffectivenessMetrics; // Track intervention success
}

export interface ABTestConfig {
  enabled: boolean;
  variants: InterventionVariant[];
  allocation: 'random' | 'weighted' | 'ml_optimized';
  successMetric: 'conversion' | 'retention' | 'revenue' | 'satisfaction';
}

export interface InterventionVariant {
  id: string;
  weight: number; // 0-100, sum should be 100
  actions: InterventionAction[];
  performance?: VariantPerformance;
}

export interface VariantPerformance {
  impressions: number;
  conversions: number;
  revenue: number;
  averageTimeToConversion: number;
}

export interface EffectivenessMetrics {
  totalTriggers: number;
  successfulOutcomes: number;
  revenueImpact: number;
  avgTimeToResolution: number;
  userSatisfactionScore?: number;
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
  private variantPerformance: Map<string, Map<string, VariantPerformance>> = new Map();
  private abTestAllocations: Map<string, string> = new Map(); // userId -> variantId
  
  constructor() {
    super();
    this.loadDefaultRules();
  }
  
  /**
   * Load default intervention rules with A/B testing and sophisticated templates
   */
  private loadDefaultRules(): void {
    // High-value customer rage intervention with A/B testing
    this.addRule({
      id: 'high_value_rage',
      name: 'High-Value Customer Rage Intervention',
      emotion: 'rage',
      minConfidence: 85,
      conditions: [
        { type: 'user_value', operator: 'greater_than', value: 10000 }
      ],
      actions: [], // Will be determined by A/B test variant
      abTest: {
        enabled: true,
        allocation: 'weighted',
        successMetric: 'retention',
        variants: [
          {
            id: 'immediate_human',
            weight: 40,
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
                  message: "I'm connecting you with our team lead immediately.",
                  assignToAgent: true,
                  priority: 'urgent',
                  agentTier: 'senior'
                }
              }
            ]
          },
          {
            id: 'proactive_discount',
            weight: 30,
            actions: [
              {
                type: 'ui_change',
                config: {
                  action: 'show_modal',
                  title: "We value your business",
                  message: "We noticed you might be frustrated. Here's 20% off your next month as our apology.",
                  ctaText: "Apply Discount",
                  ctaAction: 'apply_discount_20'
                }
              },
              {
                type: 'discount',
                config: {
                  type: 'percentage',
                  amount: 20,
                  duration: 'next_month',
                  autoApply: true
                }
              }
            ]
          },
          {
            id: 'executive_escalation',
            weight: 30,
            actions: [
              {
                type: 'sms',
                config: {
                  to: 'executive_oncall',
                  message: 'Enterprise customer {{company}} showing rage. Immediate intervention needed. Dashboard: {{dashboardUrl}}'
                }
              },
              {
                type: 'email',
                config: {
                  to: '{{accountManagerEmail}}',
                  cc: 'customer-success@company.com',
                  template: 'rage_intervention',
                  priority: 'high',
                  calendar_invite: true
                }
              }
            ]
          }
        ]
      },
      priority: 1,
      cooldownMinutes: 30,
      effectiveness: {
        totalTriggers: 0,
        successfulOutcomes: 0,
        revenueImpact: 0,
        avgTimeToResolution: 0
      }
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
    
    // Pricing page sticker shock intervention
    this.addRule({
      id: 'sticker_shock',
      name: 'Pricing Sticker Shock Recovery',
      emotion: 'sticker_shock',
      minConfidence: 75,
      conditions: [
        { type: 'page_url', operator: 'contains', value: '/pricing' }
      ],
      actions: [
        {
          type: 'ui_change',
          config: {
            action: 'show_roi_calculator',
            position: 'sidebar',
            prefilledData: {
              industry: '{{industry}}',
              teamSize: '{{teamSize}}'
            }
          }
        },
        {
          type: 'chat',
          config: {
            proactiveMessage: "Our average customer sees 3.2x ROI in 90 days. Want to see your potential savings?",
            showCalculator: true
          },
          delay: 2000
        }
      ],
      priority: 3,
      cooldownMinutes: 60
    });
    
    // Decision paralysis intervention with A/B testing
    this.addRule({
      id: 'decision_paralysis',
      name: 'Decision Paralysis Resolution',
      emotion: 'decision_paralysis',
      minConfidence: 70,
      conditions: [
        { type: 'page_url', operator: 'contains', value: '/pricing' }
      ],
      actions: [],
      abTest: {
        enabled: true,
        allocation: 'ml_optimized',
        successMetric: 'conversion',
        variants: [
          {
            id: 'simplify_choices',
            weight: 33,
            actions: [
              {
                type: 'ui_change',
                config: {
                  action: 'hide_plans',
                  keepPlans: ['recommended'],
                  message: 'Based on your profile, we recommend:'
                }
              }
            ]
          },
          {
            id: 'social_proof',
            weight: 33,
            actions: [
              {
                type: 'ui_change',
                config: {
                  action: 'show_similar_companies',
                  message: 'Companies like yours choose:',
                  showLogos: true,
                  showTestimonials: true
                }
              }
            ]
          },
          {
            id: 'guided_selection',
            weight: 34,
            actions: [
              {
                type: 'ui_change',
                config: {
                  action: 'launch_wizard',
                  steps: ['team_size', 'use_case', 'budget'],
                  showRecommendation: true
                }
              },
              {
                type: 'chat',
                config: {
                  proactiveMessage: "Let me help you find the perfect plan in 30 seconds.",
                  launchWizard: true
                }
              }
            ]
          }
        ]
      },
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
    
    // Exit risk pattern intervention
    this.addRule({
      id: 'exit_risk',
      name: 'Exit Risk Prevention',
      emotion: 'exit_risk',
      minConfidence: 85,
      conditions: [],
      actions: [
        {
          type: 'ui_change',
          config: {
            action: 'show_exit_modal',
            title: 'Before you go...',
            offer: 'personalized_demo',
            urgency: 'limited_time'
          }
        },
        {
          type: 'webhook',
          config: {
            eventType: 'exit_risk_detected',
            priority: 'high'
          }
        }
      ],
      priority: 2,
      cooldownMinutes: 120
    });
    
    // Purchase intent intervention
    this.addRule({
      id: 'purchase_intent',
      name: 'Purchase Intent Optimization',
      emotion: 'purchase_intent',
      minConfidence: 80,
      conditions: [
        { type: 'page_url', operator: 'contains', value: '/pricing' }
      ],
      actions: [
        {
          type: 'ui_change',
          config: {
            action: 'show_limited_offer',
            discount: 15,
            expiresIn: '24_hours',
            showCountdown: true
          }
        },
        {
          type: 'slack',
          config: {
            channel: '#sales-signals',
            message: '🎯 High purchase intent: {{email}} from {{company}} on pricing page'
          }
        }
      ],
      priority: 2,
      cooldownMinutes: 180
    });
    
    // Skepticism handling
    this.addRule({
      id: 'skepticism_handler',
      name: 'Skepticism to Trust Builder',
      emotion: 'skepticism',
      minConfidence: 70,
      conditions: [],
      actions: [
        {
          type: 'ui_change',
          config: {
            action: 'show_trust_signals',
            elements: ['security_badges', 'customer_logos', 'testimonials', 'guarantees']
          }
        },
        {
          type: 'chat',
          config: {
            proactiveMessage: 'I can connect you with a customer in your industry who loves our product.',
            offerReferenceCall: true
          },
          delay: 5000
        }
      ],
      priority: 3,
      cooldownMinutes: 90
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
   * Select A/B test variant
   */
  private selectVariant(rule: InterventionRule, userId: string): InterventionVariant | null {
    if (!rule.abTest?.enabled || !rule.abTest.variants.length) {
      return null;
    }
    
    // Check if user already has an allocation
    const existingAllocation = this.abTestAllocations.get(`${rule.id}_${userId}`);
    if (existingAllocation) {
      return rule.abTest.variants.find(v => v.id === existingAllocation) || null;
    }
    
    // Select variant based on allocation strategy
    let selectedVariant: InterventionVariant | null = null;
    
    switch (rule.abTest.allocation) {
      case 'random':
        const randomIndex = Math.floor(Math.random() * rule.abTest.variants.length);
        selectedVariant = rule.abTest.variants[randomIndex];
        break;
        
      case 'weighted':
        const random = Math.random() * 100;
        let cumulative = 0;
        for (const variant of rule.abTest.variants) {
          cumulative += variant.weight;
          if (random <= cumulative) {
            selectedVariant = variant;
            break;
          }
        }
        break;
        
      case 'ml_optimized':
        // Use Thompson Sampling or similar for optimization
        selectedVariant = this.selectOptimalVariant(rule);
        break;
    }
    
    if (selectedVariant) {
      // Store allocation
      this.abTestAllocations.set(`${rule.id}_${userId}`, selectedVariant.id);
    }
    
    return selectedVariant;
  }
  
  /**
   * Select optimal variant using Thompson Sampling
   */
  private selectOptimalVariant(rule: InterventionRule): InterventionVariant {
    const variants = rule.abTest!.variants;
    let bestVariant = variants[0];
    let bestScore = 0;
    
    for (const variant of variants) {
      const perf = variant.performance || { impressions: 0, conversions: 0, revenue: 0, averageTimeToConversion: 0 };
      
      // Thompson Sampling: sample from Beta distribution
      const alpha = perf.conversions + 1;
      const beta = perf.impressions - perf.conversions + 1;
      const sample = this.sampleBeta(alpha, beta);
      
      if (sample > bestScore) {
        bestScore = sample;
        bestVariant = variant;
      }
    }
    
    return bestVariant;
  }
  
  /**
   * Sample from Beta distribution (simplified)
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Simplified Beta sampling using uniform random
    // In production, use proper Beta distribution sampling
    return Math.pow(Math.random(), 1/alpha) / 
           (Math.pow(Math.random(), 1/alpha) + Math.pow(Math.random(), 1/beta));
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
    
    // Determine which actions to execute (A/B test or default)
    let actionsToExecute = rule.actions;
    let selectedVariantId: string | null = null;
    
    if (rule.abTest?.enabled) {
      const variant = this.selectVariant(rule, event.userId || event.sessionId);
      if (variant) {
        actionsToExecute = variant.actions;
        selectedVariantId = variant.id;
        
        // Track variant impression
        this.trackVariantImpression(rule.id, variant.id);
      }
    }
    
    // Execute each action
    for (const action of actionsToExecute) {
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
    
    // Track variant performance if A/B test
    if (selectedVariantId) {
      this.trackVariantOutcome(rule.id, selectedVariantId, execution);
    }
    
    // Update rule effectiveness metrics
    this.updateRuleEffectiveness(rule, execution);
    
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
  private async sendSlackAlert(config: any, _event: any, identity: UserIdentity | null): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) {
      console.warn('Slack webhook not configured');
      return;
    }
    
    const message = this.interpolateTemplate(config.message, _event, identity);
    
    // Send to Slack (simplified - would use proper Slack client in production)
    console.log(`📢 Slack Alert: ${message}`);
  }
  
  /**
   * Send email
   */
  private async sendEmail(config: any, _event: any, identity: UserIdentity | null): Promise<void> {
    if (!identity?.email) {
      console.warn('No email address for user');
      return;
    }
    
    const subject = this.interpolateTemplate(config.subject, _event, identity);
    
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
  private async triggerUIChange(config: any, _event: any): Promise<void> {
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
  private async applyDiscount(config: any, _event: any, _identity: UserIdentity | null): Promise<void> {
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
   * Track variant impression
   */
  private trackVariantImpression(ruleId: string, variantId: string): void {
    if (!this.variantPerformance.has(ruleId)) {
      this.variantPerformance.set(ruleId, new Map());
    }
    
    const rulePerf = this.variantPerformance.get(ruleId)!;
    if (!rulePerf.has(variantId)) {
      rulePerf.set(variantId, {
        impressions: 0,
        conversions: 0,
        revenue: 0,
        averageTimeToConversion: 0
      });
    }
    
    const perf = rulePerf.get(variantId)!;
    perf.impressions++;
  }
  
  /**
   * Track variant outcome
   */
  private trackVariantOutcome(ruleId: string, variantId: string, execution: InterventionExecution): void {
    const rulePerf = this.variantPerformance.get(ruleId);
    if (!rulePerf) return;
    
    const perf = rulePerf.get(variantId);
    if (!perf) return;
    
    // Check if intervention was successful
    const wasSuccessful = execution.actions.every(a => a.status === 'success');
    if (wasSuccessful) {
      perf.conversions++;
      perf.revenue += execution.revenue_impact || 0;
    }
  }
  
  /**
   * Update rule effectiveness metrics
   */
  private updateRuleEffectiveness(rule: InterventionRule, execution: InterventionExecution): void {
    if (!rule.effectiveness) {
      rule.effectiveness = {
        totalTriggers: 0,
        successfulOutcomes: 0,
        revenueImpact: 0,
        avgTimeToResolution: 0
      };
    }
    
    rule.effectiveness.totalTriggers++;
    
    const wasSuccessful = execution.actions.every(a => a.status === 'success');
    if (wasSuccessful) {
      rule.effectiveness.successfulOutcomes++;
    }
    
    rule.effectiveness.revenueImpact += execution.revenue_impact || 0;
  }
  
  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `int_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  
  /**
   * Get A/B test results
   */
  getABTestResults(ruleId: string): any {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.abTest) return null;
    
    const results: any = {
      rule: rule.name,
      variants: []
    };
    
    const rulePerf = this.variantPerformance.get(ruleId);
    if (!rulePerf) return results;
    
    for (const variant of rule.abTest.variants) {
      const perf = rulePerf.get(variant.id) || {
        impressions: 0,
        conversions: 0,
        revenue: 0,
        averageTimeToConversion: 0
      };
      
      results.variants.push({
        id: variant.id,
        weight: variant.weight,
        impressions: perf.impressions,
        conversions: perf.conversions,
        conversionRate: perf.impressions > 0 ? perf.conversions / perf.impressions : 0,
        revenue: perf.revenue,
        revenuePerImpression: perf.impressions > 0 ? perf.revenue / perf.impressions : 0
      });
    }
    
    // Calculate statistical significance
    if (results.variants.length === 2) {
      const [a, b] = results.variants;
      const significance = this.calculateSignificance(
        a.conversions, a.impressions,
        b.conversions, b.impressions
      );
      results.statisticalSignificance = significance;
      results.winner = significance > 0.95 ? 
        (a.conversionRate > b.conversionRate ? a.id : b.id) : 
        'insufficient_data';
    }
    
    return results;
  }
  
  /**
   * Calculate statistical significance (simplified)
   */
  private calculateSignificance(conversionsA: number, impressionsA: number, 
                                conversionsB: number, impressionsB: number): number {
    // Simplified z-test
    if (impressionsA < 30 || impressionsB < 30) return 0;
    
    const rateA = conversionsA / impressionsA;
    const rateB = conversionsB / impressionsB;
    const pooledRate = (conversionsA + conversionsB) / (impressionsA + impressionsB);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/impressionsA + 1/impressionsB));
    const zScore = Math.abs(rateA - rateB) / standardError;
    
    // Convert z-score to confidence level (simplified)
    return Math.min(0.99, Math.max(0, 1 - Math.exp(-zScore * zScore / 2)));
  }
  
  /**
   * CORE DECISION ENGINE - Process emotional state and decide on interventions
   * This is THE method that replaces behavior-processor's intervention logic
   */
  async processEmotionalState(state: EmotionalState): Promise<InterventionDecision | null> {
    const { sessionId, emotion, confidence, intensity, frustration, anxiety, urgency } = state;

    console.log(`🧠 Intervention Engine received: ${emotion} for ${sessionId}`);
    console.log(`   Vectors - Frustration: ${frustration}%, Anxiety: ${anxiety}%, Urgency: ${urgency}%`);

    // Map emotional patterns to intervention types
    const interventionMap = this.getInterventionForEmotion(emotion, {
      frustration: frustration || 0,
      anxiety: anxiety || 0,
      urgency: urgency || 0,
      intensity: intensity || confidence
    });

    if (!interventionMap) return null;

    // Check cooldowns
    if (this.isOnCooldown(sessionId, interventionMap.type)) {
      console.log(`⏸️ Intervention ${interventionMap.type} on cooldown for ${sessionId}`);
      return null;
    }

    // Build decision
    const decision: InterventionDecision = {
      sessionId,
      interventionType: interventionMap.type,
      reason: interventionMap.reason,
      confidence: confidence * (interventionMap.multiplier || 1),
      priority: this.calculatePriority(state),
      timing: this.calculateTiming(state)
    };

    // Execute if high priority
    if (decision.priority === 'critical' || decision.priority === 'high') {
      await this.executeInterventionDecision(decision, state);
    }

    return decision;
  }

  /**
   * Map emotions to specific interventions - THE BRAIN
   */
  private getInterventionForEmotion(emotion: string, vectors: any): any {
    // Cart-specific emotions get immediate interventions
    const cartInterventions: Record<string, any> = {
      'cart_hesitation': {
        type: 'cart_save_modal',
        reason: 'Cart hesitation detected',
        multiplier: 1.2
      },
      'cart_shock': {
        type: 'discount_modal',
        reason: 'Price shock in cart',
        multiplier: 1.5
      },
      'cart_review': {
        type: 'value_popup',
        reason: 'Reviewing cart items',
        multiplier: 1.0
      },
      'abandonment_intent': {
        type: 'save_cart_urgent',
        reason: 'Abandonment signals detected',
        multiplier: 2.0
      }
    };

    if (cartInterventions[emotion]) {
      return cartInterventions[emotion];
    }

    // High frustration patterns
    if (vectors.frustration > 80) {
      if (vectors.urgency > 60) {
        return {
          type: 'help_offer',
          reason: 'High frustration with urgency',
          multiplier: 1.3
        };
      }
      return {
        type: 'live_chat',
        reason: 'Frustration threshold exceeded',
        multiplier: 1.1
      };
    }

    // High anxiety patterns
    if (vectors.anxiety > 75) {
      if (emotion === 'comparison_shopping') {
        return {
          type: 'comparison_chart',
          reason: 'Anxious comparison shopping',
          multiplier: 1.2
        };
      }
      return {
        type: 'money_back_guarantee',
        reason: 'High purchase anxiety',
        multiplier: 1.0
      };
    }

    // Price-related patterns
    if (emotion === 'price_shock' || emotion === 'sticker_shock') {
      if (vectors.intensity > 70) {
        return {
          type: 'payment_plan_offer',
          reason: 'Significant price shock',
          multiplier: 1.4
        };
      }
      return {
        type: 'discount_offer',
        reason: 'Price sensitivity detected',
        multiplier: 1.2
      };
    }

    // Trust-building patterns
    if (emotion === 'skeptical' || emotion === 'evaluation') {
      return {
        type: 'success_stories',
        reason: 'Building trust during evaluation',
        multiplier: 0.9
      };
    }

    return null;
  }

  /**
   * Calculate intervention priority based on emotional state
   */
  private calculatePriority(state: EmotionalState): 'low' | 'medium' | 'high' | 'critical' {
    const { emotion, confidence, frustration = 0, urgency = 0, sessionAge } = state;

    // Critical conditions
    if (emotion === 'abandonment_intent' && confidence > 80) return 'critical';
    if (emotion === 'cart_shock' && frustration > 70) return 'critical';
    if (frustration > 90) return 'critical';

    // High priority
    if (emotion.startsWith('cart_') && confidence > 70) return 'high';
    if (urgency > 80 && sessionAge > 60000) return 'high'; // Urgent after 1 min
    if (frustration > 70) return 'high';

    // Medium priority
    if (confidence > 60) return 'medium';
    if (urgency > 50) return 'medium';

    return 'low';
  }

  /**
   * Calculate optimal intervention timing
   */
  private calculateTiming(state: EmotionalState): 'immediate' | 'delayed' | 'optimal' {
    const { sessionAge, urgency = 0, emotion } = state;

    // Too early in session - wait
    if (sessionAge < 5000) return 'delayed'; // Wait 5 seconds minimum

    // Cart emotions need immediate action
    if (emotion.startsWith('cart_')) return 'immediate';
    if (emotion === 'abandonment_intent') return 'immediate';

    // High urgency = immediate
    if (urgency > 80) return 'immediate';

    // Otherwise find optimal moment
    return 'optimal';
  }

  /**
   * Check if intervention is on cooldown
   */
  private isOnCooldown(sessionId: string, interventionType: string): boolean {
    const cooldowns = this.userCooldowns.get(sessionId);
    if (!cooldowns) return false;

    const lastTriggered = cooldowns.get(interventionType);
    if (!lastTriggered) return false;

    const cooldownMs = 30000; // 30 second minimum between same intervention
    return Date.now() - lastTriggered.getTime() < cooldownMs;
  }

  /**
   * Execute the intervention decision (new emotion-based flow)
   */
  private async executeInterventionDecision(decision: InterventionDecision, state: EmotionalState): Promise<void> {
    const { sessionId, interventionType } = decision;

    // Send via WebSocket
    const sent = unifiedWS.sendIntervention(sessionId, interventionType);

    if (sent) {
      // Track cooldown
      if (!this.userCooldowns.has(sessionId)) {
        this.userCooldowns.set(sessionId, new Map());
      }
      this.userCooldowns.get(sessionId)!.set(interventionType, new Date());

      // Log to database
      await this.logInterventionDecision(decision, state);

      // Emit event for tracking
      this.emit('intervention_sent', {
        sessionId,
        interventionType,
        emotion: state.emotion,
        confidence: decision.confidence,
        reason: decision.reason
      });

      console.log(`✅ Intervention ${interventionType} sent to ${sessionId} - Reason: ${decision.reason}`);
    }
  }

  /**
   * Log intervention decision for learning
   */
  private async logInterventionDecision(decision: InterventionDecision, state: EmotionalState): Promise<void> {
    try {
      const client = getSupabaseClient();
      if (!client) return;

      await client.from('intervention_decisions').insert({
        session_id: decision.sessionId,
        tenant_id: state.tenantId,
        intervention_type: decision.interventionType,
        emotion: state.emotion,
        confidence: decision.confidence,
        priority: decision.priority,
        reason: decision.reason,
        emotional_vectors: {
          frustration: state.frustration,
          anxiety: state.anxiety,
          urgency: state.urgency,
          excitement: state.excitement,
          trust: state.trust
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log intervention decision:', error);
    }
  }

  /**
   * Get intervention statistics
   */
  getStats(): {
    totalRules: number;
    totalExecutions: number;
    successRate: number;
    estimatedRevenueSaved: number;
    abTests: any[];
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
    
    // Get A/B test results for rules with tests
    const abTests: any[] = [];
    for (const rule of this.rules.values()) {
      if (rule.abTest?.enabled) {
        const results = this.getABTestResults(rule.id);
        if (results) {
          abTests.push(results);
        }
      }
    }
    
    return {
      totalRules: this.rules.size,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      estimatedRevenueSaved: revenueSaved,
      abTests
    };
  }
}

// Singleton instance
export const interventionEngine = new InterventionEngine();

export default interventionEngine;