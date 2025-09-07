import pLimit from 'p-limit';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------- Env ----------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

const openaiPool = pLimit(Number(process.env.OPENAI_CONCURRENCY || 20));
const anthropicPool = pLimit(Number(process.env.ANTHROPIC_CONCURRENCY || 20));
const groqPool = pLimit(Number(process.env.GROQ_CONCURRENCY || 50));

const supabase: SupabaseClient | null =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// ---------- Helpers ----------
export function sseWrite(res: any, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function chunkStream(res: any, event: string, label: string, text: string, size = 600) {
  for (let i = 0; i < text.length; i += size) {
    sseWrite(res, 'delta', { label, text: text.slice(i, i + size) });
  }
}

// ---------- Retrieval (pgvector via Supabase RPC or fallback) ----------
async function retrieveContext(query: string, topK = 6): Promise<string[]> {
  if (!supabase) return [];
  try {
    // Preferred: create RPC in your DB: match_documents(query_text text, match_count int)
    const { data, error } = await supabase.rpc('match_documents', {
      query_text: query,
      match_count: topK
    });
    if (error || !Array.isArray(data)) return [];
    return data.map((r: any) => r.content || r.text || '').filter(Boolean);
  } catch {
    return [];
  }
}

// ---------- Providers (simple non-streaming, we stream ourselves) ----------
async function callGroq(system: string, user: string): Promise<string> {
  if (!GROQ_API_KEY) return '[planner unavailable]';
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

async function callOpenAI(system: string, user: string): Promise<string> {
  if (!OPENAI_API_KEY) return '[primary unavailable]';
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
      temperature: 0.4,
      max_tokens: 400
    })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status} ${res.statusText}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(system: string, user: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return '[refiner unavailable]';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status} ${res.statusText}`);
  const j = await res.json();
  const parts = j.content || [];
  const txt = Array.isArray(parts) ? parts.map((p: any) => p.text || '').join('') : '';
  return txt;
}

// ---------- Chain logic ----------
const PLANNER_SYS = `You are Planner. Produce a precise plan for addressing the user's challenge.

DO NOT:
- Recommend freemium now (Q3 consideration only)
- Extend trial globally (JIT extensions for high-potential only)
- Reduce price globally without ARPU floor and guardrails

RULES:
- Output EXACTLY 6 numbered points, each under 20 words
- Identify key constraints and metrics from the input
- Choose specific personas or approaches (no generic advice)
- State what NOT to do (forbidden paths)
- Maximum 200 tokens total

FORMAT:
1. [Core constraint/metric]
2. [Primary lever to pull]
3. [Secondary lever]
4. [What to measure]
5. [What to avoid]
6. [Success criteria]`;

const PRIMARY_SYS = `You are the Primary Strategist. Execute the plan with specific recommendations.

RULES:
- Follow the Planner's 6-point structure exactly
- Quantify everything (percentages, days, dollar amounts)
- No hedging ("might", "could", "perhaps") - be decisive
- Reference provided context with specific evidence
- Maximum 400 tokens total
- Output as structured bullets under clear headers`;

const MODERATOR_SYS = `You are the Moderator. Deliver ONE decisive plan that respects business constraints.

DO NOT:
- Recommend freemium now (Q3 consideration only)
- Extend trial globally (JIT extensions for high-potential only)
- Reduce price globally without ARPU floor and guardrails

Rules:
- Resolve conflicts; pick ONE path where needed
- Quantify targets and guardrails. Tie actions to KPI deltas and emotional shifts
- No repetition. Remove duplicate bullets
- Maximum 400 tokens total

Format (mandatory):
## 14-Day Moves
- [Action]: [specific implementation] — Owner: [role] — ETA: [days] — KPI: [metric target] — Emotion: [delta]
(3 bullets max, each with all fields)

## 30-60 Day Moves
- [Action with brief description]
(3 bullets max)

## Metrics & Guardrails
- Primary: free→paid [current]% → [target]% by Day [X]
- ARPU floor: ≥ [X]% baseline; Refund ≤ +[X] pts; 30-day churn ≤ baseline
- Stop: if [metric] < [threshold] after [days], revert [change]

## Experiment Table
| Hypothesis | Variant | KPI | MDE | Sample | Duration |
(3 rows minimum)`;

export async function runChain(prompt: string, topK: number, res?: any) {
  if (res) sseWrite(res, 'start', { ok: true });

  // Retrieval
  if (res) sseWrite(res, 'phase', { label: 'retrieval', status: 'begin' });
  const snippets = await retrieveContext(prompt, topK);
  if (res) sseWrite(res, 'phase', { label: 'retrieval', status: 'end', hits: snippets.length });

  const contextBlock = snippets.length
    ? `Context:\n${snippets.map((s, i) => `(${i + 1}) ${s}`).join('\n\n')}`
    : 'Context: (none provided)';

  // 1) Planner (Groq) - Creates structured plan
  if (res) sseWrite(res, 'phase', { label: 'planner', status: 'begin' });
  const planner = await groqPool(() =>
    callGroq(PLANNER_SYS, `User Request:\n${prompt}\n\n${contextBlock}`)
  ).catch(e => `[planner error] ${e}`);
  if (res) chunkStream(res, 'delta', 'Planner', String(planner));
  if (res) sseWrite(res, 'phase', { label: 'planner', status: 'end' });

  // 2) Primary (OpenAI) - Executes plan with specifics
  if (res) sseWrite(res, 'phase', { label: 'primary', status: 'begin' });
  const primary = await openaiPool(() =>
    callOpenAI(PRIMARY_SYS, `Plan from Planner:\n${planner}\n\nOriginal Request:\n${prompt}\n\n${contextBlock}`)
  ).catch(e => `[primary error] ${e}`);
  if (res) chunkStream(res, 'delta', 'Primary', String(primary));
  if (res) sseWrite(res, 'phase', { label: 'primary', status: 'end' });

  // 3) Moderator (Anthropic) - Delivers decisive final plan
  if (res) sseWrite(res, 'phase', { label: 'moderator', status: 'begin' });
  const moderator = await anthropicPool(() =>
    callAnthropic(MODERATOR_SYS, `Planner's Structure:\n${planner}\n\nPrimary's Recommendations:\n${primary}\n\nOriginal Challenge:\n${prompt}`)
  ).catch(e => `[moderator error] ${e}`);
  if (res) chunkStream(res, 'delta', 'Moderator', String(moderator));
  if (res) sseWrite(res, 'phase', { label: 'moderator', status: 'end' });

  if (res) sseWrite(res, 'done', { ok: true });
  
  return { planner, primary, moderator };
}