import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import pLimit from 'p-limit';
import { claudeStream } from './streaming.js';
import { DEFAULT_PERSONAS, personaSystem } from './personas.js';
import { retrieveContext, supabase } from './retrieveContext.js';

// ---------- Env ----------
const PORT = Number(process.env.PORT || 8787);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

const openaiPool = pLimit(Number(process.env.OPENAI_CONCURRENCY || 20));
const anthropicPool = pLimit(Number(process.env.ANTHROPIC_CONCURRENCY || 20));
const groqPool = pLimit(Number(process.env.GROQ_CONCURRENCY || 50));


// ---------- Helpers ----------
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
function sseWrite(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
function attachKeepAlive(res: Response) {
  const int = setInterval(() => res.write(': keep-alive\n\n'), 15000);
  res.on('close', () => clearInterval(int));
}

// Pack (clip) context to keep Claude happy
function packContext(snips: string[], maxChars = 6000) {
  const out: string[] = [];
  let len = 0;
  for (const raw of snips) {
    const s = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!s) continue;
    if (len + s.length + 4 > maxChars) break;
    out.push(s);
    len += s.length + 2;
  }
  return out;
}


// ---------- Non-streaming helpers (Groq/OpenAI/Claude) ----------
async function callGroq(system: string, user: string): Promise<string> {
  if (!GROQ_API_KEY) return '[planner unavailable]';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [
      { role: 'system', content: system }, { role: 'user', content: user }
    ], temperature: 0.3, max_tokens: 800 })
  });
  if (!res.ok) throw new Error(`Groq ${res.status} ${res.statusText}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}
async function callOpenAI(system: string, user: string): Promise<string> {
  if (!OPENAI_API_KEY) return '[primary unavailable]';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENAI_MODEL, messages: [
      { role: 'system', content: system }, { role: 'user', content: user }
    ], temperature: 0.4, max_tokens: 1200 })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status} ${res.statusText}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}
async function callAnthropicOnce(system: string, user: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return '[refiner unavailable]';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1200, temperature: 0.2, system, messages: [{ role: 'user', content: user }] })
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status} ${res.statusText}`);
  const j = await res.json();
  const parts = j.content || [];
  return Array.isArray(parts) ? parts.map((p: any) => p.text || '').join('') : '';
}

// ---------- Debate (existing 3-chain) ----------
const DebateBody = z.object({
  prompt: z.string().min(3),
  topK: z.number().int().min(0).max(20).optional().default(6),
  strategy: z.enum(['default','claude_primary']).optional().default('default')
});

const PLANNER_SYS = 'You are Planner. Output a short, numbered plan (max 6 bullets).';
const PRIMARY_SYS = 'You are the Primary Strategist. Use the plan and context to produce the best answer with evidence.';
const REFINER_SYS = 'You are the Refiner. Tighten, keep facts, output clear CTAs.';

async function runChain(prompt: string, topK: number, res: Response, strategy: 'default'|'claude_primary' = 'default', tenantId?: string) {
  sseWrite(res, 'start', { ok: true });

  // Retrieval (tenant-aware)
  sseWrite(res, 'phase', { label: 'retrieval', status: 'begin' });
  const snippets = await retrieveContext(prompt, topK, tenantId);
  sseWrite(res, 'phase', { label: 'retrieval', status: 'end', hits: snippets.length });

  const clipped = packContext(snippets);
  const contextBlock = clipped.length
    ? `Context (clipped):\n${clipped.map((s, i) => `(${i + 1}) ${s}`).join('\n\n')}`
    : 'Context: (none)';

  if (strategy === 'claude_primary') {
    // Planner: Groq (fast), Primary+Refine: Claude (one pass)
    sseWrite(res, 'phase', { label: 'planner', status: 'begin' });
    const planner = await groqPool(() =>
      callGroq(PLANNER_SYS, `User:\n${prompt}\n\n${contextBlock}`)
    ).catch(e => `[planner error] ${e}`);
    sseWrite(res, 'phase', { label: 'planner', status: 'end' });

    sseWrite(res, 'phase', { label: 'claude', status: 'begin' });
    let done = false;
    await anthropicPool(() => claudeStream({
      apiKey: ANTHROPIC_API_KEY,
      model: ANTHROPIC_MODEL,
      system: REFINER_SYS,
      user: `Follow this plan:\n${planner}\n\nUser:\n${prompt}\n\n${contextBlock}\n\nOutput: final answer with prioritized CTAs.`,
      onDelta: (txt) => sseWrite(res, 'delta', { label: 'Claude', text: txt }),
      onDone: () => { if (!done) { done = true; sseWrite(res, 'phase', { label: 'claude', status: 'end' }); } },
      onError: (err) => sseWrite(res, 'error', { label: 'Claude', message: String(err?.message || err) })
    }));
    sseWrite(res, 'done', { ok: true });
    return;
  }

  // Default 3-hop: Groq → OpenAI → Claude (non-streaming)
  sseWrite(res, 'phase', { label: 'planner', status: 'begin' });
  const planner = await groqPool(() =>
    callGroq(PLANNER_SYS, `User:\n${prompt}\n\n${contextBlock}`)
  ).catch(e => `[planner error] ${e}`);
  sseWrite(res, 'phase', { label: 'planner', status: 'end' });

  sseWrite(res, 'phase', { label: 'primary', status: 'begin' });
  const primary = await openaiPool(() =>
    callOpenAI(PRIMARY_SYS, `Plan:\n${planner}\n\nUser:\n${prompt}\n\n${contextBlock}`)
  ).catch(e => `[primary error] ${e}`);
  sseWrite(res, 'delta', { label: 'Primary', text: String(primary) });
  sseWrite(res, 'phase', { label: 'primary', status: 'end' });

  sseWrite(res, 'phase', { label: 'refiner', status: 'begin' });
  const refiner = await anthropicPool(() =>
    callAnthropicOnce(REFINER_SYS, `Improve the following answer. Keep it faithful.\n\n${primary}`)
  ).catch(e => `[refiner error] ${e}`);
  sseWrite(res, 'delta', { label: 'Refiner', text: String(refiner) });
  sseWrite(res, 'phase', { label: 'refiner', status: 'end' });

  sseWrite(res, 'done', { ok: true });
}

// ---------- Server ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// SSE endpoints
app.post('/v1/debate', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  attachKeepAlive(res);
  sseWrite(res, 'accepted', { t: Date.now() });

  const parsed = DebateBody.safeParse(req.body);
  if (!parsed.success) {
    sseWrite(res, 'error', { message: parsed.error.message });
    return res.end();
  }
  const { prompt, topK, strategy } = parsed.data;
  const tenantId = (req.headers['x-tenant-id'] || req.headers['x-user-id']) as string | undefined;

  try { await runChain(prompt, topK, res, strategy, tenantId); }
  catch (e: any) { sseWrite(res, 'error', { message: String(e?.message || e) }); }
  finally { res.end(); }
});

// NEW: Boardroom – parallel Claude personas with true streaming
const BoardroomBody = z.object({
  prompt: z.string().min(3).max(800),
  tenantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  personas: z.array(z.string()).optional(),
  topK: z.number().int().min(0).max(20).optional().default(3),
  temperature: z.number().min(0).max(1).optional().default(0.2),
  title: z.string().optional(),
  contextHint: z.string().optional(),
  idempotencyKey: z.string().optional()
});

app.post('/v1/boardroom', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  attachKeepAlive(res);
  sseWrite(res, 'accepted', { t: Date.now() });

  const parsed = BoardroomBody.safeParse(req.body);
  if (!parsed.success) {
    sseWrite(res, 'error', { message: parsed.error.message });
    return res.end();
  }

  const { prompt, personas, topK, temperature, tenantId: bodyTenantId, userId, title, contextHint, idempotencyKey } = parsed.data;
  // Prefer body tenantId, fallback to headers
  const tenantId = bodyTenantId || (req.headers['x-tenant-id'] || req.headers['x-user-id'] || 'anonymous') as string;
  
  sseWrite(res, 'start', { ok: true, personas: personas?.length || DEFAULT_PERSONAS.length });

  // Retrieval once, shared (tenant-aware with optional context hint)
  sseWrite(res, 'phase', { label: 'retrieval', status: 'begin' });
  const retrievalQuery = contextHint ? `${prompt} ${contextHint}` : prompt;
  const ctx = await retrieveContext(retrievalQuery, topK, tenantId);
  sseWrite(res, 'phase', { label: 'retrieval', status: 'end', hits: ctx.length });

  const clipped = packContext(ctx);
  const contextBlock = clipped.length
    ? `Use these snippets if helpful:\n${clipped.map((s, i) => `(${i + 1}) ${s}`).join('\n\n')}`
    : 'No external snippets were found. Proceed with best-practice reasoning.';

  const list = (!personas || personas.length === 0 ? DEFAULT_PERSONAS : personas).slice(0, 12);
  let finished = 0;
  const total = list.length;
  const responses: Record<string, string> = {};
  
  // Save debate to Supabase
  let debateId: string | null = null;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('debates')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          prompt,
          title: title || prompt.substring(0, 100),
          personas: list,
          status: 'in_progress',
          idempotency_key: idempotencyKey,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (!error && data) {
        debateId = data.id;
        sseWrite(res, 'meta', { debateId, tenantId, userId });
      }
    } catch (e) {
      console.error('Failed to save debate:', e);
    }
  }

  // Kick off streams (respect anthropicPool)
  await Promise.all(list.map(p =>
    anthropicPool(() => new Promise<void>((resolve) => {
      sseWrite(res, 'phase', { label: p, status: 'begin' });

      const sys = personaSystem(p);
      const user = `User brief:\n${prompt}\n\n${contextBlock}\n\nDeliver: a brief POV and 3 prioritized actions with explicit CTAs.`;

      claudeStream({
        apiKey: ANTHROPIC_API_KEY,
        model: ANTHROPIC_MODEL,
        system: sys,
        user,
        temperature,
        onDelta: (txt) => {
          sseWrite(res, 'delta', { label: p, text: txt });
          responses[p] = (responses[p] || '') + txt;
        },
        onDone: async () => {
          sseWrite(res, 'phase', { label: p, status: 'end' });
          finished += 1;
          
          if (finished === total) {
            // Conditional Moderator synthesis
            const shouldMerge = list.length > 1;
            if (shouldMerge) {
              sseWrite(res, 'phase', { label: 'Moderator', status: 'begin' });
              
              const mergeSystem = `You are the Moderator. Synthesize the panel's perspectives into a unified executive recommendation.`;
              const mergeUser = `The panel discussed: "${prompt}"

Here are their perspectives:
${Object.entries(responses).map(([k,v]) => `${k}:\n${v}`).join('\n\n')}

Synthesize: Key consensus points, divergent views, and final recommendation with 3 prioritized CTAs.`;
              
              await claudeStream({
                apiKey: ANTHROPIC_API_KEY,
                model: ANTHROPIC_MODEL,
                system: mergeSystem,
                user: mergeUser,
                temperature: 0.1,
                onDelta: (txt) => sseWrite(res, 'delta', { label: 'Moderator', text: txt }),
                onDone: async () => {
                  sseWrite(res, 'phase', { label: 'Moderator', status: 'end' });
                  
                  // Update debate status
                  if (supabase && debateId) {
                    await supabase
                      .from('debates')
                      .update({ 
                        status: 'completed',
                        responses,
                        completed_at: new Date().toISOString()
                      })
                      .eq('id', debateId);
                  }
                  
                  sseWrite(res, 'done', { ok: true });
                },
                onError: (err) => {
                  sseWrite(res, 'error', { label: 'Moderator', message: String(err?.message || err) });
                  sseWrite(res, 'done', { ok: true });
                }
              });
            } else {
              // Single persona, no merge needed
              if (supabase && debateId) {
                await supabase
                  .from('debates')
                  .update({ 
                    status: 'completed',
                    responses,
                    completed_at: new Date().toISOString()
                  })
                  .eq('id', debateId);
              }
              sseWrite(res, 'done', { ok: true });
            }
          }
          resolve();
        },
        onError: async (err) => {
          sseWrite(res, 'error', { label: p, message: String(err?.message || err) });
          // Fallback to a one-shot non-stream call so the panel isn't empty
          try {
            const once = await callAnthropicOnce(sys, user);
            sseWrite(res, 'delta', { label: p, text: once });
            responses[p] = once;
          } catch (e2) {
            sseWrite(res, 'error', { label: p, message: `fallback failed: ${String(e2)}` });
          }
          finished += 1;
          if (finished === total) {
            // Same conditional moderator logic for error path
            const shouldMerge = list.length > 1;
            if (shouldMerge && Object.keys(responses).length > 0) {
              // Run moderator synthesis if we have any responses
              sseWrite(res, 'phase', { label: 'Moderator', status: 'begin' });
              const mergeSystem = `You are the Moderator. Synthesize the panel's perspectives into a unified executive recommendation.`;
              const mergeUser = `The panel discussed: "${prompt}"

Here are their perspectives:
${Object.entries(responses).map(([k,v]) => `${k}:\n${v}`).join('\n\n')}

Synthesize: Key consensus points, divergent views, and final recommendation with 3 prioritized CTAs.`;
              
              try {
                const moderatorResponse = await callAnthropicOnce(mergeSystem, mergeUser);
                sseWrite(res, 'delta', { label: 'Moderator', text: moderatorResponse });
                sseWrite(res, 'phase', { label: 'Moderator', status: 'end' });
              } catch (modErr) {
                sseWrite(res, 'error', { label: 'Moderator', message: String(modErr) });
              }
            }
            
            if (supabase && debateId) {
              await supabase
                .from('debates')
                .update({ 
                  status: 'completed',
                  responses,
                  completed_at: new Date().toISOString()
                })
                .eq('id', debateId);
            }
            sseWrite(res, 'done', { ok: true });
          }
          resolve();
        }
      });
    }))
  ));

  res.end();
});

// Save debate brief to tenant
app.post('/v1/debate/save-brief', async (req: Request, res: Response) => {
  const { debateId, title, summary } = req.body;
  const tenantId = (req.headers['x-tenant-id'] || req.headers['x-user-id']) as string;
  
  if (!supabase) {
    return res.status(503).json({ error: 'Storage unavailable' });
  }
  
  if (!debateId || !tenantId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Save to recommendations table for tenant
    const { data, error } = await supabase
      .from('recommendations')
      .insert({
        tenant_id: tenantId,
        debate_id: debateId,
        title: title || 'Boardroom Debate',
        summary: summary || 'AI collective intelligence analysis',
        category: 'boardroom',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ ok: true, id: data.id });
  } catch (e: any) {
    console.error('Save brief error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`orchestrator listening on :${PORT}`));