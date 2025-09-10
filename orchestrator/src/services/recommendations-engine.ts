/**
 * Recommendations Engine - The Accountability Layer
 * 
 * We don't just tell you what's happening. We tell you what to DO about it.
 * And we remember every recommendation we made. Every. Single. One.
 * When you ignore us, we keep score. When you act, we measure impact.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmotionalAnalytics, EmotionalInsight } from './emotional-analytics.js';
import { EmotionalLearningEngine } from './emotional-learning.js';

const supabase: SupabaseClient | null = 
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

export interface Recommendation {
  id: string;
  tenant_id: string;
  timestamp: Date;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  category: 'intervention' | 'optimization' | 'revenue' | 'retention' | 'emergency';
  title: string;
  description: string;
  emotional_trigger: string;
  confidence: number;
  potential_impact: {
    revenue: number;
    conversion_rate: number;
    user_satisfaction: number;
  };
  action_required: string;
  implementation_code?: string;
  status: 'pending' | 'viewed' | 'deployed' | 'ignored' | 'dismissed';
  outcome?: {
    deployed_at?: Date;
    actual_impact?: any;
    success?: boolean;
  };
}

export interface TenantScorecard {
  tenant_id: string;
  total_recommendations: number;
  acted_on: number;
  ignored: number;
  action_rate: number;
  revenue_left_on_table: number;
  missed_conversions: number;
  response_time_avg: number; // hours
  best_performing_action: string;
  worst_ignored_recommendation: string;
  accountability_score: number; // 0-100
}

export class RecommendationsEngine {
  private static alertThresholds = {
    rage_quit: 0.8,        // 80% confidence = wake them up
    mass_abandonment: 0.7,  // 70% confidence = alert
    revenue_spike: 0.85,    // 85% confidence = notify immediately
    system_failure: 0.9     // 90% confidence = emergency
  };

  /**
   * Generate recommendation from emotional insight
   */
  static async generateRecommendation(
    insight: EmotionalInsight,
    tenantId: string
  ): Promise<Recommendation> {
    const urgency = this.calculateUrgency(insight);
    const category = this.categorizeInsight(insight);
    
    const recommendation: Recommendation = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      timestamp: new Date(),
      urgency,
      category,
      title: this.generateTitle(insight),
      description: this.generateDescription(insight),
      emotional_trigger: insight.pattern,
      confidence: insight.confidence,
      potential_impact: {
        revenue: insight.revenue_impact,
        conversion_rate: insight.conversion_impact * 100,
        user_satisfaction: this.estimateSatisfactionImpact(insight)
      },
      action_required: insight.recommended_action,
      implementation_code: this.generateImplementationCode(insight),
      status: 'pending'
    };

    // Store recommendation
    if (supabase) {
      await supabase.from('recommendations').insert(recommendation);
    }

    // Check if this needs immediate alert
    if (urgency === 'critical') {
      await this.triggerAlert(recommendation);
    }

    return recommendation;
  }

  /**
   * Calculate urgency based on impact and confidence
   */
  private static calculateUrgency(insight: EmotionalInsight): 'critical' | 'high' | 'medium' | 'low' {
    const impactScore = Math.abs(insight.revenue_impact) + Math.abs(insight.conversion_impact * 1000);
    
    if (insight.pattern.includes('rage') || insight.pattern.includes('abandonment')) {
      if (insight.confidence > 85) return 'critical';
      if (insight.confidence > 70) return 'high';
    }
    
    if (impactScore > 1000 && insight.confidence > 80) return 'critical';
    if (impactScore > 500 && insight.confidence > 70) return 'high';
    if (impactScore > 100 && insight.confidence > 60) return 'medium';
    
    return 'low';
  }

  /**
   * Categorize insight for proper routing
   */
  private static categorizeInsight(insight: EmotionalInsight): Recommendation['category'] {
    if (insight.pattern.includes('rage') || insight.pattern.includes('frustration')) {
      return 'emergency';
    }
    if (insight.revenue_impact > 500) {
      return 'revenue';
    }
    if (insight.pattern.includes('abandonment') || insight.pattern.includes('hesitation')) {
      return 'retention';
    }
    if (insight.conversion_impact > 0.2) {
      return 'intervention';
    }
    return 'optimization';
  }

  /**
   * Generate human-readable title
   */
  private static generateTitle(insight: EmotionalInsight): string {
    const titles: Record<string, string> = {
      'rage_pattern': `🚨 RAGE DETECTED: ${insight.frequency} users in crisis mode`,
      'abandonment_pattern': `💔 Mass Abandonment: ${insight.frequency} users leaving`,
      'delight_pattern': `✨ Delight Spike: ${insight.frequency} users ready to convert`,
      'confusion_pattern': `😵 Confusion Cluster: ${insight.frequency} users lost`,
      'urgency_pattern': `⚡ Urgency Window: ${insight.frequency} users want it NOW`,
      'decision_paralysis_pattern': `🔄 Decision Paralysis: ${insight.frequency} users stuck`
    };
    
    return titles[insight.pattern] || `Pattern Detected: ${insight.pattern}`;
  }

  /**
   * Generate actionable description
   */
  private static generateDescription(insight: EmotionalInsight): string {
    return `We've detected ${insight.frequency} instances of ${insight.pattern.replace('_pattern', '')} ` +
           `with ${insight.confidence}% confidence. ` +
           `This pattern typically results in ${Math.abs(insight.conversion_impact * 100).toFixed(1)}% ` +
           `${insight.conversion_impact > 0 ? 'increase' : 'decrease'} in conversion. ` +
           `Estimated revenue impact: $${Math.abs(insight.revenue_impact).toFixed(2)}. ` +
           `Recommended action: ${insight.recommended_action}`;
  }

  /**
   * Generate implementation code
   */
  private static generateImplementationCode(insight: EmotionalInsight): string {
    const codeTemplates: Record<string, string> = {
      'rage_pattern': `
// Emergency Rage Intervention
if (emotionalState === 'rage' && confidence > 85) {
  // 1. Simplify UI immediately
  document.querySelectorAll('.complex-form').forEach(el => el.style.display = 'none');
  document.querySelector('.simple-path').style.display = 'block';
  
  // 2. Show support chat
  window.openSupportChat({ priority: 'emergency', context: 'rage_detected' });
  
  // 3. Offer discount
  window.showOffer({ type: 'rescue', discount: 20, message: "Let us help make this right" });
}`,
      'abandonment_pattern': `
// Abandonment Prevention
if (emotionalState === 'abandonment' && confidence > 70) {
  // 1. Exit intent popup
  window.showExitIntent({
    title: "Wait! Don't leave yet",
    message: "Save your progress and we'll help you complete this later",
    cta: "Save & Continue Later"
  });
  
  // 2. Save cart state
  localStorage.setItem('abandoned_cart', JSON.stringify(cartState));
  
  // 3. Schedule follow-up
  scheduleEmail({ type: 'abandonment', delay: '2h', personalized: true });
}`,
      'delight_pattern': `
// Capitalize on Delight
if (emotionalState === 'delight' && confidence > 80) {
  // 1. Show upsell
  window.showUpsell({
    products: getComplementaryProducts(),
    message: "Complete your experience with these",
    discount: 10
  });
  
  // 2. Request review
  setTimeout(() => {
    window.requestReview({ timing: 'peak_happiness' });
  }, 3000);
  
  // 3. Loyalty program invite
  window.showLoyaltyInvite({ trigger: 'delight' });
}`
    };
    
    return codeTemplates[insight.pattern] || '// Custom implementation required';
  }

  /**
   * Estimate satisfaction impact
   */
  private static estimateSatisfactionImpact(insight: EmotionalInsight): number {
    const satisfactionMap: Record<string, number> = {
      'rage_pattern': -50,
      'frustration_pattern': -30,
      'confusion_pattern': -20,
      'hesitation_pattern': -10,
      'abandonment_pattern': -40,
      'decision_paralysis_pattern': -25,
      'curiosity_pattern': 10,
      'confidence_pattern': 20,
      'delight_pattern': 40,
      'urgency_pattern': 15,
      'discovery_pattern': 25
    };
    
    return satisfactionMap[insight.pattern] || 0;
  }

  /**
   * Trigger alert for critical recommendations
   */
  static async triggerAlert(recommendation: Recommendation): Promise<void> {
    console.log(`🚨 CRITICAL ALERT: ${recommendation.title}`);
    
    // Check if it's 3AM-worthy
    const hour = new Date().getHours();
    const is3AMWorthy = recommendation.urgency === 'critical' && 
                        recommendation.confidence > 90 &&
                        Math.abs(recommendation.potential_impact.revenue) > 10000;
    
    if (is3AMWorthy) {
      console.log('📱 3AM ALERT TRIGGERED - This is worth waking up for');
      
      // Send urgent notification (implement your notification service)
      // await sendUrgentNotification({
      //   to: process.env.ALERT_PHONE,
      //   message: recommendation.title,
      //   link: `https://app.sentientiq.com/recommendations/${recommendation.id}`
      // });
    }
    
    // Log to alert history
    if (supabase) {
      await supabase.from('alerts').insert({
        recommendation_id: recommendation.id,
        tenant_id: recommendation.tenant_id,
        triggered_at: new Date().toISOString(),
        urgency: recommendation.urgency,
        was_3am_alert: is3AMWorthy
      });
    }
  }

  /**
   * Track recommendation action
   */
  static async trackAction(
    recommendationId: string,
    action: 'viewed' | 'deployed' | 'ignored' | 'dismissed'
  ): Promise<void> {
    if (!supabase) return;
    
    await supabase
      .from('recommendations')
      .update({ 
        status: action,
        [`${action}_at`]: new Date().toISOString()
      })
      .eq('id', recommendationId);
    
    // If deployed, start tracking outcomes
    if (action === 'deployed') {
      setTimeout(() => this.measureOutcome(recommendationId), 86400000); // Check after 24h
    }
  }

  /**
   * Measure actual outcome of deployed recommendation
   */
  static async measureOutcome(recommendationId: string): Promise<void> {
    if (!supabase) return;
    
    const { data: recommendation } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', recommendationId)
      .single();
    
    if (!recommendation) return;
    
    // Get metrics since deployment
    const { data: metrics } = await supabase
      .from('emotional_events')
      .select('*')
      .gte('timestamp', recommendation.deployed_at)
      .eq('emotion', recommendation.emotional_trigger.replace('_pattern', ''));
    
    // Calculate actual impact
    const actualImpact = {
      instances_prevented: metrics?.length || 0,
      revenue_saved: (metrics?.length || 0) * Math.abs(recommendation.potential_impact.revenue),
      conversion_improvement: metrics ? metrics.length * 0.05 : 0 // Simplified calculation
    };
    
    await supabase
      .from('recommendations')
      .update({
        'outcome.actual_impact': actualImpact,
        'outcome.success': actualImpact.instances_prevented > 0
      })
      .eq('id', recommendationId);
  }

  /**
   * Generate tenant scorecard - THE ACCOUNTABILITY MOMENT
   */
  static async generateScorecard(tenantId: string): Promise<TenantScorecard> {
    if (!supabase) {
      return this.getEmptyScorecard(tenantId);
    }
    
    const { data: recommendations } = await supabase
      .from('recommendations')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (!recommendations || recommendations.length === 0) {
      return this.getEmptyScorecard(tenantId);
    }
    
    const acted = recommendations.filter(r => r.status === 'deployed').length;
    const ignored = recommendations.filter(r => 
      r.status === 'ignored' || r.status === 'dismissed'
    ).length;
    
    // Calculate revenue left on table
    const revenueLeftOnTable = recommendations
      .filter(r => r.status !== 'deployed')
      .reduce((sum, r) => sum + Math.abs(r.potential_impact.revenue), 0);
    
    // Calculate missed conversions
    const missedConversions = recommendations
      .filter(r => r.status !== 'deployed')
      .reduce((sum, r) => sum + (r.potential_impact.conversion_rate * r.frequency), 0);
    
    // Calculate average response time
    const responseTimes = recommendations
      .filter(r => r.status === 'deployed' && r.deployed_at)
      .map(r => (new Date(r.deployed_at).getTime() - new Date(r.timestamp).getTime()) / 3600000);
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 999;
    
    // Find best and worst
    const deployed = recommendations.filter(r => r.status === 'deployed' && r.outcome?.success);
    const bestAction = deployed.length > 0 
      ? deployed.sort((a, b) => b.outcome.actual_impact.revenue_saved - a.outcome.actual_impact.revenue_saved)[0]
      : null;
    
    const worstIgnored = recommendations
      .filter(r => r.status === 'ignored' || r.status === 'dismissed')
      .sort((a, b) => b.potential_impact.revenue - a.potential_impact.revenue)[0];
    
    // Calculate accountability score
    const actionRate = recommendations.length > 0 ? acted / recommendations.length : 0;
    const responseScore = Math.max(0, 100 - (avgResponseTime * 2)); // Lose 2 points per hour delay
    const revenueScore = Math.max(0, 100 - (revenueLeftOnTable / 10000) * 10); // Lose 10 points per $10k ignored
    
    const accountabilityScore = (actionRate * 40) + (responseScore * 30) + (revenueScore * 30);
    
    return {
      tenant_id: tenantId,
      total_recommendations: recommendations.length,
      acted_on: acted,
      ignored: ignored,
      action_rate: actionRate,
      revenue_left_on_table: revenueLeftOnTable,
      missed_conversions: Math.round(missedConversions),
      response_time_avg: avgResponseTime,
      best_performing_action: bestAction?.title || 'None yet',
      worst_ignored_recommendation: worstIgnored?.title || 'None',
      accountability_score: Math.round(accountabilityScore)
    };
  }

  /**
   * Get empty scorecard - Show the truth: NOTHING
   */
  private static getEmptyScorecard(tenantId: string): TenantScorecard {
    return {
      tenant_id: tenantId,
      total_recommendations: 0,
      acted_on: 0,
      ignored: 0,
      action_rate: 0,
      revenue_left_on_table: 0,
      missed_conversions: 0,
      response_time_avg: 0,
      best_performing_action: 'None - No actions taken',
      worst_ignored_recommendation: 'None - No recommendations made',
      accountability_score: 0 // Zero. Nothing to be accountable for yet.
    };
  }

  /**
   * Generate cancellation report - THE MOMENT OF TRUTH
   */
  static async generateCancellationReport(tenantId: string): Promise<string> {
    const scorecard = await this.generateScorecard(tenantId);
    
    return `
# SentientIQ Accountability Report
## Tenant: ${tenantId}

### The Numbers Don't Lie

You received **${scorecard.total_recommendations} recommendations** from us.
You acted on **${scorecard.acted_on}** (${(scorecard.action_rate * 100).toFixed(1)}%).
You ignored **${scorecard.ignored}**.

### What It Cost You

💰 **Revenue Left on Table**: $${scorecard.revenue_left_on_table.toFixed(2)}
🚪 **Missed Conversions**: ${scorecard.missed_conversions} users who wanted to buy
⏱️ **Average Response Time**: ${scorecard.response_time_avg.toFixed(1)} hours (when you did act)

### Your Best Move
${scorecard.best_performing_action || 'You never gave us a chance to show you.'}

### Your Biggest Miss
${scorecard.worst_ignored_recommendation || 'Lucky you - no major misses yet.'}

### Your Accountability Score: ${scorecard.accountability_score}/100

${scorecard.accountability_score < 50 ? 
  "You ignored most of what we told you. The data doesn't lie - we showed you the money, you chose not to take it." :
  scorecard.accountability_score < 75 ?
  "You tried, but left significant value on the table. Imagine what full deployment could have done." :
  "You trusted the system and it paid off. This is what data-driven looks like."}

### The Truth

We don't generate bullshit insights. We detect real emotions, predict real actions, and recommend real interventions.
You chose to act on ${scorecard.action_rate * 100}% of them.

The ${100 - scorecard.action_rate * 100}% you ignored? That was your choice.
The $${scorecard.revenue_left_on_table.toFixed(2)} you left behind? That was your decision.

We're not intent software. We're accountability software.
And this is your accountability moment.

---
*Generated at ${new Date().toISOString()}*
*Every recommendation tracked. Every ignore recorded. Full accountability.*
    `;
  }
}

// Express endpoints
export const recommendationHandlers = {
  // Get recommendations for tenant
  getRecommendations: async (req: any, res: any) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      
      if (!supabase) {
        return res.json({ recommendations: [], message: 'Database not configured' });
      }
      
      const { data: recommendations } = await supabase
        .from('recommendations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false })
        .limit(50);
      
      res.json({ recommendations });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get recommendations' });
    }
  },

  // Track action on recommendation
  trackAction: async (req: any, res: any) => {
    try {
      const { recommendationId, action } = req.body;
      await RecommendationsEngine.trackAction(recommendationId, action);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to track action' });
    }
  },

  // Get scorecard
  getScorecard: async (req: any, res: any) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const scorecard = await RecommendationsEngine.generateScorecard(tenantId);
      res.json({ scorecard });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate scorecard' });
    }
  },

  // Generate cancellation report
  getCancellationReport: async (req: any, res: any) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const report = await RecommendationsEngine.generateCancellationReport(tenantId);
      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
};