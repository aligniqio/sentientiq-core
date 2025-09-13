/**
 * EVI Query Service - Pre-built aggregation queries for the EVI dashboard
 * 
 * This service provides optimized SQL queries for Athena to power the EVI dashboard
 * with real-time emotional intelligence analytics across verticals, geographies, and time ranges.
 */

export interface QueryFilters {
  vertical?: string;
  geography?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  minConfidence?: number;
}

export class EVIQueries {
  
  /**
   * Real-time EVI calculation query
   */
  static realtimeEVI(filters: QueryFilters = {}): string {
    const whereClause = this.buildWhereClause(filters, 'WHERE timestamp >= current_timestamp - interval \'1\' hour');
    
    return `
      SELECT 
        SQRT(
          (VAR_POP(intensity * confidence / 100) * 0.3) +
          (COUNT(DISTINCT emotion) / 10.0 * 0.2) +
          (VAR_POP(CASE 
            WHEN emotion IN ('rage', 'abandonment', 'frustration') THEN 100
            WHEN emotion IN ('anxiety', 'confusion', 'hesitation') THEN 70
            WHEN emotion IN ('decision_paralysis') THEN 60
            ELSE 30 END) / 100 * 0.3) +
          (AVG(CASE WHEN interventionTaken THEN 100 ELSE 0 END) * 0.15) +
          ((100 - AVG(confidence)) * 0.05)
        ) * 100 as current_evi,
        COUNT(*) as total_events,
        COUNT(DISTINCT userId) as unique_users,
        AVG(confidence) as avg_confidence,
        AVG(intensity) as avg_intensity,
        SUM(dollarValue) as total_dollar_value,
        AVG(CASE WHEN interventionTaken THEN 100 ELSE 0 END) as intervention_rate
      FROM event_lake_emotions
      ${whereClause}
    `;
  }
  
  /**
   * EVI breakdown by vertical
   */
  static eviByVertical(filters: QueryFilters = {}): string {
    const whereClause = this.buildWhereClause(filters);
    
    return `
      WITH vertical_evi AS (
        SELECT 
          vertical,
          SQRT(
            (VAR_POP(intensity * confidence / 100) * 0.3) +
            (COUNT(DISTINCT emotion) / 10.0 * 0.2) +
            (VAR_POP(CASE 
              WHEN emotion IN ('rage', 'abandonment', 'frustration') THEN 100
              WHEN emotion IN ('anxiety', 'confusion', 'hesitation') THEN 70
              WHEN emotion IN ('decision_paralysis') THEN 60
              ELSE 30 END) / 100 * 0.3) +
            (AVG(CASE WHEN interventionTaken THEN 100 ELSE 0 END) * 0.15) +
            ((100 - AVG(confidence)) * 0.05)
          ) * 100 as evi,
          COUNT(*) as event_count,
          COUNT(DISTINCT userId) as unique_users,
          SUM(dollarValue) as total_value,
          AVG(confidence) as avg_confidence
        FROM event_lake_emotions
        ${whereClause}
        GROUP BY vertical
      )
      SELECT 
        vertical,
        evi,
        event_count,
        unique_users,
        total_value,
        avg_confidence,
        RANK() OVER (ORDER BY evi DESC) as risk_rank,
        ROUND((evi / (SELECT AVG(evi) FROM vertical_evi) - 1) * 100, 2) as vs_avg_pct
      FROM vertical_evi
      ORDER BY evi DESC
    `;
  }
  
  /**
   * EVI breakdown by geography
   */
  static eviByGeography(filters: QueryFilters = {}): string {
    const whereClause = this.buildWhereClause(filters);
    
    return `
      WITH geo_evi AS (
        SELECT 
          geography,
          SQRT(
            (VAR_POP(intensity * confidence / 100) * 0.3) +
            (COUNT(DISTINCT emotion) / 10.0 * 0.2) +
            (VAR_POP(CASE 
              WHEN emotion IN ('rage', 'abandonment', 'frustration') THEN 100
              WHEN emotion IN ('anxiety', 'confusion', 'hesitation') THEN 70
              WHEN emotion IN ('decision_paralysis') THEN 60
              ELSE 30 END) / 100 * 0.3) +
            (AVG(CASE WHEN interventionTaken THEN 100 ELSE 0 END) * 0.15) +
            ((100 - AVG(confidence)) * 0.05)
          ) * 100 as evi,
          COUNT(*) as event_count,
          COUNT(DISTINCT userId) as unique_users,
          SUM(dollarValue) as total_value,
          ARRAY_AGG(DISTINCT emotion) as top_emotions
        FROM event_lake_emotions
        ${whereClause}
        GROUP BY geography
      )
      SELECT 
        geography,
        evi,
        event_count,
        unique_users,
        total_value,
        CARDINALITY(top_emotions) as emotion_diversity,
        CASE 
          WHEN evi >= 70 THEN 'critical'
          WHEN evi >= 50 THEN 'high'
          WHEN evi >= 30 THEN 'medium'
          ELSE 'low'
        END as risk_level
      FROM geo_evi
      ORDER BY evi DESC
    `;
  }
  
  /**
   * Hourly EVI trend
   */
  static hourlyEVI(filters: QueryFilters = {}): string {
    const whereClause = this.buildWhereClause(filters);
    
    return `
      WITH hourly_data AS (
        SELECT 
          EXTRACT(hour FROM timestamp) as hour,
          DATE(timestamp) as date,
          intensity,
          confidence,
          emotion,
          interventionTaken,
          dollarValue
        FROM event_lake_emotions
        ${whereClause}
      ),
      hourly_evi AS (
        SELECT 
          hour,
          date,
          SQRT(
            (VAR_POP(intensity * confidence / 100) * 0.3) +
            (COUNT(DISTINCT emotion) / 10.0 * 0.2) +
            (VAR_POP(CASE 
              WHEN emotion IN ('rage', 'abandonment', 'frustration') THEN 100
              WHEN emotion IN ('anxiety', 'confusion', 'hesitation') THEN 70
              WHEN emotion IN ('decision_paralysis') THEN 60
              ELSE 30 END) / 100 * 0.3) +
            (AVG(CASE WHEN interventionTaken THEN 100 ELSE 0 END) * 0.15) +
            ((100 - AVG(confidence)) * 0.05)
          ) * 100 as evi,
          COUNT(*) as events,
          SUM(dollarValue) as revenue_at_risk
        FROM hourly_data
        GROUP BY hour, date
      )
      SELECT 
        hour,
        AVG(evi) as avg_evi,
        MIN(evi) as min_evi,
        MAX(evi) as max_evi,
        SUM(events) as total_events,
        SUM(revenue_at_risk) as total_revenue_at_risk,
        STDDEV(evi) as evi_volatility
      FROM hourly_evi
      GROUP BY hour
      ORDER BY hour
    `;
  }
  
  /**
   * Daily EVI trend with comparison
   */
  static dailyEVI(filters: QueryFilters = {}): string {
    const whereClause = this.buildWhereClause(filters);
    
    return `
      WITH daily_evi AS (
        SELECT 
          DATE(timestamp) as date,
          SQRT(
            (VAR_POP(intensity * confidence / 100) * 0.3) +
            (COUNT(DISTINCT emotion) / 10.0 * 0.2) +
            (VAR_POP(CASE 
              WHEN emotion IN ('rage', 'abandonment', 'frustration') THEN 100
              WHEN emotion IN ('anxiety', 'confusion', 'hesitation') THEN 70
              WHEN emotion IN ('decision_paralysis') THEN 60
              ELSE 30 END) / 100 * 0.3) +
            (AVG(CASE WHEN interventionTaken THEN 100 ELSE 0 END) * 0.15) +
            ((100 - AVG(confidence)) * 0.05)
          ) * 100 as evi,
          COUNT(*) as events,
          COUNT(DISTINCT userId) as unique_users,
          SUM(dollarValue) as revenue_impact
        FROM event_lake_emotions
        ${whereClause}
        GROUP BY DATE(timestamp)
      )
      SELECT 
        date,
        evi,
        events,
        unique_users,
        revenue_impact,
        LAG(evi) OVER (ORDER BY date) as previous_day_evi,
        ROUND(evi - LAG(evi) OVER (ORDER BY date), 2) as day_over_day_change,
        ROUND(
          (evi - LAG(evi) OVER (ORDER BY date)) / 
          NULLIF(LAG(evi) OVER (ORDER BY date), 0) * 100, 2
        ) as day_over_day_pct_change,
        AVG(evi) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_7day_avg
      FROM daily_evi
      ORDER BY date DESC
    `;
  }
  
  /**
   * Top contributing emotions to EVI
   */
  static topEmotionContributors(filters: QueryFilters = {}): string {
    const whereClause = this.buildWhereClause(filters);
    
    return `
      WITH emotion_stats AS (
        SELECT 
          emotion,
          COUNT(*) as frequency,
          AVG(intensity) as avg_intensity,
          AVG(confidence) as avg_confidence,
          SUM(dollarValue) as total_value,
          AVG(CASE WHEN interventionTaken THEN 1 ELSE 0 END) as intervention_rate,
          CASE 
            WHEN emotion IN ('rage', 'abandonment', 'frustration') THEN 10
            WHEN emotion IN ('anxiety', 'confusion', 'hesitation') THEN 7
            WHEN emotion IN ('decision_paralysis') THEN 6
            WHEN emotion IN ('curiosity', 'confidence', 'delight') THEN 2
            ELSE 5
          END as volatility_weight
        FROM event_lake_emotions
        ${whereClause}
        GROUP BY emotion
      ),
      total_events AS (
        SELECT COUNT(*) as total FROM event_lake_emotions ${whereClause}
      )
      SELECT 
        e.emotion,
        e.frequency,
        ROUND(e.frequency * 100.0 / t.total, 2) as frequency_pct,
        e.avg_intensity,
        e.avg_confidence,
        e.total_value,
        e.intervention_rate * 100 as intervention_rate_pct,
        ROUND(
          (e.frequency * 1.0 / t.total) * 
          e.avg_intensity * 
          e.volatility_weight * 
          (e.intervention_rate + 0.1), 2
        ) as evi_contribution_score,
        e.volatility_weight,
        CASE 
          WHEN e.volatility_weight >= 8 THEN 'high_risk'
          WHEN e.volatility_weight >= 6 THEN 'medium_risk' 
          WHEN e.volatility_weight <= 3 THEN 'positive'
          ELSE 'neutral'
        END as emotion_category
      FROM emotion_stats e
      CROSS JOIN total_events t
      ORDER BY evi_contribution_score DESC
    `;
  }
  
  /**
   * Intervention effectiveness analysis
   */
  static interventionEffectiveness(filters: QueryFilters = {}): string {
    const whereClause = this.buildWhereClause(filters);
    
    return `
      WITH intervention_outcomes AS (
        SELECT 
          emotion,
          interventionTaken,
          outcome,
          intensity,
          confidence,
          dollarValue,
          CASE 
            WHEN outcome IN ('purchase', 'complete_purchase', 'signup') THEN 'positive'
            WHEN outcome IN ('abandon_cart', 'rage_quit', 'leave_site') THEN 'negative'
            ELSE 'neutral'
          END as outcome_category
        FROM event_lake_emotions
        ${whereClause}
        AND outcome IS NOT NULL
        AND outcome != ''
      )
      SELECT 
        emotion,
        COUNT(CASE WHEN interventionTaken THEN 1 END) as interventions_triggered,
        COUNT(CASE WHEN NOT interventionTaken THEN 1 END) as no_intervention,
        
        -- Intervention effectiveness
        ROUND(
          COUNT(CASE WHEN interventionTaken AND outcome_category = 'positive' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN interventionTaken THEN 1 END), 0), 2
        ) as intervention_success_rate,
        
        -- Baseline success rate (no intervention)
        ROUND(
          COUNT(CASE WHEN NOT interventionTaken AND outcome_category = 'positive' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN NOT interventionTaken THEN 1 END), 0), 2
        ) as baseline_success_rate,
        
        -- Revenue impact
        AVG(CASE WHEN interventionTaken THEN dollarValue ELSE 0 END) as avg_intervention_value,
        AVG(CASE WHEN NOT interventionTaken THEN dollarValue ELSE 0 END) as avg_baseline_value,
        
        -- Statistical significance (simplified chi-square test)
        CASE 
          WHEN COUNT(*) >= 100 AND ABS(
            COUNT(CASE WHEN interventionTaken AND outcome_category = 'positive' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN interventionTaken THEN 1 END), 0) -
            COUNT(CASE WHEN NOT interventionTaken AND outcome_category = 'positive' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN NOT interventionTaken THEN 1 END), 0)
          ) > 5 THEN 'significant'
          ELSE 'not_significant'
        END as statistical_significance
        
      FROM intervention_outcomes
      GROUP BY emotion
      HAVING COUNT(*) >= 20  -- Minimum sample size
      ORDER BY intervention_success_rate DESC
    `;
  }
  
  /**
   * Customer journey emotional flow analysis
   */
  static emotionalJourneyFlow(filters: QueryFilters = {}): string {
    const whereClause = this.buildWhereClause(filters);
    
    return `
      WITH user_journeys AS (
        SELECT 
          sessionId,
          userId,
          ARRAY_AGG(
            emotion ORDER BY timestamp
          ) as emotion_sequence,
          ARRAY_AGG(
            pageUrl ORDER BY timestamp  
          ) as page_sequence,
          MIN(timestamp) as journey_start,
          MAX(timestamp) as journey_end,
          COUNT(*) as touchpoints,
          MAX(CASE WHEN outcome IN ('purchase', 'signup') THEN 1 ELSE 0 END) as converted
        FROM event_lake_emotions
        ${whereClause}
        GROUP BY sessionId, userId
        HAVING COUNT(*) >= 3  -- At least 3 emotional touchpoints
      ),
      emotion_transitions AS (
        SELECT 
          sessionId,
          emotion_sequence,
          touchpoints,
          converted,
          CASE 
            WHEN CARDINALITY(
              FILTER(emotion_sequence, x -> x IN ('rage', 'frustration', 'abandonment'))
            ) > 0 THEN 'high_risk'
            WHEN CARDINALITY(
              FILTER(emotion_sequence, x -> x IN ('anxiety', 'confusion', 'hesitation'))  
            ) > CARDINALITY(emotion_sequence) * 0.5 THEN 'medium_risk'
            ELSE 'low_risk'
          END as journey_risk,
          
          -- Common patterns
          CASE 
            WHEN SEQUENCE_MATCH(emotion_sequence, 'curiosity', 'confidence', 'delight') THEN 'optimal_flow'
            WHEN SEQUENCE_MATCH(emotion_sequence, 'confusion', 'frustration', 'rage') THEN 'escalation_flow'
            WHEN SEQUENCE_MATCH(emotion_sequence, 'hesitation', 'anxiety') THEN 'uncertainty_flow'
            ELSE 'other_flow'
          END as flow_pattern
        FROM user_journeys
      )
      SELECT 
        flow_pattern,
        journey_risk,
        COUNT(*) as journey_count,
        AVG(touchpoints) as avg_touchpoints,
        SUM(converted) as conversions,
        ROUND(SUM(converted) * 100.0 / COUNT(*), 2) as conversion_rate,
        
        -- Most common emotion sequences for this pattern
        MODE() WITHIN GROUP (ORDER BY ARRAY_TO_STRING(emotion_sequence, '->')) as common_sequence
        
      FROM emotion_transitions
      GROUP BY flow_pattern, journey_risk
      ORDER BY journey_count DESC
    `;
  }
  
  /**
   * Competitive intelligence - industry benchmarking
   */
  static industryBenchmarking(filters: QueryFilters = {}): string {
    const whereClause = this.buildWhereClause(filters);
    
    return `
      WITH company_metrics AS (
        SELECT 
          companyId,
          vertical,
          geography,
          COUNT(*) as total_events,
          SQRT(
            (VAR_POP(intensity * confidence / 100) * 0.3) +
            (COUNT(DISTINCT emotion) / 10.0 * 0.2) +
            (VAR_POP(CASE 
              WHEN emotion IN ('rage', 'abandonment', 'frustration') THEN 100
              WHEN emotion IN ('anxiety', 'confusion', 'hesitation') THEN 70
              WHEN emotion IN ('decision_paralysis') THEN 60
              ELSE 30 END) / 100 * 0.3) +
            (AVG(CASE WHEN interventionTaken THEN 100 ELSE 0 END) * 0.15) +
            ((100 - AVG(confidence)) * 0.05)
          ) * 100 as company_evi,
          AVG(CASE WHEN interventionTaken THEN 1 ELSE 0 END) as intervention_rate,
          SUM(dollarValue) / COUNT(*) as avg_dollar_value
        FROM event_lake_emotions
        ${whereClause}
        GROUP BY companyId, vertical, geography
        HAVING COUNT(*) >= 100  -- Minimum events for statistical validity
      ),
      industry_benchmarks AS (
        SELECT 
          vertical,
          AVG(company_evi) as industry_avg_evi,
          STDDEV(company_evi) as industry_evi_stddev,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY company_evi) as p25_evi,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY company_evi) as p50_evi,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY company_evi) as p75_evi,
          PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY company_evi) as p90_evi,
          COUNT(*) as companies_in_vertical
        FROM company_metrics
        GROUP BY vertical
      )
      SELECT 
        cm.companyId,
        cm.vertical,
        cm.geography,
        cm.company_evi,
        ib.industry_avg_evi,
        ROUND(cm.company_evi - ib.industry_avg_evi, 2) as vs_industry_avg,
        ROUND((cm.company_evi - ib.industry_avg_evi) / ib.industry_avg_evi * 100, 2) as vs_industry_pct,
        
        -- Percentile ranking
        CASE 
          WHEN cm.company_evi >= ib.p90_evi THEN 'top_10_pct'
          WHEN cm.company_evi >= ib.p75_evi THEN 'top_25_pct'  
          WHEN cm.company_evi >= ib.p50_evi THEN 'above_median'
          WHEN cm.company_evi >= ib.p25_evi THEN 'below_median'
          ELSE 'bottom_25_pct'
        END as industry_percentile,
        
        -- Competitive position
        CASE 
          WHEN cm.company_evi < ib.industry_avg_evi - ib.industry_evi_stddev THEN 'competitive_advantage'
          WHEN cm.company_evi > ib.industry_avg_evi + ib.industry_evi_stddev THEN 'competitive_disadvantage'
          ELSE 'industry_average'
        END as competitive_position,
        
        ib.companies_in_vertical
        
      FROM company_metrics cm
      JOIN industry_benchmarks ib ON cm.vertical = ib.vertical
      ORDER BY cm.company_evi ASC
    `;
  }
  
  /**
   * Build WHERE clause from filters
   */
  private static buildWhereClause(filters: QueryFilters, baseClause: string = 'WHERE 1=1'): string {
    let whereClause = baseClause;
    
    if (filters.startDate) {
      whereClause += ` AND timestamp >= timestamp '${filters.startDate}'`;
    }
    if (filters.endDate) {
      whereClause += ` AND timestamp <= timestamp '${filters.endDate}'`;
    }
    if (filters.vertical) {
      whereClause += ` AND vertical = '${filters.vertical}'`;
    }
    if (filters.geography) {
      whereClause += ` AND geography = '${filters.geography}'`;
    }
    if (filters.companyId) {
      whereClause += ` AND companyId = '${filters.companyId}'`;
    }
    if (filters.minConfidence) {
      whereClause += ` AND confidence >= ${filters.minConfidence}`;
    }
    
    return whereClause;
  }
  
  /**
   * Get pre-built query by name
   */
  static getQuery(queryName: string, filters: QueryFilters = {}): string {
    const queries: Record<string, (filters: QueryFilters) => string> = {
      'realtime-evi': this.realtimeEVI,
      'evi-by-vertical': this.eviByVertical,
      'evi-by-geography': this.eviByGeography,
      'hourly-evi': this.hourlyEVI,
      'daily-evi': this.dailyEVI,
      'top-emotions': this.topEmotionContributors,
      'intervention-effectiveness': this.interventionEffectiveness,
      'emotional-journey': this.emotionalJourneyFlow,
      'industry-benchmarking': this.industryBenchmarking
    };
    
    const queryBuilder = queries[queryName];
    if (!queryBuilder) {
      throw new Error(`Unknown query: ${queryName}`);
    }
    
    return queryBuilder(filters);
  }
}

export const eviQueries = new EVIQueries();