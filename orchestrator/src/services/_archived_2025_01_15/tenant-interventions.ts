/**
 * Tenant-Aware Intervention Configuration Service
 * 
 * Allows each tenant to customize intervention rules, messages, and branding
 * while maintaining base templates and best practices.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { interventionEngine, InterventionRule, InterventionAction } from './intervention-engine.js';
import { EventEmitter } from 'events';

// Lazy-initialize Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

export interface TenantInterventionConfig {
  tenantId: string;
  ruleId: string;
  enabled: boolean;
  customizations: InterventionCustomization;
  branding: TenantBranding;
  permissions: TenantPermissions;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterventionCustomization {
  name?: string;
  messages?: Record<string, string>; // Override default messages
  actions?: Partial<InterventionAction>[];
  conditions?: any[]; // Additional conditions
  cooldownMinutes?: number;
  maxPerDay?: number;
  priority?: number;
  channels?: ChannelConfig;
}

export interface ChannelConfig {
  slack?: {
    enabled: boolean;
    channel?: string;
    webhookUrl?: string;
  };
  email?: {
    enabled: boolean;
    fromAddress?: string;
    replyTo?: string;
    templates?: Record<string, string>;
  };
  sms?: {
    enabled: boolean;
    fromNumber?: string;
    provider?: 'twilio' | 'aws_sns';
  };
  chat?: {
    enabled: boolean;
    provider?: 'intercom' | 'zendesk' | 'drift' | 'custom';
    autoAssign?: boolean;
  };
}

export interface TenantBranding {
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customCSS?: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  signature?: string;
}

export interface TenantPermissions {
  canEdit: string[]; // User IDs who can edit
  canView: string[]; // User IDs who can view
  canTest: string[]; // User IDs who can test
  canApprove: string[]; // User IDs who need to approve changes
  requiresApproval: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalNotes?: string;
}

export interface InterventionTemplate {
  id: string;
  category: 'rage' | 'confusion' | 'abandonment' | 'delight' | 'conversion' | 'retention';
  name: string;
  description: string;
  bestFor: string[];
  expectedImpact: {
    metric: string;
    improvement: string;
  };
  baseRule: Partial<InterventionRule>;
  customizable: string[]; // Which fields can be customized
  industry?: string[];
  tier?: 'starter' | 'growth' | 'enterprise';
}

class TenantInterventionService extends EventEmitter {
  private tenantConfigs: Map<string, Map<string, TenantInterventionConfig>> = new Map();
  private templates: Map<string, InterventionTemplate> = new Map();
  private tenantRules: Map<string, InterventionRule[]> = new Map();
  
  constructor() {
    super();
    this.loadTemplates();
  }
  
  /**
   * Load intervention templates
   */
  private loadTemplates(): void {
    // High-value rage template
    this.templates.set('high_value_rage', {
      id: 'high_value_rage',
      category: 'rage',
      name: 'High-Value Customer Rage Response',
      description: 'Immediate escalation for valuable customers showing frustration',
      bestFor: ['SaaS', 'Enterprise Software', 'Financial Services'],
      expectedImpact: {
        metric: 'Churn Prevention',
        improvement: '65% reduction in high-value churn'
      },
      baseRule: {
        emotion: 'rage',
        minConfidence: 85,
        priority: 1,
        cooldownMinutes: 30
      },
      customizable: ['messages', 'channels', 'escalation_path', 'priority'],
      industry: ['technology', 'finance', 'healthcare'],
      tier: 'enterprise'
    });
    
    // Confusion assistance template
    this.templates.set('confusion_assist', {
      id: 'confusion_assist',
      category: 'confusion',
      name: 'Proactive Confusion Assistance',
      description: 'Help users when they show signs of confusion',
      bestFor: ['Complex Products', 'First-time Users', 'Onboarding'],
      expectedImpact: {
        metric: 'Task Completion',
        improvement: '40% increase in completion rate'
      },
      baseRule: {
        emotion: 'confusion',
        minConfidence: 70,
        priority: 3,
        cooldownMinutes: 60
      },
      customizable: ['messages', 'help_content', 'chat_behavior'],
      industry: ['all'],
      tier: 'starter'
    });
    
    // Abandonment prevention template
    this.templates.set('abandonment_save', {
      id: 'abandonment_save',
      category: 'abandonment',
      name: 'Cart Abandonment Prevention',
      description: 'Prevent users from leaving during checkout',
      bestFor: ['E-commerce', 'SaaS Trials', 'Subscription Services'],
      expectedImpact: {
        metric: 'Conversion Rate',
        improvement: '25% reduction in abandonment'
      },
      baseRule: {
        emotion: 'abandonment',
        minConfidence: 80,
        priority: 2,
        cooldownMinutes: 120
      },
      customizable: ['offer_type', 'discount_amount', 'urgency_level'],
      industry: ['ecommerce', 'saas', 'retail'],
      tier: 'growth'
    });
    
    // Purchase intent accelerator
    this.templates.set('purchase_accelerator', {
      id: 'purchase_accelerator',
      category: 'conversion',
      name: 'Purchase Intent Accelerator',
      description: 'Convert high-intent visitors into customers',
      bestFor: ['Pricing Pages', 'Product Pages', 'Demo Requests'],
      expectedImpact: {
        metric: 'Conversion Rate',
        improvement: '35% increase in conversions'
      },
      baseRule: {
        emotion: 'purchase_intent',
        minConfidence: 75,
        priority: 2,
        cooldownMinutes: 180
      },
      customizable: ['incentive_type', 'urgency', 'social_proof'],
      industry: ['all'],
      tier: 'growth'
    });
    
    // Delight amplifier
    this.templates.set('delight_amplifier', {
      id: 'delight_amplifier',
      category: 'delight',
      name: 'Delight Moment Amplifier',
      description: 'Turn happy customers into advocates',
      bestFor: ['Post-purchase', 'Feature Discovery', 'Milestone Achievement'],
      expectedImpact: {
        metric: 'Referral Rate',
        improvement: '50% increase in referrals'
      },
      baseRule: {
        emotion: 'delight',
        minConfidence: 85,
        priority: 4,
        cooldownMinutes: 240
      },
      customizable: ['reward_type', 'share_incentive', 'celebration_style'],
      industry: ['all'],
      tier: 'starter'
    });
  }
  
  /**
   * Get templates for a tenant based on their tier and industry
   */
  async getAvailableTemplates(tenantId: string): Promise<InterventionTemplate[]> {
    const tenant = await this.getTenantInfo(tenantId);
    
    return Array.from(this.templates.values()).filter(template => {
      // Filter by tier
      if (template.tier && tenant.tier !== 'enterprise' && template.tier === 'enterprise') {
        return false;
      }
      
      // Filter by industry if specified
      if (template.industry && template.industry.length > 0) {
        if (!template.industry.includes('all') && !template.industry.includes(tenant.industry)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Create custom intervention for tenant
   */
  async createCustomIntervention(
    tenantId: string,
    templateId: string,
    customization: InterventionCustomization,
    userId: string
  ): Promise<TenantInterventionConfig> {
    // Check permissions
    if (!await this.hasPermission(tenantId, userId, 'edit')) {
      throw new Error('User does not have permission to create interventions');
    }
    
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    // Get tenant branding
    const branding = await this.getTenantBranding(tenantId);
    
    // Create configuration
    const config: TenantInterventionConfig = {
      tenantId,
      ruleId: `${tenantId}_${templateId}_${Date.now()}`,
      enabled: true,
      customizations: customization,
      branding,
      permissions: {
        canEdit: [userId],
        canView: ['all'],
        canTest: [userId],
        canApprove: [],
        requiresApproval: false
      },
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store configuration
    await this.saveConfiguration(config);
    
    // Apply to intervention engine
    await this.applyToEngine(config, template);
    
    this.emit('intervention:created', { tenantId, config });
    
    return config;
  }
  
  /**
   * Update intervention configuration
   */
  async updateIntervention(
    tenantId: string,
    ruleId: string,
    updates: Partial<InterventionCustomization>,
    userId: string
  ): Promise<TenantInterventionConfig> {
    // Check permissions
    if (!await this.hasPermission(tenantId, userId, 'edit')) {
      throw new Error('User does not have permission to edit interventions');
    }
    
    const config = await this.getConfiguration(tenantId, ruleId);
    if (!config) {
      throw new Error(`Configuration not found for ${ruleId}`);
    }
    
    // Update configuration
    config.customizations = { ...config.customizations, ...updates };
    config.updatedBy = userId;
    config.updatedAt = new Date();
    
    // If requires approval, set status
    if (config.permissions.requiresApproval) {
      config.permissions.approvalStatus = 'pending';
    }
    
    // Save and apply
    await this.saveConfiguration(config);
    
    if (!config.permissions.requiresApproval || config.permissions.approvalStatus === 'approved') {
      const template = this.templates.get(ruleId.split('_')[1]);
      if (template) {
        await this.applyToEngine(config, template);
      }
    }
    
    this.emit('intervention:updated', { tenantId, config });
    
    return config;
  }
  
  /**
   * Delete intervention configuration
   */
  async deleteIntervention(tenantId: string, ruleId: string, userId: string): Promise<void> {
    // Check permissions
    if (!await this.hasPermission(tenantId, userId, 'edit')) {
      throw new Error('User does not have permission to delete interventions');
    }
    
    const config = await this.getConfiguration(tenantId, ruleId);
    if (!config) {
      throw new Error(`Configuration not found for ${ruleId}`);
    }
    
    // Remove from memory
    const tenantMap = this.tenantConfigs.get(tenantId);
    if (tenantMap) {
      tenantMap.delete(ruleId);
    }
    
    // Remove from database
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase
        .from('intervention_configs')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('rule_id', ruleId);
    }
    
    // Remove from intervention engine
    // TODO: Add removeRule method to intervention engine
    // interventionEngine.removeRule(ruleId);
    
    // Update tenant rules
    const rules = this.tenantRules.get(tenantId);
    if (rules) {
      const index = rules.findIndex(r => r.id === ruleId);
      if (index >= 0) {
        rules.splice(index, 1);
      }
    }
    
    this.emit('intervention:deleted', { tenantId, ruleId });
  }
  
  /**
   * Apply configuration to intervention engine
   */
  private async applyToEngine(config: TenantInterventionConfig, template: InterventionTemplate): Promise<void> {
    const baseRule = template.baseRule;
    
    // Build custom rule
    const customRule: InterventionRule = {
      id: config.ruleId,
      name: config.customizations.name || template.name,
      emotion: baseRule.emotion!,
      minConfidence: baseRule.minConfidence!,
      conditions: [...(baseRule.conditions || []), ...(config.customizations.conditions || [])],
      actions: this.buildCustomActions(config, template),
      priority: config.customizations.priority || baseRule.priority!,
      cooldownMinutes: config.customizations.cooldownMinutes || baseRule.cooldownMinutes,
      maxPerDay: config.customizations.maxPerDay || baseRule.maxPerDay
    };
    
    // Add tenant-specific rule
    interventionEngine.addRule(customRule);
    
    // Track tenant rules
    if (!this.tenantRules.has(config.tenantId)) {
      this.tenantRules.set(config.tenantId, []);
    }
    this.tenantRules.get(config.tenantId)!.push(customRule);
  }
  
  /**
   * Build custom actions with branding and customization
   */
  private buildCustomActions(config: TenantInterventionConfig, template: InterventionTemplate): InterventionAction[] {
    const actions: InterventionAction[] = [];
    const { customizations, branding } = config;
    
    // Process each channel
    if (customizations.channels?.slack?.enabled) {
      actions.push({
        type: 'slack',
        config: {
          channel: customizations.channels.slack.channel || '#alerts',
          webhookUrl: customizations.channels.slack.webhookUrl,
          message: this.applyBranding(
            customizations.messages?.slack || 'Customer needs attention',
            branding
          )
        }
      });
    }
    
    if (customizations.channels?.email?.enabled) {
      actions.push({
        type: 'email',
        config: {
          from: customizations.channels.email.fromAddress,
          replyTo: customizations.channels.email.replyTo,
          template: 'custom',
          subject: this.applyBranding(
            customizations.messages?.emailSubject || 'We noticed you might need help',
            branding
          ),
          body: this.applyBranding(
            customizations.messages?.emailBody || 'Our team is here to assist you.',
            branding
          )
        }
      });
    }
    
    if (customizations.channels?.chat?.enabled) {
      actions.push({
        type: 'chat',
        config: {
          provider: customizations.channels.chat.provider,
          autoAssign: customizations.channels.chat.autoAssign,
          message: this.applyBranding(
            customizations.messages?.chat || 'How can we help you today?',
            branding
          )
        }
      });
    }
    
    // Add UI changes if specified
    if (customizations.messages?.uiModal) {
      actions.push({
        type: 'ui_change',
        config: {
          action: 'show_modal',
          title: this.applyBranding(customizations.messages.modalTitle || '', branding),
          message: this.applyBranding(customizations.messages.uiModal, branding),
          styles: this.getBrandingStyles(branding)
        }
      });
    }
    
    return actions;
  }
  
  /**
   * Apply branding to message
   */
  private applyBranding(message: string, branding: TenantBranding): string {
    let branded = message
      .replace(/\{\{company\}\}/g, branding.companyName)
      .replace(/\{\{signature\}\}/g, branding.signature || '');
    
    // Apply tone adjustments
    if (branding.tone === 'casual') {
      branded = branded.replace(/We would like to/g, "We'd love to");
    } else if (branding.tone === 'formal') {
      branded = branded.replace(/Hi/g, 'Greetings');
    }
    
    return branded;
  }
  
  /**
   * Get branding styles
   */
  private getBrandingStyles(branding: TenantBranding): any {
    return {
      primaryColor: branding.primaryColor || '#007bff',
      secondaryColor: branding.secondaryColor || '#6c757d',
      fontFamily: branding.fontFamily || 'system-ui',
      logoUrl: branding.logoUrl,
      customCSS: branding.customCSS
    };
  }
  
  /**
   * Test intervention configuration
   */
  async testIntervention(
    tenantId: string,
    ruleId: string,
    testData: {
      userId?: string;
      sessionId: string;
      emotion: string;
      confidence: number;
      pageUrl: string;
    },
    userId: string
  ): Promise<any> {
    // Check permissions
    if (!await this.hasPermission(tenantId, userId, 'test')) {
      throw new Error('User does not have permission to test interventions');
    }
    
    const config = await this.getConfiguration(tenantId, ruleId);
    if (!config) {
      throw new Error(`Configuration not found for ${ruleId}`);
    }
    
    // Execute test
    const result = await interventionEngine.processEmotionalEvent({
      ...testData,
      predictedAction: 'test',
      interventionWindow: 5000
    });
    
    // Log test
    await this.logTest(tenantId, ruleId, userId, testData, result);
    
    return {
      config,
      testData,
      result,
      preview: this.generatePreview(config, testData)
    };
  }
  
  /**
   * Generate preview of intervention
   */
  private generatePreview(config: TenantInterventionConfig, testData: any): any {
    const preview: any = {
      messages: {},
      styles: this.getBrandingStyles(config.branding)
    };
    
    // Generate message previews
    if (config.customizations.messages) {
      for (const [key, message] of Object.entries(config.customizations.messages)) {
        preview.messages[key] = this.interpolateTestData(
          this.applyBranding(message, config.branding),
          testData
        );
      }
    }
    
    return preview;
  }
  
  /**
   * Interpolate test data into message
   */
  private interpolateTestData(message: string, data: any): string {
    return message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || `[${key}]`;
    });
  }
  
  /**
   * Check user permission
   */
  private async hasPermission(tenantId: string, userId: string, action: 'view' | 'edit' | 'test'): Promise<boolean> {
    // Check if user is tenant admin
    const isAdmin = await this.isTenantAdmin(tenantId, userId);
    if (isAdmin) return true;
    
    // Check specific permissions
    const configs = await this.getTenantConfigurations(tenantId);
    for (const config of configs) {
      const perms = config.permissions;
      if (action === 'view' && (perms.canView.includes('all') || perms.canView.includes(userId))) {
        return true;
      }
      if (action === 'edit' && perms.canEdit.includes(userId)) {
        return true;
      }
      if (action === 'test' && perms.canTest.includes(userId)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if user is tenant admin
   */
  private async isTenantAdmin(tenantId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    
    const { data } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();
    
    return data?.role === 'admin';
  }
  
  /**
   * Get tenant info
   */
  private async getTenantInfo(tenantId: string): Promise<any> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { tier: 'starter', industry: 'general' };
    }
    
    const { data } = await supabase
      .from('tenants')
      .select('tier, industry, settings')
      .eq('id', tenantId)
      .single();
    
    return data || { tier: 'starter', industry: 'general' };
  }
  
  /**
   * Get tenant branding
   */
  private async getTenantBranding(tenantId: string): Promise<TenantBranding> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        companyName: 'Your Company',
        tone: 'professional'
      };
    }
    
    const { data } = await supabase
      .from('tenant_branding')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
    
    return data || {
      companyName: 'Your Company',
      tone: 'professional'
    };
  }
  
  /**
   * Save configuration
   */
  private async saveConfiguration(config: TenantInterventionConfig): Promise<void> {
    // Store in memory
    if (!this.tenantConfigs.has(config.tenantId)) {
      this.tenantConfigs.set(config.tenantId, new Map());
    }
    this.tenantConfigs.get(config.tenantId)!.set(config.ruleId, config);
    
    // Persist to database
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase
        .from('intervention_configs')
        .upsert({
          tenant_id: config.tenantId,
          rule_id: config.ruleId,
          enabled: config.enabled,
          customizations: config.customizations,
          branding: config.branding,
          permissions: config.permissions,
          created_by: config.createdBy,
          updated_by: config.updatedBy,
          created_at: config.createdAt.toISOString(),
          updated_at: config.updatedAt.toISOString()
        });
    }
  }
  
  /**
   * Get configuration
   */
  async getConfiguration(tenantId: string, ruleId: string): Promise<TenantInterventionConfig | null> {
    // Check memory
    const tenantMap = this.tenantConfigs.get(tenantId);
    if (tenantMap?.has(ruleId)) {
      return tenantMap.get(ruleId)!;
    }
    
    // Check database
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from('intervention_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('rule_id', ruleId)
        .single();
      
      if (data) {
        const config: TenantInterventionConfig = {
          ...data,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };
        
        // Cache it
        if (!this.tenantConfigs.has(tenantId)) {
          this.tenantConfigs.set(tenantId, new Map());
        }
        this.tenantConfigs.get(tenantId)!.set(ruleId, config);
        
        return config;
      }
    }
    
    return null;
  }
  
  /**
   * Get all tenant configurations
   */
  async getTenantConfigurations(tenantId: string): Promise<TenantInterventionConfig[]> {
    const configs: TenantInterventionConfig[] = [];
    
    // Check memory
    const tenantMap = this.tenantConfigs.get(tenantId);
    if (tenantMap) {
      configs.push(...tenantMap.values());
    }
    
    // Check database if no cached configs
    if (configs.length === 0) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from('intervention_configs')
          .select('*')
          .eq('tenant_id', tenantId);
        
        if (data) {
          for (const item of data) {
            const config: TenantInterventionConfig = {
              ...item,
              createdAt: new Date(item.created_at),
              updatedAt: new Date(item.updated_at)
            };
            configs.push(config);
            
            // Cache it
            if (!this.tenantConfigs.has(tenantId)) {
              this.tenantConfigs.set(tenantId, new Map());
            }
            this.tenantConfigs.get(tenantId)!.set(config.ruleId, config);
          }
        }
      }
    }
    
    return configs;
  }
  
  /**
   * Log test execution
   */
  private async logTest(tenantId: string, ruleId: string, userId: string, testData: any, result: any): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase
        .from('intervention_tests')
        .insert({
          tenant_id: tenantId,
          rule_id: ruleId,
          user_id: userId,
          test_data: testData,
          result: result,
          created_at: new Date().toISOString()
        });
    }
  }
  
  /**
   * Get intervention analytics
   */
  async getAnalytics(tenantId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    const configs = await this.getTenantConfigurations(tenantId);
    const analytics: any = {
      totalInterventions: configs.length,
      enabledInterventions: configs.filter(c => c.enabled).length,
      byCategory: {},
      performance: []
    };
    
    // Get performance data from intervention engine
    for (const config of configs) {
      const stats = interventionEngine.getStats();
      analytics.performance.push({
        ruleId: config.ruleId,
        name: config.customizations.name,
        ...stats
      });
    }
    
    return analytics;
  }
}

// Singleton instance
export const tenantInterventionService = new TenantInterventionService();

export default tenantInterventionService;