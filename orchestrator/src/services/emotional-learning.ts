/**
 * Emotional Learning Engine
 * 
 * This is where patterns evolve. Every failed prediction teaches us.
 * Every successful conversion validates our model. We don't just track - we learn.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmotionalEvent, EmotionalInsight } from './emotional-analytics';

const supabase: SupabaseClient | null = 
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

interface PatternOutcome {
  pattern_id: string;
  emotional_sequence: string[];
  predicted_action: string;
  actual_action: string;
  success: boolean;
  confidence_adjustment: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface LearnedPattern {
  id: string;
  emotional_sequence: string[];
  action: string;
  base_confidence: number;
  success_rate: number;
  sample_size: number;
  last_updated: Date;
  customer_specific: boolean;
  revenue_impact: number;
}

interface DataMoat {
  customer_id: string;
  unique_patterns: LearnedPattern[];
  pattern_effectiveness: Record<string, number>;
  competitive_advantage_score: number;
  total_interactions: number;
  learning_velocity: number;
}

export class EmotionalLearningEngine {
  private static learningRate = 0.1; // How fast we adjust
  private static minSampleSize = 10; // Minimum data before trusting a pattern
  private static decayFactor = 0.95; // Old patterns fade slowly
  
  /**
   * Record the outcome of a prediction
   */
  static async recordOutcome(
    sessionId: string,
    emotionalSequence: string[],
    predictedAction: string,
    actualAction: string
  ): Promise<void> {
    if (!supabase) return;
    
    const success = predictedAction === actualAction;
    const confidenceAdjustment = success ? 0.05 : -0.1; // Reward success, punish failure harder
    
    const outcome: PatternOutcome = {
      pattern_id: this.generatePatternId(emotionalSequence),
      emotional_sequence: emotionalSequence,
      predicted_action: predictedAction,
      actual_action: actualAction,
      success,
      confidence_adjustment: confidenceAdjustment,
      timestamp: new Date(),
      metadata: { session_id: sessionId }
    };
    
    // Store the outcome
    await supabase
      .from('pattern_outcomes')
      .insert(outcome);
    
    // Update the learned pattern
    await this.updateLearnedPattern(outcome);
    
    // If this is a new successful pattern, add to data moat
    if (success && emotionalSequence.length >= 3) {
      await this.addToDataMoat(emotionalSequence, actualAction);
    }
  }
  
  /**
   * Update learned patterns based on outcomes
   */
  static async updateLearnedPattern(outcome: PatternOutcome): Promise<void> {
    if (!supabase) return;
    
    const { data: existingPattern } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('id', outcome.pattern_id)
      .single();
    
    if (existingPattern) {
      // Update existing pattern
      const newSampleSize = existingPattern.sample_size + 1;
      const newSuccessRate = (
        (existingPattern.success_rate * existingPattern.sample_size) + 
        (outcome.success ? 1 : 0)
      ) / newSampleSize;
      
      // Adjust confidence based on success rate and sample size
      const confidenceBoost = Math.log10(newSampleSize) / 10; // Logarithmic confidence boost
      const newConfidence = Math.min(
        95, // Max 95% confidence
        existingPattern.base_confidence + outcome.confidence_adjustment + confidenceBoost
      );
      
      await supabase
        .from('learned_patterns')
        .update({
          success_rate: newSuccessRate,
          sample_size: newSampleSize,
          base_confidence: newConfidence,
          last_updated: new Date().toISOString()
        })
        .eq('id', outcome.pattern_id);
    } else {
      // Create new pattern
      await supabase
        .from('learned_patterns')
        .insert({
          id: outcome.pattern_id,
          emotional_sequence: outcome.emotional_sequence,
          action: outcome.actual_action,
          base_confidence: outcome.success ? 60 : 30,
          success_rate: outcome.success ? 1 : 0,
          sample_size: 1,
          last_updated: new Date().toISOString(),
          customer_specific: true,
          revenue_impact: 0
        });
    }
  }
  
  /**
   * Get refined prediction based on learned patterns
   */
  static async getRefinedPrediction(
    emotionalSequence: string[]
  ): Promise<{ action: string; confidence: number; isLearned: boolean }> {
    if (!supabase || emotionalSequence.length < 2) {
      return { action: 'unknown', confidence: 0, isLearned: false };
    }
    
    // Look for exact pattern match
    const patternId = this.generatePatternId(emotionalSequence);
    const { data: exactMatch } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('id', patternId)
      .single();
    
    if (exactMatch && exactMatch.sample_size >= this.minSampleSize) {
      return {
        action: exactMatch.action,
        confidence: exactMatch.base_confidence * exactMatch.success_rate,
        isLearned: true
      };
    }
    
    // Look for similar patterns (fuzzy matching)
    const { data: similarPatterns } = await supabase
      .from('learned_patterns')
      .select('*')
      .gte('sample_size', this.minSampleSize)
      .order('success_rate', { ascending: false })
      .limit(10);
    
    if (similarPatterns && similarPatterns.length > 0) {
      // Find best matching pattern
      const bestMatch = this.findBestPatternMatch(emotionalSequence, similarPatterns);
      if (bestMatch) {
        return {
          action: bestMatch.action,
          confidence: bestMatch.base_confidence * bestMatch.success_rate * 0.8, // 80% confidence for fuzzy match
          isLearned: true
        };
      }
    }
    
    // No learned pattern found
    return { action: 'continue_browsing', confidence: 50, isLearned: false };
  }
  
  /**
   * Build data moat - accumulate proprietary patterns
   */
  static async addToDataMoat(
    emotionalSequence: string[],
    action: string
  ): Promise<void> {
    if (!supabase) return;
    
    const customerId = process.env.CUSTOMER_ID || 'default';
    
    // Check if this pattern is unique to this customer
    const { data: globalPattern } = await supabase
      .from('global_patterns')
      .select('*')
      .eq('pattern_id', this.generatePatternId(emotionalSequence))
      .single();
    
    if (!globalPattern) {
      // This is a unique pattern - add to data moat
      await supabase
        .from('data_moat')
        .insert({
          customer_id: customerId,
          pattern_id: this.generatePatternId(emotionalSequence),
          emotional_sequence: emotionalSequence,
          action,
          discovered_at: new Date().toISOString(),
          is_proprietary: true,
          value_score: this.calculatePatternValue(emotionalSequence, action)
        });
      
      console.log(`🏰 DATA MOAT: New proprietary pattern discovered - ${emotionalSequence.join('→')} → ${action}`);
    }
  }
  
  /**
   * Get data moat metrics
   */
  static async getDataMoatMetrics(): Promise<DataMoat | null> {
    if (!supabase) return null;
    
    const customerId = process.env.CUSTOMER_ID || 'default';
    
    const { data: moatData } = await supabase
      .from('data_moat')
      .select('*')
      .eq('customer_id', customerId);
    
    if (!moatData) return null;
    
    const { data: patterns } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('customer_specific', true);
    
    const patternEffectiveness: Record<string, number> = {};
    patterns?.forEach(p => {
      patternEffectiveness[p.id] = p.success_rate;
    });
    
    // Calculate competitive advantage score
    const uniquePatternCount = moatData.filter(d => d.is_proprietary).length;
    const avgSuccessRate = patterns?.reduce((sum, p) => sum + p.success_rate, 0) / (patterns?.length || 1);
    const competitiveAdvantage = (uniquePatternCount * 10) + (avgSuccessRate * 100);
    
    // Calculate learning velocity (patterns discovered per day)
    const oldestPattern = moatData.reduce((oldest, current) => 
      new Date(current.discovered_at) < new Date(oldest.discovered_at) ? current : oldest
    );
    const daysSinceStart = (Date.now() - new Date(oldestPattern.discovered_at).getTime()) / (1000 * 60 * 60 * 24);
    const learningVelocity = moatData.length / Math.max(1, daysSinceStart);
    
    return {
      customer_id: customerId,
      unique_patterns: patterns || [],
      pattern_effectiveness: patternEffectiveness,
      competitive_advantage_score: competitiveAdvantage,
      total_interactions: moatData.length,
      learning_velocity: learningVelocity
    };
  }
  
  /**
   * Pattern evolution - patterns that work get stronger
   */
  static async evolvePatterns(): Promise<void> {
    if (!supabase) return;
    
    // Get all patterns with sufficient data
    const { data: patterns } = await supabase
      .from('learned_patterns')
      .select('*')
      .gte('sample_size', this.minSampleSize);
    
    if (!patterns) return;
    
    for (const pattern of patterns) {
      // Apply decay to old patterns
      const daysSinceUpdate = (Date.now() - new Date(pattern.last_updated).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 7) {
        const decayedConfidence = pattern.base_confidence * Math.pow(this.decayFactor, daysSinceUpdate / 7);
        
        await supabase
          .from('learned_patterns')
          .update({ base_confidence: Math.max(30, decayedConfidence) })
          .eq('id', pattern.id);
      }
      
      // Promote high-performing patterns
      if (pattern.success_rate > 0.8 && pattern.sample_size > 50) {
        await supabase
          .from('learned_patterns')
          .update({ 
            base_confidence: Math.min(95, pattern.base_confidence * 1.1),
            customer_specific: false // Share successful patterns globally
          })
          .eq('id', pattern.id);
        
        console.log(`📈 EVOLUTION: Pattern ${pattern.id} promoted to global status`);
      }
      
      // Demote failing patterns
      if (pattern.success_rate < 0.3 && pattern.sample_size > 20) {
        await supabase
          .from('learned_patterns')
          .delete()
          .eq('id', pattern.id);
        
        console.log(`📉 EVOLUTION: Pattern ${pattern.id} removed due to poor performance`);
      }
    }
  }
  
  /**
   * Generate pattern ID from emotional sequence
   */
  private static generatePatternId(sequence: string[]): string {
    return sequence.join('_').toLowerCase().replace(/\s+/g, '');
  }
  
  /**
   * Find best matching pattern using sequence similarity
   */
  private static findBestPatternMatch(
    targetSequence: string[],
    patterns: LearnedPattern[]
  ): LearnedPattern | null {
    let bestMatch: LearnedPattern | null = null;
    let bestScore = 0;
    
    for (const pattern of patterns) {
      const score = this.calculateSequenceSimilarity(targetSequence, pattern.emotional_sequence);
      if (score > bestScore && score > 0.6) { // At least 60% similarity
        bestScore = score;
        bestMatch = pattern;
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Calculate similarity between two emotional sequences
   */
  private static calculateSequenceSimilarity(seq1: string[], seq2: string[]): number {
    const maxLen = Math.max(seq1.length, seq2.length);
    const minLen = Math.min(seq1.length, seq2.length);
    
    if (minLen === 0) return 0;
    
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (seq1[i] === seq2[i]) matches++;
      // Partial credit for similar emotions
      else if (this.areEmotionsSimilar(seq1[i], seq2[i])) matches += 0.5;
    }
    
    // Penalize length difference
    const lengthPenalty = (maxLen - minLen) / maxLen;
    return (matches / maxLen) * (1 - lengthPenalty * 0.5);
  }
  
  /**
   * Check if two emotions are similar
   */
  private static areEmotionsSimilar(emotion1: string, emotion2: string): boolean {
    const similarityGroups = [
      ['frustration', 'rage', 'anxiety'],
      ['confidence', 'delight', 'discovery'],
      ['hesitation', 'confusion', 'decision_paralysis'],
      ['urgency', 'curiosity']
    ];
    
    for (const group of similarityGroups) {
      if (group.includes(emotion1) && group.includes(emotion2)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calculate the value of a pattern
   */
  private static calculatePatternValue(sequence: string[], action: string): number {
    // High-value actions get higher scores
    const actionValues: Record<string, number> = {
      'complete_purchase': 100,
      'add_to_cart': 50,
      'sign_up': 75,
      'seek_support': 30,
      'explore_more': 20,
      'abandon_cart': -50,
      'rage_quit': -100,
      'leave_site': -75
    };
    
    const baseValue = actionValues[action] || 0;
    
    // Longer sequences are more valuable (more predictive power)
    const sequenceBonus = sequence.length * 10;
    
    // Rare patterns are more valuable
    const rarityBonus = sequence.includes('delight') || sequence.includes('urgency') ? 25 : 0;
    
    return baseValue + sequenceBonus + rarityBonus;
  }
  
  /**
   * Self-healing: Identify and fix prediction blind spots
   */
  static async identifyBlindSpots(): Promise<any> {
    if (!supabase) return null;
    
    // Find patterns we consistently get wrong
    const { data: failures } = await supabase
      .from('pattern_outcomes')
      .select('emotional_sequence, predicted_action, actual_action')
      .eq('success', false)
      .limit(100);
    
    if (!failures) return null;
    
    // Group failures by pattern
    const blindSpots: Record<string, { 
      pattern: string[],
      wrongPredictions: string[],
      actualActions: string[],
      failureRate: number 
    }> = {};
    
    failures.forEach(f => {
      const key = f.emotional_sequence.join('_');
      if (!blindSpots[key]) {
        blindSpots[key] = {
          pattern: f.emotional_sequence,
          wrongPredictions: [],
          actualActions: [],
          failureRate: 0
        };
      }
      blindSpots[key].wrongPredictions.push(f.predicted_action);
      blindSpots[key].actualActions.push(f.actual_action);
    });
    
    // Calculate failure rates
    Object.values(blindSpots).forEach(spot => {
      spot.failureRate = spot.wrongPredictions.length / 
        (spot.wrongPredictions.length + spot.actualActions.length);
    });
    
    // Return top blind spots
    return Object.values(blindSpots)
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 10);
  }
}

// Background learning process
export async function startLearningLoop() {
  setInterval(async () => {
    try {
      // Evolve patterns every hour
      await EmotionalLearningEngine.evolvePatterns();
      
      // Identify blind spots every 6 hours
      if (new Date().getHours() % 6 === 0) {
        const blindSpots = await EmotionalLearningEngine.identifyBlindSpots();
        if (blindSpots && blindSpots.length > 0) {
          console.log('🔍 BLIND SPOTS DETECTED:', blindSpots);
        }
      }
      
      // Update data moat metrics
      const moatMetrics = await EmotionalLearningEngine.getDataMoatMetrics();
      if (moatMetrics) {
        console.log(`🏰 DATA MOAT: ${moatMetrics.unique_patterns.length} proprietary patterns, ` +
                   `Advantage Score: ${moatMetrics.competitive_advantage_score.toFixed(1)}, ` +
                   `Learning Velocity: ${moatMetrics.learning_velocity.toFixed(2)} patterns/day`);
      }
    } catch (error) {
      console.error('Learning loop error:', error);
    }
  }, 3600000); // Run every hour
}