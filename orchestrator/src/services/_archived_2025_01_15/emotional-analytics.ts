/**
 * Emotional Analytics Service
 * 
 * This is where emotional intelligence becomes business intelligence.
 * We don't just track emotions - we find the patterns that predict revenue.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { EmotionalLearningEngine } from './emotional-learning.js';
import { eventLakeService, EventLakeRecord } from './event-lake.js';
import { EVICalculator } from './evi-calculator.js';
import { broadcastEmotion } from '../websocket-handler.js';

// Lazy-initialize Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('Supabase client initialized');
  }
  return supabase;
}

export interface EmotionalEvent {
  tenant_id?: string; // Added for RLS
  session_id: string;
  user_id?: string;
  timestamp: Date | string;
  emotion: string;
  confidence: number;
  intensity: number;
  predicted_action: string;
  intervention_window: number;
  page_url: string;
  element_target?: string;
  micro_behaviors: any[];
  metadata?: Record<string, any>;
}

export interface EmotionalInsight {
  pattern: string;
  frequency: number;
  conversion_impact: number;
  revenue_impact: number;
  recommended_action: string;
  confidence: number;
}

export class EmotionalAnalytics {
  /**
   * Record an emotional event
   */
  static async recordEmotionalEvent(event: EmotionalEvent): Promise<void> {
    const supabase = getSupabaseClient();
    
    try {
      // Always record to Event Lake for EVI analytics (primary data store)
      const eventLakeRecord: EventLakeRecord = {
        timestamp: typeof event.timestamp === 'string' ? event.timestamp : new Date(event.timestamp).toISOString(),
        userId: event.user_id || 'anonymous',
        companyId: event.tenant_id || 'DEMO_TENANT',
        sessionId: event.session_id,
        vertical: event.metadata?.vertical || 'other',
        geography: event.metadata?.geography || 'other',
        emotion: event.emotion,
        confidence: event.confidence,
        intensity: event.intensity,
        dollarValue: event.metadata?.dollarValue || 0,
        interventionTaken: false, // Will be updated by intervention engine
        outcome: '', // Will be updated when outcome is determined
        pageUrl: event.page_url,
        elementTarget: event.element_target,
        userAgent: event.metadata?.userAgent || 'unknown',
        metadata: {
          deviceType: event.metadata?.deviceType || 'unknown',
          platform: event.metadata?.platform || 'web',
          campaignId: event.metadata?.campaignId,
          referrer: event.metadata?.referrer,
          customFields: event.metadata
        }
      };

      // Record to Event Lake (S3 + Athena) - primary storage for EVI
      await eventLakeService.addEvent(eventLakeRecord);
      
      // Also record to Supabase for backwards compatibility (if configured)
      if (supabase) {
        console.log('Recording to Supabase for backwards compatibility:', event.emotion);
        const { error } = await supabase
          .from('emotional_events')
          .insert({
            ...event,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('Supabase insert error (non-critical):', error);
        } else {
          console.log('Successfully inserted to Supabase:', event.emotion);
        }
      }

      console.log(`📊 Event recorded to Event Lake: ${event.emotion} (confidence: ${event.confidence}%)`);

      // Trigger real-time analysis if high-value emotion detected
      if (event.confidence > 85) {
        await this.analyzeHighValueEmotion(event);
      }
    } catch (error) {
      console.error('Failed to record emotional event:', error);
      throw error;
    }
  }

  /**
   * Analyze high-value emotional moments for immediate intervention
   */
  static async analyzeHighValueEmotion(event: EmotionalEvent): Promise<void> {
    const interventionMap: Record<string, () => Promise<void>> = {
      'rage': async () => {
        // Customer is about to rage quit
        console.log(`🚨 RAGE DETECTED: Session ${event.session_id} at ${event.confidence}% confidence`);
        // Trigger: Instant chat support, simplified UI, emergency discount
      },
      'decision_paralysis': async () => {
        // Customer can't decide
        console.log(`🔄 PARALYSIS: Session ${event.session_id} needs fewer choices`);
        // Trigger: Reduce options, show bestseller, add urgency
      },
      'abandonment': async () => {
        // Customer is leaving
        console.log(`🚪 ABANDONMENT: Session ${event.session_id} leaving at ${event.page_url}`);
        // Trigger: Exit intent popup, save cart, follow-up email
      },
      'delight': async () => {
        // Customer is happy - capitalize!
        console.log(`✨ DELIGHT: Session ${event.session_id} ready for upsell`);
        // Trigger: Upsell, loyalty program, referral request
      },
      'urgency': async () => {
        // Customer wants it NOW
        console.log(`⚡ URGENCY: Session ${event.session_id} ready to buy`);
        // Trigger: Fast checkout, remove friction, show availability
      }
    };

    const intervention = interventionMap[event.emotion];
    if (intervention) {
      await intervention();
    }
  }

  /**
   * Get emotional patterns for a specific page/element
   */
  static async getEmotionalPatterns(
    pageUrl: string,
    timeRange: { start: Date; end: Date }
  ): Promise<EmotionalInsight[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('emotional_events')
        .select('*')
        .eq('page_url', pageUrl)
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString());

      if (error) throw error;

      return this.extractInsights(data || []);
    } catch (error) {
      console.error('Failed to get emotional patterns:', error);
      return [];
    }
  }

  /**
   * Extract actionable insights from emotional data
   */
  static extractInsights(events: any[]): EmotionalInsight[] {
    const insights: EmotionalInsight[] = [];
    
    // Group by emotion
    const emotionGroups = events.reduce((acc, event) => {
      if (!acc[event.emotion]) acc[event.emotion] = [];
      acc[event.emotion].push(event);
      return acc;
    }, {} as Record<string, any[]>);

    // Analyze each emotion group
    for (const [emotion, group] of Object.entries(emotionGroups)) {
      const typedGroup = group as any[];
      const avgConfidence = typedGroup.reduce((sum: number, e: any) => sum + e.confidence, 0) / typedGroup.length;
      const avgIntensity = typedGroup.reduce((sum: number, e: any) => sum + e.intensity, 0) / typedGroup.length;
      
      // Calculate conversion impact (simplified - would use actual conversion data)
      const conversionImpact = this.calculateConversionImpact(emotion, avgConfidence);
      
      insights.push({
        pattern: `${emotion}_pattern`,
        frequency: typedGroup.length,
        conversion_impact: conversionImpact,
        revenue_impact: conversionImpact * typedGroup.length * 100, // Simplified revenue calc
        recommended_action: this.getRecommendedAction(emotion, avgIntensity),
        confidence: avgConfidence
      });
    }

    // Sort by revenue impact
    return insights.sort((a, b) => b.revenue_impact - a.revenue_impact);
  }

  /**
   * Calculate how an emotion impacts conversion
   */
  static calculateConversionImpact(emotion: string, confidence: number): number {
    const impactMap: Record<string, number> = {
      'confidence': 0.3,
      'delight': 0.25,
      'curiosity': 0.2,
      'urgency': 0.35,
      'hesitation': -0.15,
      'confusion': -0.25,
      'frustration': -0.35,
      'anxiety': -0.2,
      'rage': -0.5,
      'abandonment': -0.6,
      'decision_paralysis': -0.3,
      'discovery': 0.15
    };

    const baseImpact = impactMap[emotion] || 0;
    return baseImpact * (confidence / 100);
  }

  /**
   * Get recommended action based on emotional pattern
   */
  static getRecommendedAction(emotion: string, intensity: number): string {
    const actions: Record<string, string> = {
      'rage': intensity > 70 
        ? 'Deploy emergency support intervention' 
        : 'Simplify UI and reduce friction points',
      'frustration': 'Add contextual help and clearer navigation',
      'anxiety': 'Display trust signals and security badges',
      'hesitation': 'Show social proof and testimonials',
      'confusion': 'Improve information architecture',
      'abandonment': 'Implement exit-intent recovery flow',
      'decision_paralysis': 'Reduce choices to 3 or less',
      'curiosity': 'Reveal more content progressively',
      'confidence': 'Streamline to conversion',
      'delight': 'Introduce upsell opportunity',
      'urgency': 'Fast-track checkout process',
      'discovery': 'Suggest related content'
    };

    return actions[emotion] || 'Monitor and gather more data';
  }

  /**
   * Generate emotional heat map for a page
   */
  static async generateEmotionalHeatmap(
    pageUrl: string,
    timeRange: { start: Date; end: Date }
  ): Promise<any> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('emotional_events')
        .select('element_target, emotion, intensity, confidence')
        .eq('page_url', pageUrl)
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString());

      if (error) throw error;

      // Group by element
      const heatmap = (data || []).reduce((acc, event) => {
        const key = event.element_target || 'page';
        if (!acc[key]) {
          acc[key] = {
            interactions: 0,
            emotions: {},
            avgIntensity: 0
          };
        }
        
        acc[key].interactions++;
        acc[key].emotions[event.emotion] = (acc[key].emotions[event.emotion] || 0) + 1;
        acc[key].avgIntensity = (acc[key].avgIntensity + event.intensity) / 2;
        
        return acc;
      }, {} as Record<string, any>);

      return heatmap;
    } catch (error) {
      console.error('Failed to generate heatmap:', error);
      return null;
    }
  }

  /**
   * Predict next user action based on emotional sequence
   */
  static async predictNextAction(
    sessionId: string,
    recentEmotions: string[]
  ): Promise<{ action: string; probability: number; isLearned?: boolean }> {
    // First, check if we have learned patterns for this sequence
    const learnedPrediction = await EmotionalLearningEngine.getRefinedPrediction(recentEmotions);
    
    if (learnedPrediction.isLearned && learnedPrediction.confidence > 60) {
      // Use learned pattern if confident enough
      console.log(`🧠 LEARNED: Using ML prediction - ${learnedPrediction.action} at ${learnedPrediction.confidence}%`);
      return { 
        action: learnedPrediction.action, 
        probability: learnedPrediction.confidence,
        isLearned: true 
      };
    }
    
    // Fall back to rule-based patterns
    const sequencePatterns: Record<string, { action: string; probability: number }> = {
      'curiosity,confidence,urgency': { action: 'purchase', probability: 85 },
      'hesitation,anxiety,abandonment': { action: 'leave_site', probability: 90 },
      'confusion,frustration,rage': { action: 'seek_support', probability: 75 },
      'discovery,delight,curiosity': { action: 'explore_more', probability: 80 },
      'decision_paralysis,hesitation,anxiety': { action: 'abandon_cart', probability: 70 },
      'confidence,delight,confidence': { action: 'complete_purchase', probability: 90 },
      'frustration,frustration,rage': { action: 'rage_quit', probability: 95 }
    };

    const sequence = recentEmotions.slice(-3).join(',');
    
    // Check for exact match
    if (sequencePatterns[sequence]) {
      const prediction = sequencePatterns[sequence];
      
      // Record this prediction for learning
      setTimeout(() => {
        EmotionalLearningEngine.recordOutcome(
          sessionId,
          recentEmotions.slice(-3),
          prediction.action,
          'pending' // Will be updated when actual action occurs
        );
      }, 0);
      
      return { ...prediction, isLearned: false };
    }

    // Check for partial matches
    for (const [pattern, prediction] of Object.entries(sequencePatterns)) {
      if (pattern.includes(recentEmotions[recentEmotions.length - 1])) {
        return { ...prediction, probability: prediction.probability * 0.7, isLearned: false };
      }
    }

    // Default prediction
    return { action: 'continue_browsing', probability: 50, isLearned: false };
  }

  /**
   * Calculate emotional conversion funnel
   */
  static async getEmotionalFunnel(
    timeRange: { start: Date; end: Date }
  ): Promise<any> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('emotional_events')
        .select('session_id, emotion, timestamp, predicted_action')
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Group by session and track emotional journey
      const sessions = (data || []).reduce((acc, event) => {
        if (!acc[event.session_id]) {
          acc[event.session_id] = [];
        }
        acc[event.session_id].push(event);
        return acc;
      }, {} as Record<string, any[]>);

      // Analyze funnel stages
      const funnel = {
        awareness: 0,  // Curiosity, Discovery
        interest: 0,   // Confidence, Delight
        consideration: 0, // Hesitation, Decision Paralysis
        intent: 0,     // Urgency, Confidence
        purchase: 0,   // Completion
        abandonment: 0 // Rage, Frustration, Abandonment
      };

      for (const journey of Object.values(sessions)) {
        const emotions = journey.map(e => e.emotion);
        
        if (emotions.includes('curiosity') || emotions.includes('discovery')) funnel.awareness++;
        if (emotions.includes('confidence') || emotions.includes('delight')) funnel.interest++;
        if (emotions.includes('hesitation') || emotions.includes('decision_paralysis')) funnel.consideration++;
        if (emotions.includes('urgency')) funnel.intent++;
        if (journey[journey.length - 1]?.predicted_action === 'complete_purchase') funnel.purchase++;
        if (emotions.includes('rage') || emotions.includes('abandonment')) funnel.abandonment++;
      }

      return funnel;
    } catch (error) {
      console.error('Failed to calculate emotional funnel:', error);
      return null;
    }
  }
}

// Express endpoint handlers
export const emotionalAnalyticsHandlers = {
  // Record emotional event
  recordEvent: async (req: Request, res: Response) => {
    console.log('📊 Emotional event received:', req.body.emotion, 'from session:', req.body.session_id);
    try {
      // Use user_id as tenant_id (from the API key in the event)
      const eventWithTenant = {
        ...req.body,
        tenant_id: req.body.user_id || 'DEMO_TENANT'
      };

      // Record the event
      await EmotionalAnalytics.recordEmotionalEvent(eventWithTenant);

      // Broadcast to WebSocket clients for real-time dashboard
      broadcastEmotion(eventWithTenant);

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error in recordEvent handler:', error);
      res.status(500).json({ error: 'Failed to record emotional event' });
    }
  },

  // Get emotional patterns
  getPatterns: async (req: Request, res: Response) => {
    try {
      const { pageUrl, start, end } = req.query;
      const patterns = await EmotionalAnalytics.getEmotionalPatterns(
        pageUrl as string,
        {
          start: new Date(start as string),
          end: new Date(end as string)
        }
      );
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get patterns' });
    }
  },

  // Get emotional heatmap
  getHeatmap: async (req: Request, res: Response) => {
    try {
      const { pageUrl, start, end } = req.query;
      const heatmap = await EmotionalAnalytics.generateEmotionalHeatmap(
        pageUrl as string,
        {
          start: new Date(start as string),
          end: new Date(end as string)
        }
      );
      res.json(heatmap);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate heatmap' });
    }
  },

  // Predict next action
  predictAction: async (req: Request, res: Response) => {
    try {
      const { sessionId, emotions } = req.body;
      const prediction = await EmotionalAnalytics.predictNextAction(sessionId, emotions);
      res.json(prediction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to predict action' });
    }
  },

  // Get emotional funnel
  getFunnel: async (req: Request, res: Response) => {
    try {
      const { start, end } = req.query;
      const funnel = await EmotionalAnalytics.getEmotionalFunnel({
        start: new Date(start as string),
        end: new Date(end as string)
      });
      res.json(funnel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get funnel' });
    }
  },

  // Record actual outcome for learning
  recordOutcome: async (req: Request, res: Response) => {
    try {
      const { sessionId, emotions, predictedAction, actualAction } = req.body;
      await EmotionalLearningEngine.recordOutcome(
        sessionId,
        emotions,
        predictedAction,
        actualAction
      );
      res.json({ success: true, message: 'Learning from outcome' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record outcome' });
    }
  },

  // Get data moat metrics
  getDataMoat: async (req: Request, res: Response) => {
    try {
      const metrics = await EmotionalLearningEngine.getDataMoatMetrics();
      res.json({
        metrics,
        summary: metrics ? {
          proprietaryPatterns: metrics.unique_patterns.length,
          competitiveAdvantage: `${metrics.competitive_advantage_score.toFixed(1)}%`,
          learningVelocity: `${metrics.learning_velocity.toFixed(2)} patterns/day`,
          totalInteractions: metrics.total_interactions
        } : null
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get data moat metrics' });
    }
  },

  // Get blind spots
  getBlindSpots: async (req: Request, res: Response) => {
    try {
      const blindSpots = await EmotionalLearningEngine.identifyBlindSpots();
      res.json({
        blindSpots,
        recommendation: blindSpots && blindSpots.length > 0 
          ? 'Focus training on these patterns for improved accuracy'
          : 'No significant blind spots detected'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to identify blind spots' });
    }
  },

  // EVI Analytics Endpoints

  // Calculate EVI for a given time range and filters
  calculateEVI: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, vertical, geography, companyId, minConfidence } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const timeRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      const filters = {
        vertical: vertical as string,
        geography: geography as string,
        companyId: companyId as string,
        minConfidence: minConfidence ? parseInt(minConfidence as string) : undefined
      };

      const eviMetric = await EVICalculator.calculateEVI(timeRange, filters);
      
      res.json({
        evi: eviMetric,
        timestamp: new Date().toISOString(),
        message: `EVI calculated: ${eviMetric.evi.toFixed(2)} (${eviMetric.risk.level} risk)`
      });

    } catch (error) {
      console.error('EVI calculation failed:', error);
      res.status(500).json({ error: 'Failed to calculate EVI' });
    }
  },

  // Generate comprehensive EVI dashboard
  getEVIDashboard: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, companyId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const timeRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      const filters = {
        companyId: companyId as string
      };

      const dashboard = await EVICalculator.generateDashboard(timeRange, filters);
      
      res.json({
        dashboard,
        timestamp: new Date().toISOString(),
        message: `EVI Dashboard generated for ${timeRange.start.toDateString()} to ${timeRange.end.toDateString()}`
      });

    } catch (error) {
      console.error('EVI dashboard generation failed:', error);
      res.status(500).json({ error: 'Failed to generate EVI dashboard' });
    }
  },

  // Get Event Lake statistics
  getEventLakeStats: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      let timeRange: { start: Date; end: Date } | undefined;
      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };
      }

      const stats = await eventLakeService.getDataLakeStats(timeRange);
      
      res.json({
        stats,
        timestamp: new Date().toISOString(),
        message: 'Event Lake statistics retrieved successfully'
      });

    } catch (error) {
      console.error('Event Lake stats failed:', error);
      res.status(500).json({ error: 'Failed to get Event Lake statistics' });
    }
  },

  // Initialize Event Lake table
  initializeEventLake: async (req: Request, res: Response) => {
    try {
      await eventLakeService.createEventTable();
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Event Lake table initialized successfully'
      });

    } catch (error) {
      console.error('Event Lake initialization failed:', error);
      res.status(500).json({ error: 'Failed to initialize Event Lake' });
    }
  },

  // Flush pending batches (for testing/admin)
  flushEventLake: async (req: Request, res: Response) => {
    try {
      await eventLakeService.flushAllBatches();
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'All pending batches flushed to Event Lake'
      });

    } catch (error) {
      console.error('Event Lake flush failed:', error);
      res.status(500).json({ error: 'Failed to flush Event Lake batches' });
    }
  }
};