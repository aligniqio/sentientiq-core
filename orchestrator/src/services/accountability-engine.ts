/**
 * Accountability Engine
 * 
 * This tracks every recommendation we make and what you do with it.
 * When you ignore our warnings and lose a customer, we'll show you exactly what it cost.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

// Lazy-initialize Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

export interface Recommendation {
  id: string;
  companyId: string;
  userId?: string;
  timestamp: Date;
  emotion: string;
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendedAction: string;
  estimatedRevenueLoss: number;
  deadline: Date; // When action should be taken by
  pageUrl?: string;
  userValue?: number;
}

export interface RecommendationOutcome {
  recommendationId: string;
  actionTaken: boolean;
  actionTimestamp?: Date;
  outcome: 'saved' | 'lost' | 'pending' | 'unknown';
  actualRevenueLoss: number;
  notes?: string;
  followUpRequired: boolean;
}

export interface AccountabilityScore {
  companyId: string;
  period: string;
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalRecommendations: number;
  criticalRecommendations: number;
  actionsTaken: number;
  actionsIgnored: number;
  responseTime: number; // Average minutes to respond
  revenueSaved: number;
  revenueLost: number;
  preventableChurn: number;
  customersSaved: number;
  customersLost: number;
}

export interface AccountabilityInsight {
  type: 'pattern' | 'warning' | 'opportunity' | 'achievement';
  message: string;
  impact: string;
  evidence: any[];
  suggestedAction?: string;
}

class AccountabilityEngine extends EventEmitter {
  private recommendations: Map<string, Recommendation> = new Map();
  private outcomes: Map<string, RecommendationOutcome> = new Map();
  private companyScores: Map<string, AccountabilityScore> = new Map();
  
  /**
   * Track a new recommendation
   */
  async trackRecommendation(params: {
    companyId: string;
    userId?: string;
    emotion: string;
    confidence: number;
    recommendedAction: string;
    userValue?: number;
    pageUrl?: string;
  }): Promise<Recommendation> {
    const recommendation: Recommendation = {
      id: this.generateRecommendationId(),
      companyId: params.companyId,
      userId: params.userId,
      timestamp: new Date(),
      emotion: params.emotion,
      confidence: params.confidence,
      severity: this.calculateSeverity(params.emotion, params.confidence, params.userValue),
      recommendedAction: params.recommendedAction,
      estimatedRevenueLoss: this.estimateRevenueLoss(params.emotion, params.userValue),
      deadline: this.calculateDeadline(params.emotion),
      pageUrl: params.pageUrl,
      userValue: params.userValue
    };
    
    // Store in memory
    this.recommendations.set(recommendation.id, recommendation);
    
    // Persist to database
    await this.persistRecommendation(recommendation);
    
    // Emit event for real-time tracking
    this.emit('recommendation:created', recommendation);
    
    // Check if this is critical
    if (recommendation.severity === 'critical') {
      this.emit('critical:recommendation', recommendation);
    }
    
    return recommendation;
  }
  
  /**
   * Record the outcome of a recommendation
   */
  async recordOutcome(params: {
    recommendationId: string;
    actionTaken: boolean;
    outcome?: 'saved' | 'lost' | 'unknown';
    actualRevenueLoss?: number;
    notes?: string;
  }): Promise<RecommendationOutcome> {
    const recommendation = this.recommendations.get(params.recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation ${params.recommendationId} not found`);
    }
    
    const outcome: RecommendationOutcome = {
      recommendationId: params.recommendationId,
      actionTaken: params.actionTaken,
      actionTimestamp: params.actionTaken ? new Date() : undefined,
      outcome: params.outcome || (params.actionTaken ? 'saved' : 'lost'),
      actualRevenueLoss: params.actualRevenueLoss || 
        (params.actionTaken ? 0 : recommendation.estimatedRevenueLoss),
      notes: params.notes,
      followUpRequired: !params.actionTaken && recommendation.severity === 'critical'
    };
    
    // Store outcome
    this.outcomes.set(params.recommendationId, outcome);
    
    // Persist to database
    await this.persistOutcome(outcome);
    
    // Update company score
    await this.updateCompanyScore(recommendation.companyId);
    
    // Emit events
    this.emit('outcome:recorded', outcome);
    
    if (!params.actionTaken && recommendation.severity === 'critical') {
      this.emit('critical:ignored', { recommendation, outcome });
    }
    
    return outcome;
  }
  
  /**
   * Calculate company accountability score
   */
  async calculateScore(companyId: string, period: string = '30d'): Promise<AccountabilityScore> {
    const periodStart = this.getPeriodStart(period);
    
    // Get all recommendations for period
    const companyRecommendations = Array.from(this.recommendations.values())
      .filter(r => r.companyId === companyId && r.timestamp >= periodStart);
    
    // Get outcomes
    const outcomes = companyRecommendations.map(r => 
      this.outcomes.get(r.id)
    ).filter(Boolean) as RecommendationOutcome[];
    
    // Calculate metrics
    const totalRecommendations = companyRecommendations.length;
    const criticalRecommendations = companyRecommendations.filter(r => 
      r.severity === 'critical'
    ).length;
    
    const actionsTaken = outcomes.filter(o => o.actionTaken).length;
    const actionsIgnored = outcomes.filter(o => !o.actionTaken).length;
    
    // Calculate response time
    const responseTimes = outcomes
      .filter(o => o.actionTaken && o.actionTimestamp)
      .map(o => {
        const rec = this.recommendations.get(o.recommendationId)!;
        return (o.actionTimestamp!.getTime() - rec.timestamp.getTime()) / 60000; // minutes
      });
    
    const avgResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length :
      0;
    
    // Calculate revenue impact
    const revenueSaved = outcomes
      .filter(o => o.outcome === 'saved')
      .reduce((sum, o) => {
        const rec = this.recommendations.get(o.recommendationId)!;
        return sum + rec.estimatedRevenueLoss;
      }, 0);
    
    const revenueLost = outcomes
      .filter(o => o.outcome === 'lost')
      .reduce((sum, o) => sum + o.actualRevenueLoss, 0);
    
    // Calculate preventable churn
    const preventableChurn = outcomes
      .filter(o => !o.actionTaken && o.outcome === 'lost')
      .reduce((sum, o) => sum + o.actualRevenueLoss, 0);
    
    // Count customers
    const uniqueUsersSaved = new Set(
      outcomes
        .filter(o => o.outcome === 'saved')
        .map(o => this.recommendations.get(o.recommendationId)?.userId)
        .filter(Boolean)
    ).size;
    
    const uniqueUsersLost = new Set(
      outcomes
        .filter(o => o.outcome === 'lost')
        .map(o => this.recommendations.get(o.recommendationId)?.userId)
        .filter(Boolean)
    ).size;
    
    // Calculate score (0-100)
    let score = 100;
    
    // Deduct for ignored recommendations
    score -= (actionsIgnored / Math.max(totalRecommendations, 1)) * 30;
    
    // Deduct heavily for ignored critical recommendations
    const ignoredCritical = companyRecommendations
      .filter(r => r.severity === 'critical')
      .filter(r => {
        const outcome = this.outcomes.get(r.id);
        return outcome && !outcome.actionTaken;
      }).length;
    
    score -= ignoredCritical * 15;
    
    // Deduct for slow response time
    if (avgResponseTime > 60) { // More than 1 hour average
      score -= Math.min(20, avgResponseTime / 60 * 5);
    }
    
    // Bonus for saving high-value customers
    const highValueSaves = outcomes
      .filter(o => o.outcome === 'saved')
      .filter(o => {
        const rec = this.recommendations.get(o.recommendationId)!;
        return rec.userValue && rec.userValue > 10000;
      }).length;
    
    score += Math.min(10, highValueSaves * 2);
    
    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));
    
    // Calculate grade
    const grade = 
      score >= 90 ? 'A' :
      score >= 80 ? 'B' :
      score >= 70 ? 'C' :
      score >= 60 ? 'D' : 'F';
    
    const accountabilityScore: AccountabilityScore = {
      companyId,
      period,
      score: Math.round(score),
      grade,
      totalRecommendations,
      criticalRecommendations,
      actionsTaken,
      actionsIgnored,
      responseTime: Math.round(avgResponseTime),
      revenueSaved,
      revenueLost,
      preventableChurn,
      customersSaved: uniqueUsersSaved,
      customersLost: uniqueUsersLost
    };
    
    // Cache the score
    this.companyScores.set(companyId, accountabilityScore);
    
    // Persist to database
    await this.persistScore(accountabilityScore);
    
    return accountabilityScore;
  }
  
  /**
   * Get insights and patterns
   */
  async getInsights(companyId: string): Promise<AccountabilityInsight[]> {
    const insights: AccountabilityInsight[] = [];
    const score = this.companyScores.get(companyId);
    
    if (!score) {
      await this.calculateScore(companyId);
    }
    
    const companyRecommendations = Array.from(this.recommendations.values())
      .filter(r => r.companyId === companyId);
    
    // Pattern: Consistently ignoring specific emotions
    const ignoredByEmotion = new Map<string, number>();
    companyRecommendations.forEach(r => {
      const outcome = this.outcomes.get(r.id);
      if (outcome && !outcome.actionTaken) {
        ignoredByEmotion.set(r.emotion, (ignoredByEmotion.get(r.emotion) || 0) + 1);
      }
    });
    
    const mostIgnored = Array.from(ignoredByEmotion.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostIgnored && mostIgnored[1] > 3) {
      insights.push({
        type: 'pattern',
        message: `You consistently ignore ${mostIgnored[0]} signals`,
        impact: `This pattern has cost you ${mostIgnored[1]} potential saves`,
        evidence: companyRecommendations
          .filter(r => r.emotion === mostIgnored[0])
          .slice(0, 3),
        suggestedAction: `Set up automatic interventions for ${mostIgnored[0]} events`
      });
    }
    
    // Warning: Critical recommendations ignored
    const recentCriticalIgnored = companyRecommendations
      .filter(r => r.severity === 'critical')
      .filter(r => {
        const outcome = this.outcomes.get(r.id);
        return outcome && !outcome.actionTaken;
      })
      .filter(r => r.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    if (recentCriticalIgnored.length > 0) {
      insights.push({
        type: 'warning',
        message: `${recentCriticalIgnored.length} critical recommendations ignored in last 24 hours`,
        impact: `Potential revenue loss: $${recentCriticalIgnored.reduce((sum, r) => sum + r.estimatedRevenueLoss, 0)}`,
        evidence: recentCriticalIgnored,
        suggestedAction: 'Review and act on critical alerts immediately'
      });
    }
    
    // Opportunity: Fast response correlation
    const fastResponses = companyRecommendations.filter(r => {
      const outcome = this.outcomes.get(r.id);
      if (!outcome || !outcome.actionTaken || !outcome.actionTimestamp) return false;
      const responseTime = (outcome.actionTimestamp.getTime() - r.timestamp.getTime()) / 60000;
      return responseTime < 15; // Less than 15 minutes
    });
    
    if (fastResponses.length > 5) {
      const savedFromFast = fastResponses.filter(r => {
        const outcome = this.outcomes.get(r.id);
        return outcome?.outcome === 'saved';
      }).length;
      
      insights.push({
        type: 'opportunity',
        message: 'Fast responses lead to better outcomes',
        impact: `${Math.round(savedFromFast / fastResponses.length * 100)}% save rate when responding within 15 minutes`,
        evidence: fastResponses.slice(0, 3),
        suggestedAction: 'Implement automatic interventions for faster response'
      });
    }
    
    // Achievement: High save rate
    if (score && score.customersSaved > 10 && score.customersSaved > score.customersLost * 2) {
      insights.push({
        type: 'achievement',
        message: `Excellent customer retention: ${score.customersSaved} customers saved`,
        impact: `Revenue protected: $${score.revenueSaved}`,
        evidence: [],
        suggestedAction: 'Continue current intervention strategy'
      });
    }
    
    return insights;
  }
  
  /**
   * Generate accountability report
   */
  async generateReport(companyId: string, period: string = '30d'): Promise<{
    score: AccountabilityScore;
    insights: AccountabilityInsight[];
    recommendations: {
      pending: Recommendation[];
      ignored: Recommendation[];
      acted: Recommendation[];
    };
    comparison?: {
      previousPeriod: AccountabilityScore;
      improvement: number;
    };
  }> {
    const score = await this.calculateScore(companyId, period);
    const insights = await this.getInsights(companyId);
    
    const periodStart = this.getPeriodStart(period);
    const companyRecommendations = Array.from(this.recommendations.values())
      .filter(r => r.companyId === companyId && r.timestamp >= periodStart);
    
    const pending = companyRecommendations.filter(r => !this.outcomes.has(r.id));
    const ignored = companyRecommendations.filter(r => {
      const outcome = this.outcomes.get(r.id);
      return outcome && !outcome.actionTaken;
    });
    const acted = companyRecommendations.filter(r => {
      const outcome = this.outcomes.get(r.id);
      return outcome && outcome.actionTaken;
    });
    
    // Sort by severity and recency
    const sortBySeverityAndTime = (a: Recommendation, b: Recommendation) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    };
    
    pending.sort(sortBySeverityAndTime);
    ignored.sort(sortBySeverityAndTime);
    acted.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return {
      score,
      insights,
      recommendations: {
        pending: pending.slice(0, 10),
        ignored: ignored.slice(0, 10),
        acted: acted.slice(0, 10)
      }
    };
  }
  
  /**
   * Calculate severity of recommendation
   */
  private calculateSeverity(
    emotion: string,
    confidence: number,
    userValue?: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    const highRiskEmotions = ['rage', 'abandonment'];
    const mediumRiskEmotions = ['frustration', 'anxiety', 'confusion'];
    
    // Critical: High-value user with high-risk emotion
    if (userValue && userValue > 10000 && highRiskEmotions.includes(emotion) && confidence > 80) {
      return 'critical';
    }
    
    // High: Any user with very high confidence negative emotion
    if (highRiskEmotions.includes(emotion) && confidence > 85) {
      return 'high';
    }
    
    // High: High-value user with any negative emotion
    if (userValue && userValue > 10000 && confidence > 70) {
      return 'high';
    }
    
    // Medium: Medium risk emotions with good confidence
    if (mediumRiskEmotions.includes(emotion) && confidence > 75) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Estimate potential revenue loss
   */
  private estimateRevenueLoss(emotion: string, userValue?: number): number {
    const baseValue = userValue || 1000; // Default customer value
    
    const lossMultipliers: Record<string, number> = {
      'rage': 0.9,
      'abandonment': 0.85,
      'frustration': 0.6,
      'anxiety': 0.5,
      'confusion': 0.4,
      'decision_paralysis': 0.7,
      'hesitation': 0.3
    };
    
    const multiplier = lossMultipliers[emotion] || 0.2;
    return Math.round(baseValue * multiplier);
  }
  
  /**
   * Calculate deadline for action
   */
  private calculateDeadline(emotion: string): Date {
    const urgencyMinutes: Record<string, number> = {
      'rage': 5,
      'abandonment': 10,
      'frustration': 30,
      'anxiety': 60,
      'confusion': 120,
      'decision_paralysis': 45,
      'hesitation': 180
    };
    
    const minutes = urgencyMinutes[emotion] || 240;
    return new Date(Date.now() + minutes * 60 * 1000);
  }
  
  /**
   * Get period start date
   */
  private getPeriodStart(period: string): Date {
    const now = new Date();
    const match = period.match(/(\d+)([dhm])/);
    
    if (!match) {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    }
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    switch (unit) {
      case 'h':
        return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
  
  /**
   * Update company score after outcome
   */
  private async updateCompanyScore(companyId: string): Promise<void> {
    await this.calculateScore(companyId);
  }
  
  /**
   * Persist recommendation to database
   */
  private async persistRecommendation(recommendation: Recommendation): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      await supabase
        .from('accountability_recommendations')
        .insert({
          id: recommendation.id,
          company_id: recommendation.companyId,
          user_id: recommendation.userId,
          timestamp: recommendation.timestamp.toISOString(),
          emotion: recommendation.emotion,
          confidence: recommendation.confidence,
          severity: recommendation.severity,
          recommended_action: recommendation.recommendedAction,
          estimated_revenue_loss: recommendation.estimatedRevenueLoss,
          deadline: recommendation.deadline.toISOString(),
          page_url: recommendation.pageUrl,
          user_value: recommendation.userValue
        });
    } catch (error) {
      console.error('Failed to persist recommendation:', error);
    }
  }
  
  /**
   * Persist outcome to database
   */
  private async persistOutcome(outcome: RecommendationOutcome): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      await supabase
        .from('accountability_outcomes')
        .insert({
          recommendation_id: outcome.recommendationId,
          action_taken: outcome.actionTaken,
          action_timestamp: outcome.actionTimestamp?.toISOString(),
          outcome: outcome.outcome,
          actual_revenue_loss: outcome.actualRevenueLoss,
          notes: outcome.notes,
          follow_up_required: outcome.followUpRequired
        });
    } catch (error) {
      console.error('Failed to persist outcome:', error);
    }
  }
  
  /**
   * Persist score to database
   */
  private async persistScore(score: AccountabilityScore): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      await supabase
        .from('accountability_scores')
        .upsert({
          company_id: score.companyId,
          period: score.period,
          score: score.score,
          grade: score.grade,
          total_recommendations: score.totalRecommendations,
          critical_recommendations: score.criticalRecommendations,
          actions_taken: score.actionsTaken,
          actions_ignored: score.actionsIgnored,
          response_time: score.responseTime,
          revenue_saved: score.revenueSaved,
          revenue_lost: score.revenueLost,
          preventable_churn: score.preventableChurn,
          customers_saved: score.customersSaved,
          customers_lost: score.customersLost,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id,period'
        });
    } catch (error) {
      console.error('Failed to persist score:', error);
    }
  }
  
  /**
   * Generate unique recommendation ID
   */
  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const accountabilityEngine = new AccountabilityEngine();

// Listen for critical events
accountabilityEngine.on('critical:ignored', ({ recommendation, outcome }) => {
  console.error(`🚨 CRITICAL RECOMMENDATION IGNORED:`, {
    company: recommendation.companyId,
    user: recommendation.userId,
    emotion: recommendation.emotion,
    estimatedLoss: recommendation.estimatedRevenueLoss,
    action: recommendation.recommendedAction
  });
});

export default accountabilityEngine;