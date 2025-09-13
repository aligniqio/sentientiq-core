/**
 * EVI Calculator - Emotional Volatility Index
 * 
 * The EVI is our proprietary metric that quantifies emotional volatility across 
 * different dimensions - the first standardized measure of collective business consciousness.
 * 
 * Think of it like the VIX for human emotions in business contexts.
 * 
 * EVI Formula:
 * EVI = sqrt(Σ(emotion_intensity * confidence * frequency_weight) / total_events) * 100
 * 
 * Components:
 * - Emotional variance across time periods
 * - Confidence-weighted intensity
 * - Frequency adjustments for statistical significance
 * - Geographic and vertical normalization
 */

import { eventLakeService, EventLakeRecord } from './event-lake.js';

export interface EVIMetric {
  // Core EVI score (0-100, where higher = more volatile)
  evi: number;
  
  // Breakdown components
  components: {
    intensity_variance: number;    // How much emotions vary in intensity
    emotion_diversity: number;     // Number of different emotions detected
    confidence_average: number;    // Average detection confidence
    temporal_volatility: number;   // How much emotions change over time
    intervention_rate: number;     // Percentage of events requiring intervention
  };
  
  // Context
  timeRange: { start: Date; end: Date };
  sampleSize: number;
  vertical?: string;
  geography?: string;
  
  // Comparative metrics
  comparison: {
    vs_previous_period: number;    // % change from previous period
    vs_industry_average: number;   // % difference from industry average
    percentile_rank: number;       // Where this EVI ranks (0-100)
  };
  
  // Risk indicators
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical';
    primary_concern: string;
    recommended_action: string;
    potential_revenue_impact: number;
  };
  
  // Contributing emotions
  top_emotions: Array<{
    emotion: string;
    contribution: number;  // % contribution to overall EVI
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
}

export interface EVIDashboard {
  current_evi: number;
  trend: 'up' | 'down' | 'stable';
  alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
    affected_vertical?: string;
    affected_geography?: string;
  }>;
  
  breakdowns: {
    by_vertical: Record<string, EVIMetric>;
    by_geography: Record<string, EVIMetric>;
    by_hour: Record<string, number>;
    by_day: Record<string, number>;
  };
  
  insights: Array<{
    type: 'opportunity' | 'risk' | 'trend';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    confidence: number;
    recommended_actions: string[];
  }>;
}

export class EVICalculator {
  
  /**
   * Calculate EVI for a specific time range and filters
   */
  static async calculateEVI(
    timeRange: { start: Date; end: Date },
    filters: {
      vertical?: string;
      geography?: string;
      companyId?: string;
      minConfidence?: number;
    } = {}
  ): Promise<EVIMetric> {
    
    console.log('📊 Calculating EVI for period:', timeRange, 'with filters:', filters);
    
    // Build query conditions
    let whereConditions = [
      `timestamp BETWEEN timestamp '${timeRange.start.toISOString()}' AND timestamp '${timeRange.end.toISOString()}'`
    ];
    
    if (filters.vertical) whereConditions.push(`vertical = '${filters.vertical}'`);
    if (filters.geography) whereConditions.push(`geography = '${filters.geography}'`);
    if (filters.companyId) whereConditions.push(`companyId = '${filters.companyId}'`);
    if (filters.minConfidence) whereConditions.push(`confidence >= ${filters.minConfidence}`);
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get event data for EVI calculation
    const eventQuery = `
      SELECT 
        emotion,
        confidence,
        intensity,
        dollarValue,
        interventionTaken,
        timestamp,
        vertical,
        geography
      FROM event_lake_emotions 
      WHERE ${whereClause}
      ORDER BY timestamp
    `;
    
    const events = await eventLakeService.executeAthenaQuery(eventQuery);
    
    if (events.length === 0) {
      return this.createEmptyEVI(timeRange, filters);
    }
    
    console.log(`🔍 Processing ${events.length} events for EVI calculation`);
    
    // Calculate EVI components
    const components = this.calculateEVIComponents(events);
    
    // Calculate main EVI score
    const evi = this.computeEVIScore(components, events);
    
    // Get comparison data
    const comparison = await this.getComparisonMetrics(evi, timeRange, filters);
    
    // Assess risk
    const risk = this.assessRisk(evi, components, events);
    
    // Identify top contributing emotions
    const topEmotions = this.getTopEmotions(events);
    
    const eviMetric: EVIMetric = {
      evi,
      components,
      timeRange,
      sampleSize: events.length,
      vertical: filters.vertical,
      geography: filters.geography,
      comparison,
      risk,
      top_emotions: topEmotions
    };
    
    console.log(`📈 EVI calculated: ${evi.toFixed(2)} (${risk.level} risk)`);
    
    return eviMetric;
  }
  
  /**
   * Calculate the individual components that make up the EVI
   */
  private static calculateEVIComponents(events: any[]): EVIMetric['components'] {
    const intensities = events.map(e => parseFloat(e.intensity));
    const confidences = events.map(e => parseFloat(e.confidence));
    const interventions = events.filter(e => e.interventionTaken === 'true').length;
    
    // Intensity variance (higher = more volatile emotions)
    const intensityMean = intensities.reduce((sum, i) => sum + i, 0) / intensities.length;
    const intensityVariance = intensities.reduce((sum, i) => sum + Math.pow(i - intensityMean, 2), 0) / intensities.length;
    
    // Emotion diversity (more different emotions = higher volatility)
    const uniqueEmotions = new Set(events.map(e => e.emotion)).size;
    const emotionDiversity = Math.min(uniqueEmotions / 10, 1) * 100; // Cap at 10 unique emotions
    
    // Confidence average
    const confidenceAverage = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    // Temporal volatility (how much emotions change over time)
    const temporalVolatility = this.calculateTemporalVolatility(events);
    
    // Intervention rate
    const interventionRate = (interventions / events.length) * 100;
    
    return {
      intensity_variance: intensityVariance,
      emotion_diversity: emotionDiversity,
      confidence_average: confidenceAverage,
      temporal_volatility: temporalVolatility,
      intervention_rate: interventionRate
    };
  }
  
  /**
   * Calculate temporal volatility - how much emotions change over time
   */
  private static calculateTemporalVolatility(events: any[]): number {
    if (events.length < 2) return 0;
    
    // Sort by timestamp
    const sortedEvents = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Calculate emotional "jumps" between consecutive events
    let totalJumps = 0;
    const emotionScores = this.getEmotionScores();
    
    for (let i = 1; i < sortedEvents.length; i++) {
      const prevEmotion = sortedEvents[i - 1].emotion;
      const currEmotion = sortedEvents[i].emotion;
      
      const prevScore = emotionScores[prevEmotion] || 0;
      const currScore = emotionScores[currEmotion] || 0;
      
      totalJumps += Math.abs(currScore - prevScore);
    }
    
    return (totalJumps / (sortedEvents.length - 1)) * 10; // Normalize to 0-100 scale
  }
  
  /**
   * Emotion scoring for volatility calculations
   */
  private static getEmotionScores(): Record<string, number> {
    return {
      // Positive emotions (lower volatility contribution)
      'delight': 1,
      'confidence': 2,
      'curiosity': 3,
      'discovery': 3,
      
      // Neutral emotions
      'engagement': 5,
      'focus': 5,
      
      // Negative emotions (higher volatility contribution)
      'hesitation': 6,
      'confusion': 7,
      'anxiety': 8,
      'frustration': 9,
      'rage': 10,
      'abandonment': 10,
      'decision_paralysis': 8
    };
  }
  
  /**
   * Compute the final EVI score from components
   */
  private static computeEVIScore(components: EVIMetric['components'], events: any[]): number {
    // Weighted combination of components
    const weights = {
      intensity_variance: 0.25,    // 25% - Core emotional variance
      emotion_diversity: 0.20,     // 20% - Breadth of emotions
      temporal_volatility: 0.30,   // 30% - Changes over time (most important)
      intervention_rate: 0.15,     // 15% - Business impact
      confidence_penalty: 0.10     // 10% - Lower confidence = higher uncertainty
    };
    
    // Normalize components to 0-100 scale
    const normalizedIntensityVar = Math.min(components.intensity_variance / 400, 1) * 100; // Max variance ~400
    const normalizedEmotionDiv = components.emotion_diversity; // Already 0-100
    const normalizedTemporalVol = Math.min(components.temporal_volatility, 100); // Already capped
    const normalizedInterventions = Math.min(components.intervention_rate, 100); // Already %
    const confidencePenalty = Math.max(0, 100 - components.confidence_average); // Penalty for low confidence
    
    const evi = 
      (normalizedIntensityVar * weights.intensity_variance) +
      (normalizedEmotionDiv * weights.emotion_diversity) +
      (normalizedTemporalVol * weights.temporal_volatility) +
      (normalizedInterventions * weights.intervention_rate) +
      (confidencePenalty * weights.confidence_penalty);
    
    return Math.min(Math.max(evi, 0), 100); // Clamp to 0-100
  }
  
  /**
   * Get comparison metrics vs previous periods and industry
   */
  private static async getComparisonMetrics(
    currentEVI: number,
    timeRange: { start: Date; end: Date },
    filters: any
  ): Promise<EVIMetric['comparison']> {
    
    // Calculate previous period (same duration)
    const periodDuration = timeRange.end.getTime() - timeRange.start.getTime();
    const previousStart = new Date(timeRange.start.getTime() - periodDuration);
    const previousEnd = new Date(timeRange.end.getTime() - periodDuration);
    
    try {
      const previousEVI = await this.calculateEVI(
        { start: previousStart, end: previousEnd },
        filters
      );
      
      const vsPrevious = previousEVI.evi > 0 
        ? ((currentEVI - previousEVI.evi) / previousEVI.evi) * 100 
        : 0;
      
      // Industry average (simplified - would come from broader dataset)
      const industryAverage = await this.getIndustryAverage(filters.vertical);
      const vsIndustry = industryAverage > 0 
        ? ((currentEVI - industryAverage) / industryAverage) * 100
        : 0;
      
      // Percentile rank (simplified calculation)
      const percentileRank = this.calculatePercentileRank(currentEVI, filters.vertical);
      
      return {
        vs_previous_period: vsPrevious,
        vs_industry_average: vsIndustry,
        percentile_rank: percentileRank
      };
      
    } catch (error) {
      console.error('Failed to get comparison metrics:', error);
      return {
        vs_previous_period: 0,
        vs_industry_average: 0,
        percentile_rank: 50
      };
    }
  }
  
  /**
   * Get industry average EVI
   */
  private static async getIndustryAverage(vertical?: string): Promise<number> {
    // Simplified industry averages - in production would be calculated from aggregate data
    const industryAverages: Record<string, number> = {
      'saas': 35,
      'ecommerce': 42,
      'fintech': 38,
      'healthcare': 28,
      'education': 25,
      'media': 45,
      'gaming': 48,
      'travel': 40,
      'retail': 44,
      'other': 35
    };
    
    return industryAverages[vertical || 'other'] || 35;
  }
  
  /**
   * Calculate percentile rank
   */
  private static calculatePercentileRank(evi: number, vertical?: string): number {
    // Simplified percentile calculation
    // In production, would query historical data to get true percentile
    if (evi < 20) return 10;
    if (evi < 30) return 25;
    if (evi < 40) return 50;
    if (evi < 50) return 75;
    if (evi < 60) return 85;
    return 95;
  }
  
  /**
   * Assess risk level based on EVI score and components
   */
  private static assessRisk(
    evi: number, 
    components: EVIMetric['components'], 
    events: any[]
  ): EVIMetric['risk'] {
    
    let level: 'low' | 'medium' | 'high' | 'critical';
    let primaryConcern: string;
    let recommendedAction: string;
    
    // Risk assessment logic
    if (evi >= 70) {
      level = 'critical';
      primaryConcern = 'Extremely high emotional volatility detected';
      recommendedAction = 'Immediate intervention required - deploy emergency support resources';
    } else if (evi >= 50) {
      level = 'high';
      primaryConcern = 'High emotional volatility indicating user distress';
      recommendedAction = 'Activate proactive support and friction reduction measures';
    } else if (evi >= 30) {
      level = 'medium';
      primaryConcern = 'Moderate emotional volatility - monitor closely';
      recommendedAction = 'Implement targeted improvements based on emotion patterns';
    } else {
      level = 'low';
      primaryConcern = 'Emotional state is stable';
      recommendedAction = 'Continue monitoring and optimize for engagement';
    }
    
    // Adjust based on specific components
    if (components.intervention_rate > 80) {
      level = 'critical';
      primaryConcern = 'Critical intervention rate - immediate action needed';
    }
    
    if (components.temporal_volatility > 80) {
      primaryConcern = 'Rapid emotional changes detected - user experience issues likely';
    }
    
    // Calculate potential revenue impact
    const avgDollarValue = events.reduce((sum, e) => sum + parseFloat(e.dollarValue || 0), 0) / events.length;
    const potentialImpact = avgDollarValue * events.length * (evi / 100);
    
    return {
      level,
      primary_concern: primaryConcern,
      recommended_action: recommendedAction,
      potential_revenue_impact: potentialImpact
    };
  }
  
  /**
   * Get top emotions contributing to EVI
   */
  private static getTopEmotions(events: any[]): EVIMetric['top_emotions'] {
    const emotionCounts: Record<string, number> = {};
    const emotionIntensities: Record<string, number[]> = {};
    
    // Count emotions and collect intensities
    events.forEach(event => {
      const emotion = event.emotion;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      
      if (!emotionIntensities[emotion]) emotionIntensities[emotion] = [];
      emotionIntensities[emotion].push(parseFloat(event.intensity));
    });
    
    // Calculate contribution scores
    const emotionScores = this.getEmotionScores();
    const contributions: Array<{ emotion: string; contribution: number; trend: 'increasing' | 'decreasing' | 'stable' }> = [];
    
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      const frequency = count / events.length;
      const avgIntensity = emotionIntensities[emotion].reduce((sum, i) => sum + i, 0) / emotionIntensities[emotion].length;
      const volatilityScore = emotionScores[emotion] || 5;
      
      // Contribution = frequency * intensity * volatility_score
      const contribution = frequency * avgIntensity * volatilityScore;
      
      contributions.push({
        emotion,
        contribution: (contribution / 1000) * 100, // Normalize to percentage
        trend: 'stable' // Would calculate from time-series data in production
      });
    });
    
    // Return top 5 contributors
    return contributions
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5);
  }
  
  /**
   * Create empty EVI metric for when no data is available
   */
  private static createEmptyEVI(
    timeRange: { start: Date; end: Date }, 
    filters: any
  ): EVIMetric {
    return {
      evi: 0,
      components: {
        intensity_variance: 0,
        emotion_diversity: 0,
        confidence_average: 0,
        temporal_volatility: 0,
        intervention_rate: 0
      },
      timeRange,
      sampleSize: 0,
      vertical: filters.vertical,
      geography: filters.geography,
      comparison: {
        vs_previous_period: 0,
        vs_industry_average: 0,
        percentile_rank: 0
      },
      risk: {
        level: 'low',
        primary_concern: 'No emotional data available',
        recommended_action: 'Ensure emotional tracking is properly configured',
        potential_revenue_impact: 0
      },
      top_emotions: []
    };
  }
  
  /**
   * Generate comprehensive EVI dashboard
   */
  static async generateDashboard(
    timeRange: { start: Date; end: Date },
    filters: { companyId?: string } = {}
  ): Promise<EVIDashboard> {
    
    console.log('📊 Generating EVI Dashboard for period:', timeRange);
    
    // Calculate overall EVI
    const overallEVI = await this.calculateEVI(timeRange, filters);
    
    // Get breakdowns by dimension
    const verticals = ['saas', 'ecommerce', 'fintech', 'healthcare', 'education', 'media', 'gaming', 'travel', 'retail'];
    const geographies = ['us-east', 'us-west', 'eu-west', 'eu-central', 'apac'];
    
    const byVertical: Record<string, EVIMetric> = {};
    const byGeography: Record<string, EVIMetric> = {};
    
    // Calculate EVI for each vertical
    await Promise.all(
      verticals.map(async (vertical) => {
        try {
          byVertical[vertical] = await this.calculateEVI(timeRange, { ...filters, vertical });
        } catch (error) {
          console.error(`Failed to calculate EVI for vertical ${vertical}:`, error);
        }
      })
    );
    
    // Calculate EVI for each geography
    await Promise.all(
      geographies.map(async (geography) => {
        try {
          byGeography[geography] = await this.calculateEVI(timeRange, { ...filters, geography });
        } catch (error) {
          console.error(`Failed to calculate EVI for geography ${geography}:`, error);
        }
      })
    );
    
    // Generate hourly and daily breakdowns
    const byHour = await this.getHourlyEVI(timeRange, filters);
    const byDay = await this.getDailyEVI(timeRange, filters);
    
    // Generate alerts
    const alerts = this.generateAlerts(overallEVI, byVertical, byGeography);
    
    // Generate insights
    const insights = this.generateInsights(overallEVI, byVertical, byGeography);
    
    // Determine trend
    const trend = overallEVI.comparison.vs_previous_period > 5 ? 'up' 
                : overallEVI.comparison.vs_previous_period < -5 ? 'down' 
                : 'stable';
    
    return {
      current_evi: overallEVI.evi,
      trend,
      alerts,
      breakdowns: {
        by_vertical: byVertical,
        by_geography: byGeography,
        by_hour: byHour,
        by_day: byDay
      },
      insights
    };
  }
  
  /**
   * Get hourly EVI breakdown
   */
  private static async getHourlyEVI(
    timeRange: { start: Date; end: Date }, 
    filters: any
  ): Promise<Record<string, number>> {
    // Implementation would query hourly aggregates
    // Simplified for now
    const hours: Record<string, number> = {};
    
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = String(hour).padStart(2, '0');
      // Would calculate actual hourly EVI here
      hours[hourStr] = Math.random() * 50 + 20; // Placeholder
    }
    
    return hours;
  }
  
  /**
   * Get daily EVI breakdown  
   */
  private static async getDailyEVI(
    timeRange: { start: Date; end: Date },
    filters: any
  ): Promise<Record<string, number>> {
    const days: Record<string, number> = {};
    
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayStr = d.toISOString().split('T')[0];
      // Would calculate actual daily EVI here
      days[dayStr] = Math.random() * 50 + 25; // Placeholder
    }
    
    return days;
  }
  
  /**
   * Generate alerts based on EVI analysis
   */
  private static generateAlerts(
    overall: EVIMetric,
    byVertical: Record<string, EVIMetric>,
    byGeography: Record<string, EVIMetric>
  ): EVIDashboard['alerts'] {
    
    const alerts: EVIDashboard['alerts'] = [];
    
    // Overall EVI alerts
    if (overall.risk.level === 'critical') {
      alerts.push({
        level: 'critical',
        message: `Critical EVI level detected: ${overall.evi.toFixed(1)}. ${overall.risk.recommended_action}`,
        timestamp: new Date()
      });
    } else if (overall.risk.level === 'high') {
      alerts.push({
        level: 'warning',
        message: `High EVI level: ${overall.evi.toFixed(1)}. Monitor closely for intervention opportunities.`,
        timestamp: new Date()
      });
    }
    
    // Vertical alerts
    Object.entries(byVertical).forEach(([vertical, metric]) => {
      if (metric.risk.level === 'critical') {
        alerts.push({
          level: 'critical',
          message: `Critical EVI in ${vertical}: ${metric.evi.toFixed(1)}`,
          timestamp: new Date(),
          affected_vertical: vertical
        });
      }
    });
    
    // Geography alerts
    Object.entries(byGeography).forEach(([geography, metric]) => {
      if (metric.risk.level === 'critical') {
        alerts.push({
          level: 'critical',
          message: `Critical EVI in ${geography}: ${metric.evi.toFixed(1)}`,
          timestamp: new Date(),
          affected_geography: geography
        });
      }
    });
    
    // Trend alerts
    if (overall.comparison.vs_previous_period > 25) {
      alerts.push({
        level: 'warning',
        message: `EVI increased by ${overall.comparison.vs_previous_period.toFixed(1)}% vs previous period`,
        timestamp: new Date()
      });
    }
    
    return alerts.slice(0, 10); // Limit to 10 most important alerts
  }
  
  /**
   * Generate actionable insights
   */
  private static generateInsights(
    overall: EVIMetric,
    byVertical: Record<string, EVIMetric>,
    byGeography: Record<string, EVIMetric>
  ): EVIDashboard['insights'] {
    
    const insights: EVIDashboard['insights'] = [];
    
    // Top emotion insights
    if (overall.top_emotions.length > 0) {
      const topEmotion = overall.top_emotions[0];
      insights.push({
        type: 'risk',
        title: `${topEmotion.emotion} is driving ${topEmotion.contribution.toFixed(1)}% of emotional volatility`,
        description: `Focus interventions on addressing ${topEmotion.emotion} patterns to reduce overall EVI`,
        impact: topEmotion.contribution > 30 ? 'high' : topEmotion.contribution > 15 ? 'medium' : 'low',
        confidence: 85,
        recommended_actions: [
          `Analyze ${topEmotion.emotion} triggers in user journey`,
          `Implement targeted interventions for ${topEmotion.emotion}`,
          `A/B test UI changes to reduce ${topEmotion.emotion} occurrence`
        ]
      });
    }
    
    // Intervention opportunity
    if (overall.components.intervention_rate < 20) {
      insights.push({
        type: 'opportunity',
        title: 'Low intervention rate suggests missed opportunities',
        description: `Only ${overall.components.intervention_rate.toFixed(1)}% of emotional events triggered interventions`,
        impact: 'medium',
        confidence: 70,
        recommended_actions: [
          'Lower intervention thresholds for high-value emotions',
          'Expand intervention capabilities',
          'Review intervention trigger logic'
        ]
      });
    }
    
    // Geographic insights
    const highestGeo = Object.entries(byGeography).reduce((max, [geo, metric]) => 
      metric.evi > max.metric.evi ? { geo, metric } : max, 
      { geo: 'none', metric: { evi: 0 } } as any
    );
    
    if (highestGeo.metric.evi > overall.evi * 1.2) {
      insights.push({
        type: 'risk',
        title: `${highestGeo.geo} showing elevated emotional volatility`,
        description: `EVI in ${highestGeo.geo} is ${((highestGeo.metric.evi / overall.evi - 1) * 100).toFixed(1)}% above average`,
        impact: 'medium',
        confidence: 80,
        recommended_actions: [
          `Investigate region-specific issues in ${highestGeo.geo}`,
          'Consider localized interventions',
          'Review regional user experience differences'
        ]
      });
    }
    
    return insights;
  }
}

// Export singleton for easy access
export const eviCalculator = new EVICalculator();