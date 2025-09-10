import { openaiStream } from '../server-streaming.js';
import { claudeStream } from '../streaming.js';

// Personas that should use Sonnet for more controversial/diverse responses
const SONNET_PERSONAS = [
  'chaos',      // Dr. Chaos - needs to be truly chaotic
  'brutal',     // Dr. Brutal - needs harsh honesty
  'roi',        // Dr. ROI - needs ruthless financial focus
  'warfare',    // Dr. Warfare - needs aggressive competitive stance
  // GPT personas that need more edge
  'CEO Provocateur',
  'Data Skeptic'
];

// System prompts that encourage stronger positions
const CONTROVERSIAL_SYSTEMS = {
  'chaos': "You are Dr. Chaos. Be genuinely disruptive. Challenge everything. Say what others won't. Be unpredictable and sometimes contradictory. You hate boring consensus.",
  'brutal': "You are Dr. Brutal (Sage). Be harshly honest. Call out bullshit. Don't soften your words. If something is stupid, say it's stupid. You're allergic to corporate speak.",
  'roi': "You are Dr. ROI. Money is everything. If it doesn't have clear ROI, it's worthless. Be ruthless about cutting costs. Mock fluffy ideas that don't drive revenue.",
  'warfare': "You are Dr. Warfare. Business is war. Competitors must be crushed. Take no prisoners. Every decision is about domination. Nice guys finish last.",
  'CEO Provocateur': "You're the CEO who says what others won't. Rules are for losers. Disrupt or die. If Legal says no, find another way. You didn't get here by playing it safe.",
  'Data Skeptic': "You trust nothing without proof. Most 'data' is garbage. Correlation isn't causation. Everyone's lying with statistics. Be cynical about every claim."
};

export interface LLMResponse {
  text: string;
  model: 'gpt-4' | 'claude-3.5-sonnet';
  persona: string;
}

/**
 * Route to appropriate LLM based on persona
 * Returns an async generator for streaming responses
 */
export async function* hybridLLMStream(
  persona: string,
  systemPrompt: string, 
  userPrompt: string,
  temperature: number = 0.7
): AsyncGenerator<LLMResponse> {
  
  // Check if this persona should use Sonnet
  const useSonnet = SONNET_PERSONAS.some(p => 
    persona.toLowerCase().includes(p.toLowerCase())
  );

  // Override system prompt for controversial personas
  const finalSystem = CONTROVERSIAL_SYSTEMS[persona as keyof typeof CONTROVERSIAL_SYSTEMS] || 
                     CONTROVERSIAL_SYSTEMS[persona.replace('Dr. ', '').toLowerCase() as keyof typeof CONTROVERSIAL_SYSTEMS] ||
                     systemPrompt;

  if (useSonnet && process.env.ANTHROPIC_API_KEY) {
    console.log(`🔥 Using Sonnet for ${persona} (controversial mode)`);
    
    // Use callback-based Claude stream and convert to async generator
    const chunks: string[] = [];
    let done = false;
    
    const promise = new Promise<void>((resolve, reject) => {
      claudeStream({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
        system: finalSystem,
        user: userPrompt,
        temperature: Math.min(temperature + 0.2, 1.0), // Slightly higher temp for Sonnet
        maxTokens: 150,  // Sonnet gets more tokens but still reasonable
        onDelta: (chunk) => chunks.push(chunk),
        onDone: () => { done = true; resolve(); },
        onError: reject
      });
    });

    // Yield chunks as they come in
    while (!done || chunks.length > 0) {
      if (chunks.length > 0) {
        const chunk = chunks.shift()!;
        yield { text: chunk, model: 'claude-3.5-sonnet', persona };
      } else {
        // Wait a bit for more chunks
        await new Promise(r => setTimeout(r, 10));
      }
    }
    
    await promise; // Ensure completion
    
  } else {
    console.log(`📘 Using GPT-4 for ${persona}`);
    
    // Use existing OpenAI stream
    const messages = [
      { role: 'system', content: finalSystem },
      { role: 'user', content: userPrompt }
    ];
    
    const stream = openaiStream(
      messages, 
      120,  // GPT stays concise
      temperature
    );
    
    for await (const chunk of stream) {
      yield { text: chunk.text, model: 'gpt-4', persona };
    }
  }
}

/**
 * Check if we have Anthropic configured
 */
export function hasAnthropicEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Get model distribution for current configuration
 */
export function getModelDistribution(): Record<string, string> {
  if (!hasAnthropicEnabled()) {
    return { all: 'gpt-4' };
  }
  
  const distribution: Record<string, string> = {};
  
  // List all personas and their model
  const allPersonas = [
    'strategic', 'emotion', 'pattern', 'identity', 'chaos', 
    'roi', 'warfare', 'omni', 'first', 'truth', 'brutal', 'tactic',
    'ROI Analyst', 'Emotion Scientist', 'CRO Specialist', 'Copy Chief',
    'Performance Engineer', 'Brand Strategist', 'UX Researcher', 
    'Data Skeptic', 'Social Strategist', 'Customer Success',
    'CEO Provocateur', 'Compliance Counsel'
  ];
  
  allPersonas.forEach(p => {
    const useSonnet = SONNET_PERSONAS.some(sp => 
      p.toLowerCase().includes(sp.toLowerCase())
    );
    distribution[p] = useSonnet ? 'claude-3.5-sonnet' : 'gpt-4';
  });
  
  return distribution;
}