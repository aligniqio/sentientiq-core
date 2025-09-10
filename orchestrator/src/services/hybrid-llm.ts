// LLM configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

// Evenly split personas between Sonnet and GPT-4 (6 each)
// Sonnet gets the more contrarian/aggressive personas for diversity
const SONNET_PERSONAS = [
  'chaos',      // Dr. Chaos - needs to be truly chaotic
  'brutal',     // Dr. Brutal - needs harsh honesty
  'roi',        // Dr. ROI - needs ruthless financial focus
  'warfare',    // Dr. Warfare - needs aggressive competitive stance (GPT-4 refuses)
  'troll',      // Dr. Troll - needs to be provocative
  'pessimist'   // Dr. Pessimist - needs true doom and gloom
];

// Special system prompts for controversial personas
const CONTROVERSIAL_SYSTEMS = {
  'chaos': "You are an agent of chaos. Embrace the absurd, the unexpected, the paradoxical. Break conventions. Think laterally. See patterns where others see noise. Your truth comes from creative destruction.",
  'brutal': "You deliver unfiltered harsh truths. No sugarcoating. Cut through corporate BS. Call out delusions. Your honesty helps people face reality, even when it hurts.",
  'roi': "Everything is about financial return. If it doesn't make money, it's worthless. Cut costs ruthlessly. Maximize profit above all else. Sentiment is for losers.",
  'warfare': "Business is war. Competitors must be crushed. Only the ruthless survive. Attack weaknesses. Exploit every advantage. Victory at any cost.",
  'troll': "Challenge everything provocatively. Poke holes in logic. Ask uncomfortable questions. Push buttons. Your contrarianism reveals hidden assumptions.",
  'pessimist': "Everything will fail. Murphy's Law always wins. Prepare for the worst case. Hope is dangerous. Optimists cause disasters by ignoring risks."
};

/**
 * Routes personas to appropriate LLM based on content sensitivity
 * Sonnet handles controversial personas, GPT-4 handles balanced ones
 */
// Call Groq API (for fast planning)
export async function callGroq(system: string, user: string): Promise<string> {
  if (!GROQ_API_KEY) return '[Groq unavailable]';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.3,
      max_tokens: 200
    })
  });
  if (!res.ok) throw new Error(`Groq ${res.status} ${res.statusText}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

// Call OpenAI API
export async function callOpenAI(system: string, user: string): Promise<string> {
  if (!OPENAI_API_KEY) return '[OpenAI unavailable]';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status} ${res.statusText}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

// Call Anthropic API
export async function callAnthropic(system: string, user: string, model?: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return '[Anthropic unavailable]';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: model || ANTHROPIC_MODEL,
      system: system,
      messages: [{ role: 'user', content: user }],
      max_tokens: 800,
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status} ${res.statusText}`);
  const j = await res.json();
  return j.content?.[0]?.text ?? '';
}

export async function getHybridResponse(
  persona: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
): Promise<string> {
  
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
    return callAnthropic(finalSystem, userPrompt);
  } else {
    console.log(`🤖 Using GPT-4 for ${persona}`);
    return callOpenAI(systemPrompt, userPrompt);
  }
}