/**
 * Pattern Recognition Engine
 * The brain that understands emotional sequences and triggers interventions
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface EmotionEvent {
  session_id: string;
  tenant_id: string;
  emotion: string;
  confidence: number;
  behavior: string;
  timestamp: string;
  metadata?: any;
}

interface Pattern {
  sequence: string[];
  threshold: number;
  intervention: string;
  cooldown: number;
}

// Start simple - these are our initial patterns
const PATTERNS: Pattern[] = [
  {
    sequence: ['frustration', 'frustration', 'frustration'],
    threshold: 70,
    intervention: 'help_offer',
    cooldown: 300000 // 5 minutes
  },
  {
    sequence: ['confusion', 'frustration'],
    threshold: 65,
    intervention: 'guidance',
    cooldown: 300000
  },
  {
    sequence: ['abandonment_risk'],
    threshold: 85,
    intervention: 'exit_intent',
    cooldown: 86400000 // 24 hours
  },
  {
    sequence: ['purchase_intent'],
    threshold: 70,
    intervention: 'price_assist',
    cooldown: 600000 // 10 minutes
  }
];

class PatternEngine {
  private sessionPatterns: Map<string, EmotionEvent[]> = new Map();
  private interventionHistory: Map<string, Map<string, number>> = new Map();

  /**
   * Process incoming emotion event
   */
  async processEmotion(event: EmotionEvent): Promise<string | null> {
    const sessionId = event.session_id;

    // Get or create session history
    if (!this.sessionPatterns.has(sessionId)) {
      this.sessionPatterns.set(sessionId, []);
    }

    const history = this.sessionPatterns.get(sessionId)!;
    history.push(event);

    // Keep only last 20 emotions per session
    if (history.length > 20) {
      history.shift();
    }

    // Check for pattern matches
    const intervention = this.checkPatterns(sessionId, history);

    if (intervention) {
      // Record intervention firing
      await this.recordIntervention(sessionId, event.tenant_id, intervention);
      return intervention;
    }

    return null;
  }

  /**
   * Check if current emotion sequence matches any patterns
   */
  private checkPatterns(sessionId: string, history: EmotionEvent[]): string | null {
    // Get intervention history for this session
    const sessionInterventions = this.interventionHistory.get(sessionId) || new Map();

    for (const pattern of PATTERNS) {
      // Check cooldown
      const lastFired = sessionInterventions.get(pattern.intervention) || 0;
      if (Date.now() - lastFired < pattern.cooldown) {
        continue; // Still in cooldown
      }

      // Check if pattern matches recent emotions
      if (this.matchesPattern(history, pattern)) {
        // Update intervention history
        if (!this.interventionHistory.has(sessionId)) {
          this.interventionHistory.set(sessionId, new Map());
        }
        this.interventionHistory.get(sessionId)!.set(pattern.intervention, Date.now());

        return pattern.intervention;
      }
    }

    return null;
  }

  /**
   * Check if emotion history matches a pattern
   */
  private matchesPattern(history: EmotionEvent[], pattern: Pattern): boolean {
    if (history.length < pattern.sequence.length) {
      return false;
    }

    // Get last N emotions where N is pattern length
    const recent = history.slice(-pattern.sequence.length);

    // Check if emotions match and meet confidence threshold
    for (let i = 0; i < pattern.sequence.length; i++) {
      if (recent[i].emotion !== pattern.sequence[i]) {
        return false;
      }
      if (recent[i].confidence < pattern.threshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record intervention in database
   */
  private async recordIntervention(sessionId: string, tenantId: string, intervention: string) {
    try {
      await supabase.from('intervention_events').insert({
        session_id: sessionId,
        tenant_id: tenantId,
        intervention_type: intervention,
        triggered_at: new Date().toISOString(),
        source: 'pattern_engine_v1'
      });
    } catch (error) {
      console.error('Failed to record intervention:', error);
    }
  }

  /**
   * Get statistics for pattern performance
   */
  async getPatternStats(tenantId: string, timeWindow: number = 86400000) {
    const since = new Date(Date.now() - timeWindow).toISOString();

    const { data: interventions } = await supabase
      .from('intervention_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('triggered_at', since);

    const { data: interactions } = await supabase
      .from('intervention_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('interacted', true)
      .gte('triggered_at', since);

    return {
      total_fired: interventions?.length || 0,
      total_interacted: interactions?.length || 0,
      success_rate: interventions?.length ?
        ((interactions?.length || 0) / interventions.length) : 0,
      by_type: this.groupByType(interventions || [])
    };
  }

  private groupByType(interventions: any[]) {
    const grouped: Record<string, number> = {};
    for (const intervention of interventions) {
      grouped[intervention.intervention_type] =
        (grouped[intervention.intervention_type] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Clean up old sessions (run periodically)
   */
  cleanup() {
    const oneHourAgo = Date.now() - 3600000;

    for (const [sessionId, history] of this.sessionPatterns.entries()) {
      const lastEvent = history[history.length - 1];
      if (lastEvent && new Date(lastEvent.timestamp).getTime() < oneHourAgo) {
        this.sessionPatterns.delete(sessionId);
        this.interventionHistory.delete(sessionId);
      }
    }
  }
}

// Export singleton instance
export const patternEngine = new PatternEngine();

// Clean up old sessions every 10 minutes
setInterval(() => {
  patternEngine.cleanup();
}, 600000);