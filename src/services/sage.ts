import { getSupabaseClient } from '../lib/supabase';
// import OpenAI from 'openai'; // Move to backend

const supabase = getSupabaseClient();

// OpenAI should be called through backend, not directly from browser
// const openai = new OpenAI({
//   apiKey: import.meta.env.VITE_OPENAI_API_KEY!,
//   dangerouslyAllowBrowser: true
// });

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
  async generateEmbedding(_text: string): Promise<number[]> {
    // TODO: Call through backend API
    // const response = await openai.embeddings.create({
    //   model: 'text-embedding-ada-002',
    //   input: text,
    // });
    // return response.data[0].embedding;
    
    // Placeholder for now
    return new Array(1536).fill(0);
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
    context?: string,
    memories?: SageMemory[]
  ): Promise<string> {
    try {
      // Call the backend Sage API
      const apiUrl = import.meta.env.DEV 
        ? '/api/sage/analyze'  // Use Vite proxy in dev
        : 'https://api.sentientiq.app/api/sage/analyze'; // Production API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          sender: 'user@sentientiq.ai',
          context: context || 'crystal_ball_consultation',
          memories: memories?.map(m => ({
            content: m.content,
            type: m.memory_type,
            authenticity: m.authenticity_score
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Sage API error');
      }

      const data = await response.json();
      
      // Store this interaction as a memory
      if (data.analysis) {
        const responseText = data.sage_says || data.response || data.verdict || '';
        await this.storeMemory({
          content: `Responded to: "${input.slice(0, 100)}..."`,
          context: { 
            authenticity_score: data.analysis.bullshit_score || data.analysis.authenticityScore || 0,
            flags: data.analysis.manipulation_tactics || data.analysis.manipulationFlags || [],
            response_preview: responseText.slice(0, 100)
          },
          memory_type: (data.analysis.bullshit_score || data.analysis.authenticityScore || 0) > 0.6 ? 'roast' : 'observation',
          authenticity_score: data.analysis.bullshit_score || data.analysis.authenticityScore || 0,
          manipulation_flags: data.analysis.manipulation_tactics || data.analysis.manipulationFlags || [],
          sage_commentary: responseText,
        });
      }

      return data.sage_says || data.response || data.verdict || "Even Sage is processing this one...";
    } catch (error) {
      console.error('Sage API error:', error);
      // Fallback to local analysis
      const analysis = this.analyzeAuthenticity(input);
      return analysis.verdict;
    }
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

    const avgAuthenticity = recentMemories.reduce((sum: number, m: any) => sum + (m.authenticity_score || 0.5), 0) / recentMemories.length;
    
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

    const themes = [...new Set(recentMemories.map((m: any) => m.memory_type))].filter(Boolean) as string[];

    return { mood, snarkLevel, recentThemes: themes };
  }
}