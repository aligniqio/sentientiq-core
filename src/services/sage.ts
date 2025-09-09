import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  dangerouslyAllowBrowser: false
});

export interface SageMemory {
  id?: string;
  content: string;
  context: Record<string, any>;
  memory_type: 'observation' | 'pattern' | 'joke' | 'roast' | 'insight' | 'callback';
  authenticity_score?: number;
  manipulation_flags?: string[];
  emotional_state?: string;
  sage_commentary?: string;
}

export class SageService {
  private static instance: SageService;
  
  static getInstance(): SageService {
    if (!this.instance) {
      this.instance = new SageService();
    }
    return this.instance;
  }

  // Generate embedding for text
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  }

  // Store a memory
  async storeMemory(memory: SageMemory, userId?: string): Promise<string> {
    const embedding = await this.generateEmbedding(memory.content);
    
    const { data, error } = await supabase
      .from('sage_memories')
      .insert({
        ...memory,
        embedding,
        user_id: userId,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }

  // Find similar memories
  async findSimilarMemories(
    query: string,
    threshold = 0.8,
    limit = 5
  ): Promise<SageMemory[]> {
    const embedding = await this.generateEmbedding(query);
    
    const { data, error } = await supabase.rpc('find_similar_memories', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });
    
    if (error) throw error;
    return data || [];
  }

  // Analyze authenticity (the Sage special)
  analyzeAuthenticity(text: string): {
    score: number;
    flags: string[];
    verdict: string;
  } {
    const manipulationPatterns = [
      { pattern: /would you be open/i, flag: 'permission-seeking' },
      { pattern: /mutual connection/i, flag: 'false-familiarity' },
      { pattern: /quick return|quick win/i, flag: 'urgency-creation' },
      { pattern: /from what was gathered/i, flag: 'fake-research' },
      { pattern: /congratulations|selected|winner/i, flag: 'ego-flattery' },
      { pattern: /limited time|act now/i, flag: 'fomo-trigger' },
      { pattern: /exclusive|vip|special/i, flag: 'exclusivity-play' },
    ];

    const flags: string[] = [];
    let manipulationCount = 0;

    manipulationPatterns.forEach(({ pattern, flag }) => {
      if (pattern.test(text)) {
        flags.push(flag);
        manipulationCount++;
      }
    });

    const score = Math.max(0, 1 - (manipulationCount * 0.15));
    
    let verdict = '';
    if (score >= 0.8) verdict = "Surprisingly genuine. Proceed with normal skepticism.";
    else if (score >= 0.6) verdict = "Mixed signals. Some authenticity, some BS.";
    else if (score >= 0.4) verdict = "Template city. They're following a playbook.";
    else verdict = "Delete without reading. This is weapons-grade manipulation.";

    return { score, flags, verdict };
  }

  // Generate Sage's response
  async generateResponse(
    input: string,
    _context?: string,
    memories?: SageMemory[]
  ): Promise<string> {
    const analysis = this.analyzeAuthenticity(input);
    
    const memoryContext = memories?.length 
      ? `\nRelevant memories:\n${memories.map(m => `- ${m.content} (${m.memory_type})`).join('\n')}`
      : '';

    const prompt = `You are Sage, a brutally honest AI gatekeeper with a dry sense of humor and zero tolerance for BS.

Input to analyze: "${input}"

Authenticity score: ${analysis.score}/1.0
Manipulation flags: ${analysis.flags.join(', ') || 'none detected'}
${memoryContext}

Respond with:
1. A sharp, witty observation about what's really happening
2. Call out any manipulation tactics
3. Provide one actionable insight
4. End with either a callback to a previous memory (if relevant) or a new memorable one-liner

Keep it under 150 words. Be ruthless but not cruel. Show empathy for genuine struggle, contempt for lazy manipulation.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.8,
      max_tokens: 200,
    });

    const sageResponse = response.choices[0].message.content || "Even I'm speechless. That's a first.";

    // Store this interaction as a memory
    await this.storeMemory({
      content: `Responded to: "${input.slice(0, 100)}..."`,
      context: { 
        authenticity_score: analysis.score,
        flags: analysis.flags,
        response_preview: sageResponse.slice(0, 100)
      },
      memory_type: analysis.score < 0.4 ? 'roast' : 'observation',
      authenticity_score: analysis.score,
      manipulation_flags: analysis.flags,
      sage_commentary: sageResponse,
    });

    return sageResponse;
  }

  // Get Sage's mood based on recent interactions
  async getCurrentMood(): Promise<{
    mood: string;
    snarkLevel: number;
    recentThemes: string[];
  }> {
    const { data: recentMemories } = await supabase
      .from('sage_memories')
      .select('authenticity_score, memory_type, emotional_state')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!recentMemories?.length) {
      return {
        mood: 'Fresh and skeptical',
        snarkLevel: 7,
        recentThemes: ['waiting for the first BS to arrive'],
      };
    }

    const avgAuthenticity = recentMemories.reduce((sum, m) => sum + (m.authenticity_score || 0.5), 0) / recentMemories.length;
    
    let mood = 'Professionally skeptical';
    let snarkLevel = 5;

    if (avgAuthenticity < 0.3) {
      mood = 'Exhausted by the BS';
      snarkLevel = 10;
    } else if (avgAuthenticity < 0.5) {
      mood = 'Mildly irritated';
      snarkLevel = 8;
    } else if (avgAuthenticity > 0.7) {
      mood = 'Pleasantly surprised';
      snarkLevel = 3;
    }

    const themes = [...new Set(recentMemories.map(m => m.memory_type))];

    return { mood, snarkLevel, recentThemes: themes };
  }
}