import { Response } from 'express';
import { THEATRICAL_PERSONAS, CROSSFIRE_PAIRS, ROLL_CALL } from './theatrical-personas.js';
import { callGroq, callOpenAI, callAnthropic, getHybridResponse } from './services/hybrid-llm.js';
import pLimit from 'p-limit';

// Token limits for each phase
export const TOK = {
  persona: 120,
  reply: 80,
  moderator: 400
};

// Concurrency pools
const groqPool = pLimit(Number(process.env.GROQ_CONCURRENCY || 50));
const openaiPool = pLimit(Number(process.env.OPENAI_CONCURRENCY || 20));
const anthropicPool = pLimit(Number(process.env.ANTHROPIC_CONCURRENCY || 20));

// SSE helper
export function sseWrite(res: Response, event: string, data: any) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// Pick active personas based on cap and demo mode
export function pickPersonas(cap: number, demoMode: boolean): string[] {
  let available = Object.keys(THEATRICAL_PERSONAS);
  
  // In non-demo mode, drop the most aggressive personas
  if (!demoMode) {
    available = available.filter(p => !['brutal', 'warfare', 'chaos'].includes(p));
  }
  
  // Take up to cap personas
  return available.slice(0, Math.min(cap, available.length));
}

// Get rival pairs for crossfire
export function rivalPairs(activePersonas: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  
  for (const [a, b] of CROSSFIRE_PAIRS) {
    if (activePersonas.includes(a) && activePersonas.includes(b)) {
      pairs.push([a, b]);
    }
  }
  
  return pairs;
}

// Speak wrapper - handles turn events and streaming
export async function speak(
  res: Response, 
  speaker: string, 
  generateFn: () => Promise<string>
): Promise<void> {
  // Signal turn start
  sseWrite(res, 'turn', { speaker, start: true });
  
  try {
    const text = await generateFn();
    
    // Stream the text in chunks
    const chunks = text.match(/.{1,60}\S*\s*/g) || [text];
    for (const chunk of chunks) {
      sseWrite(res, 'delta', { 
        speaker, 
        text: chunk,
        label: speaker 
      });
      // Small delay for dramatic effect
      await new Promise(r => setTimeout(r, 30));
    }
  } catch (e) {
    sseWrite(res, 'delta', { 
      speaker, 
      text: `[${speaker} unavailable]` 
    });
  }
  
  // Signal turn end
  sseWrite(res, 'turn', { speaker, end: true });
}

// Generate opening statement for a persona
export async function streamPersonaOpening(
  persona: string, 
  prompt: string, 
  maxTokens: number
): Promise<string> {
  const p = THEATRICAL_PERSONAS[persona.toLowerCase()];
  if (!p) return `[${persona} not found]`;
  
  const systemPrompt = p.prompt + `\n\nKeep opening statement under ${maxTokens} tokens.`;
  const userPrompt = `Challenge: ${prompt}\n\nProvide your opening position.`;
  
  // Rotate through models based on persona
  const modelIndex = ROLL_CALL.indexOf(persona.toLowerCase()) % 3;
  
  if (modelIndex === 0) {
    return groqPool(() => callGroq(systemPrompt, userPrompt));
  } else if (modelIndex === 1) {
    return openaiPool(() => callOpenAI(systemPrompt, userPrompt));
  } else {
    return anthropicPool(() => callAnthropic(systemPrompt, userPrompt));
  }
}

// Generate rebuttal between rivals
export async function streamPersonaRebuttal(
  speaker: string,
  rival: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const s = THEATRICAL_PERSONAS[speaker.toLowerCase()];
  const r = THEATRICAL_PERSONAS[rival.toLowerCase()];
  
  if (!s || !r) return `[persona error]`;
  
  const systemPrompt = s.prompt + 
    `\n\nYou are in crossfire with ${rival}. Disagree with them in ONE crisp sentence, then advance your point. Keep under ${maxTokens} tokens. Be witty, brief, respectful.`;
  
  const userPrompt = `Challenge: ${prompt}\n\n${rival} just spoke. Rebut and advance your position.`;
  
  // Same rotation logic
  const modelIndex = ROLL_CALL.indexOf(speaker.toLowerCase()) % 3;
  
  if (modelIndex === 0) {
    return groqPool(() => callGroq(systemPrompt, userPrompt));
  } else if (modelIndex === 1) {
    return openaiPool(() => callOpenAI(systemPrompt, userPrompt));
  } else {
    return anthropicPool(() => callAnthropic(systemPrompt, userPrompt));
  }
}

// Generate moderator synthesis
export async function streamSynthesis(
  activePersonas: string[],
  prompt: string,
  maxTokens: number
): Promise<string> {
  const systemPrompt = `You are the Moderator, exhausted but professional. The board of ${activePersonas.join(', ')} has debated.
  
Synthesize their positions into EXACTLY 3 action items. Format:
• [Action] · Owner: [Role] · When: [Timeframe]

Keep under ${maxTokens} tokens. Start with "*rubs temples*" if the debate was heated.`;

  const userPrompt = `Original challenge: ${prompt}\n\nProvide the executive synthesis.`;
  
  // Moderator always uses Anthropic for best synthesis
  return anthropicPool(() => callAnthropic(systemPrompt, userPrompt));
}

// Extract top CTAs from synthesis
export function takeTopCTAs(synthesisText: string, count: number): string[] {
  // Match bullet points
  const bullets = synthesisText.match(/^[•\-]\s*.+$/gm) || [];
  return bullets.slice(0, count).map(b => b.replace(/^[•\-]\s*/, ''));
}

// Global state for synthesis (you might want to handle this differently)
declare global {
  var synthesisState: string;
  var currentMode: string;
}

// Export the chain functions we need
export { callGroq, callOpenAI, callAnthropic } from './services/hybrid-llm.js';