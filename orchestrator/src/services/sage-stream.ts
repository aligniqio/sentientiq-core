import { createClient } from 'redis';
import OpenAI from 'openai';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

// Sage's real-time debate commentary system
export class SageDebateWatcher extends EventEmitter {
  private redis: any;
  private openai: OpenAI;
  private supabase: any;
  private debateBuffer: Map<string, string[]> = new Map();
  private lastCommentary: Map<string, number> = new Map();
  private COMMENTARY_COOLDOWN = 30000; // 30 seconds between comments

  constructor() {
    super();
    
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });

    this.supabase = createSupabase(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.setupRedisListeners();
  }

  async connect() {
    await this.redis.connect();
    console.log('🔮 Sage is watching the debate streams...');
  }

  private setupRedisListeners() {
    // Subscribe to debate channels
    this.redis.subscribe('debate:*', (message: string, channel: string) => {
      this.handleDebateMessage(channel, message);
    });

    // Subscribe to specific triggers that Sage should respond to
    this.redis.subscribe('sage:trigger', (message: string) => {
      this.generateImmediateCommentary(message);
    });
  }

  private async handleDebateMessage(channel: string, message: string) {
    try {
      const data = JSON.parse(message);
      const debateId = channel.split(':')[1];
      
      // Buffer debate content
      if (!this.debateBuffer.has(debateId)) {
        this.debateBuffer.set(debateId, []);
      }
      
      const buffer = this.debateBuffer.get(debateId)!;
      buffer.push(data.content || data.message || '');
      
      // Keep buffer size manageable (last 10 messages)
      if (buffer.length > 10) {
        buffer.shift();
      }

      // Check if Sage should comment
      if (this.shouldComment(debateId, data)) {
        await this.generateCommentary(debateId, buffer.join('\n'));
      }
    } catch (error) {
      console.error('Sage error processing debate:', error);
    }
  }

  private shouldComment(debateId: string, data: any): boolean {
    // Check cooldown
    const lastTime = this.lastCommentary.get(debateId) || 0;
    if (Date.now() - lastTime < this.COMMENTARY_COOLDOWN) {
      return false;
    }

    // Sage triggers on specific patterns
    const triggers = [
      'breakthrough',
      'consensus',
      'disagreement',
      'conclusion',
      'key insight',
      'contradiction',
      'bullshit', // Sage's favorite
      'actually', // Sage hates this word
      'synergy', // Corporate BS detector
      'leverage', // More corporate BS
      'circle back' // Peak corporate BS
    ];

    const content = (data.content || data.message || '').toLowerCase();
    return triggers.some(trigger => content.includes(trigger));
  }

  private async generateCommentary(debateId: string, context: string) {
    try {
      // Get Sage's current mood
      const mood = await this.getSageMood();
      
      // Find relevant memories
      const memories = await this.findRelevantMemories(context);
      
      // Generate embedding for context
      const embedding = await this.generateEmbedding(context);
      
      // Analyze authenticity
      const analysis = this.analyzeDebateAuthenticity(context);
      
      // Generate Sage's commentary
      const prompt = `You are Sage, watching a debate between PhDs. Your current mood: ${mood.mood} (snark level ${mood.snarkLevel}/10).

Debate context:
"${context.slice(-500)}"

Authenticity analysis: ${analysis.verdict} (${analysis.score}/1.0)
Manipulation flags: ${analysis.flags.join(', ') || 'none'}

${memories.length > 0 ? `Relevant memories:\n${memories.map(m => `- ${m.content}`).join('\n')}` : ''}

Provide a sharp, witty observation about what's really happening in this debate. Call out any BS, acknowledge genuine insights, or mock the corporate speak. Keep it under 100 words. Be Sage.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.8,
        max_tokens: 150
      });

      const commentary = response.choices[0].message.content || "Even I need a moment to process this level of discourse.";

      // Store as memory
      await this.storeMemory({
        content: `Debate commentary: "${commentary.slice(0, 100)}..."`,
        context: { 
          debate_id: debateId,
          authenticity: analysis.score,
          mood: mood.mood
        },
        memory_type: analysis.score < 0.5 ? 'roast' : 'observation',
        authenticity_score: analysis.score,
        manipulation_flags: analysis.flags,
        sage_commentary: commentary
      });

      // Emit commentary for UI
      this.emit('commentary', {
        debateId,
        commentary,
        authenticity: analysis,
        mood: mood.mood,
        timestamp: new Date()
      });

      // Publish to Redis for other services
      await this.redis.publish(`sage:commentary:${debateId}`, JSON.stringify({
        commentary,
        authenticity: analysis.score,
        mood: mood.mood
      }));

      this.lastCommentary.set(debateId, Date.now());
      
    } catch (error) {
      console.error('Sage commentary generation failed:', error);
    }
  }

  private async generateImmediateCommentary(trigger: string) {
    // For special triggers that demand immediate Sage attention
    const data = JSON.parse(trigger);
    await this.generateCommentary(data.debateId, data.context);
  }

  private analyzeDebateAuthenticity(text: string): {
    score: number;
    flags: string[];
    verdict: string;
  } {
    const corporateBSPatterns = [
      { pattern: /synergy/i, flag: 'synergy-alert' },
      { pattern: /leverage/i, flag: 'leverage-warning' },
      { pattern: /circle back/i, flag: 'circle-back-detected' },
      { pattern: /low-hanging fruit/i, flag: 'fruit-picking' },
      { pattern: /move the needle/i, flag: 'needle-moving' },
      { pattern: /paradigm shift/i, flag: 'paradigm-shifting' },
      { pattern: /think outside the box/i, flag: 'box-thinking' },
      { pattern: /at the end of the day/i, flag: 'day-ending' }
    ];

    const flags: string[] = [];
    let bsCount = 0;

    corporateBSPatterns.forEach(({ pattern, flag }) => {
      if (pattern.test(text)) {
        flags.push(flag);
        bsCount++;
      }
    });

    const score = Math.max(0, 1 - (bsCount * 0.12));
    
    let verdict = '';
    if (score >= 0.8) verdict = "Surprisingly coherent. The PhDs are earning their keep.";
    else if (score >= 0.6) verdict = "Mixed bag. Some insight, some theater.";
    else if (score >= 0.4) verdict = "The consultants have entered the chat.";
    else verdict = "This is what happens when MBAs cosplay as PhDs.";

    return { score, flags, verdict };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.slice(0, 8000) // Limit for embedding
    });
    return response.data[0].embedding;
  }

  private async findRelevantMemories(context: string): Promise<any[]> {
    try {
      const embedding = await this.generateEmbedding(context);
      
      const { data } = await this.supabase.rpc('find_similar_memories', {
        query_embedding: embedding,
        match_threshold: 0.75,
        match_count: 3
      });
      
      return data || [];
    } catch (error) {
      console.error('Memory search failed:', error);
      return [];
    }
  }

  private async storeMemory(memory: any) {
    try {
      const embedding = await this.generateEmbedding(memory.content);
      
      await this.supabase
        .from('sage_memories')
        .insert({
          ...memory,
          embedding
        });
    } catch (error) {
      console.error('Memory storage failed:', error);
    }
  }

  private async getSageMood(): Promise<{
    mood: string;
    snarkLevel: number;
  }> {
    // Check recent interactions to determine mood
    const { data: recentMemories } = await this.supabase
      .from('sage_memories')
      .select('authenticity_score')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentMemories?.length) {
      return { mood: 'Fresh and skeptical', snarkLevel: 7 };
    }

    const avgAuthenticity = recentMemories.reduce((sum: number, m: any) => 
      sum + (m.authenticity_score || 0.5), 0) / recentMemories.length;
    
    if (avgAuthenticity < 0.3) {
      return { mood: 'Drowning in BS', snarkLevel: 10 };
    } else if (avgAuthenticity < 0.5) {
      return { mood: 'Mildly irritated', snarkLevel: 8 };
    } else if (avgAuthenticity > 0.7) {
      return { mood: 'Pleasantly surprised', snarkLevel: 4 };
    }
    
    return { mood: 'Professionally skeptical', snarkLevel: 6 };
  }

  async disconnect() {
    await this.redis.disconnect();
  }
}

// Export singleton instance
export const sageWatcher = new SageDebateWatcher();