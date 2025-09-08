import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import pLimit from 'p-limit';
import { claudeStream as claudeStreamCore } from './streaming.js';
import { DEFAULT_PERSONAS, personaSystem } from './personas.js';
import { retrieveContext, supabase } from './retrieveContext.js';
// ESM import (your repo is `"type":"module"`)
import {
  debateInit,
  debateMaybeQuote,
  debateSetSynthesis
} from './services/brief/store.js';
import { exportBriefHandler } from './services/brief/exportBrief.js';

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

// Sentence splitting for quote capture
function sentenceSplit(buf: string): [string[], string] {
  const out: string[] = [];
  let i = 0, last = 0;
  while (i < buf.length) {
    const ch = buf[i];
    if (ch === '.' || ch === '!' || ch === '?') {
      // include trailing whitespace
      let j = i + 1;
      while (j < buf.length && /\s/.test(buf[j])) j++;
      out.push(buf.slice(last, j));
      last = j; i = j; continue;
    }
    i++;
  }
  return [out, buf.slice(last)];
}

// Normalize CTAs with intelligent inference
function normalizeCTAs(text: string) {
  const lines = (text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
  // grab likely action lines
  const candidates = lines.filter(l => /^(\d+\.|[-•])\s/.test(l)).slice(0, 6);

  function inferOwner(action: string) {
    const a = action.toLowerCase();
    if (/(pricing|tier|paywall|offer|campaign|copy|position)/.test(a)) return 'Marketing';
    if (/(gate|feature|integration|export|api|dashboard|limit)/.test(a)) return 'Product';
    if (/(ab test|experiment|funnel|cohort|correlate|ltv|regression)/.test(a)) return 'Data';
    if (/(stripe|plan|coupon|billing)/.test(a)) return 'RevOps';
    return 'Owner TBD';
  }
  function inferWhen(action: string) {
    const a = action.toLowerCase();
    if (/(quick|now|immediate|today)/.test(a)) return 'This week';
    if (/(2 weeks|fortnight|sprint)/.test(a)) return '2 weeks';
    if (/(month|30 days)/.test(a)) return '30 days';
    return '2–3 weeks';
  }

  const out = candidates.map(l => {
    let action = l.replace(/^(\d+\.|[-•])\s*/, '')
                  .replace(/\s*impact:\s*\d.*$/i, '')
                  .replace(/\s*effort:\s*\d.*$/i, '')
                  .replace(/\s*confidence:\s*\d.*$/i, '')
                  .trim();
    const ownerM = /owner:\s*([^|]+?)(?:\s{2,}|$)/i.exec(l);
    const whenM  = /when:\s*([^|]+?)(?:\s{2,}|$)/i.exec(l);
    const owner = ownerM ? ownerM[1].trim() : inferOwner(action);
    const when  = whenM ? whenM[1].trim() : inferWhen(action);
    return { action, owner, when };
  });

  // de-dup and pick top 3
  const seen = new Set<string>();
  const dedup = out.filter(c => {
    const k = c.action.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return dedup.slice(0, 3);
}

// Wrapper for claudeStream to work with async iteration
async function* claudeStream(prompt: string, maxTokens: number): AsyncGenerator<{ text?: string }> {
  if (!ANTHROPIC_API_KEY) return;
  
  const chunks: string[] = [];
  let error: any = null;
  let finished = false;
  
  claudeStreamCore({
    apiKey: ANTHROPIC_API_KEY,
    model: ANTHROPIC_MODEL,
    system: '',
    user: prompt,
    maxTokens,
    onDelta: (chunk) => chunks.push(chunk),
    onDone: () => { finished = true; },
    onError: (err) => { error = err; finished = true; }
  });
  
  // Poll for chunks
  while (!finished || chunks.length > 0) {
    if (chunks.length > 0) {
      yield { text: chunks.shift() };
    }
    if (error) throw error;
    await new Promise(r => setTimeout(r, 10));
  }
}

// ---------- Validation ----------
const DebateBody = z.object({
  prompt: z.string().min(3),
  personas: z.array(z.string()).optional(),
  topK: z.number().int().min(0).max(20).optional().default(3),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  mode: z.enum(['answer', 'debate']).optional().default('answer')
});

// ---------- PLAN CAPS ----------
const PLAN_CAP: Record<string, number> = { 
  free: 4, 
  starter: 4, 
  pro: 12, 
  team: 12, 
  enterprise: 12 
};
function capForPlan(plan?: string) { 
  return PLAN_CAP[(plan || 'free').toLowerCase()] ?? 4; 
}

// ---------- Tenant Plan Helper ----------
async function getTenantPlan(tenantId?: string): Promise<string> {
  if (!tenantId || !supabase) return 'free';
  const { data, error } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .maybeSingle();
  return (error || !data?.plan) ? 'free' : String(data.plan);
}

// ---------- Server ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Main boardroom handler with streaming
app.post('/v1/boardroom', async (req: Request, res: Response) => {
  // SSE headers
  const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('x-request-id', requestId);
  res.flushHeaders?.();
  attachKeepAlive(res);

  // Validate input
  const parsed = DebateBody.safeParse(req.body);
  if (!parsed.success) {
    sseWrite(res, 'error', { 
      code: 'BAD_BODY', 
      message: parsed.error.message,
      requestId 
    });
    return res.end();
  }

  const { prompt, topK, tenantId, personas, mode } = parsed.data;
  const debateId = `debate-${Date.now()}`;
  
  // Get tenant plan and enforce caps
  const plan = await getTenantPlan(tenantId);
  const personaCap = capForPlan(plan);
  
  // Pick personas
  const requested = Array.from(new Set(personas ?? []));
  const roster = (requested.length ? requested : DEFAULT_PERSONAS).slice(0, personaCap);
  
  // Detect provider
  const provider = process.env.PREFER_ANTHROPIC === 'false' ? 'openai' : 'anthropic';
  const model = provider === 'anthropic' ? ANTHROPIC_MODEL : OPENAI_MODEL;

  // Initialize debate state for brief capture
  debateInit(requestId, { 
    subject: req.body?.prompt || 'Collective Synthesis', 
    provider, 
    model 
  });
  
  // Emit meta event
  sseWrite(res, 'meta', { 
    requestId, 
    backend: 'orchestrator',
    mode, 
    plan, 
    personaCap, 
    roster,
    debateId,
    tenantId,
    provider,
    model
  });

  // Per-speaker buffer so we can push full sentences as they complete
  const speakerBuf = new Map<string, string>(); // speaker -> string
  let currentMode = 'opening'; // Track current mode for turn events

  // Stream handlers
  async function onDelta(speaker: string, text: string) {
    const prev = speakerBuf.get(speaker) || '';
    const next = prev + (text || '');
    const [sents, rem] = sentenceSplit(next);
    speakerBuf.set(speaker, rem);

    for (const s of sents) {
      const line = s.trim();
      if (!line) continue;
      // 1) send to UI
      sseWrite(res, 'delta', { speaker, text: line + ' ' });
      // 2) remember punchy lines for the brief
      debateMaybeQuote(requestId, speaker, line);
    }
  }

  async function onTurnEnd(speaker: string) {
    const rem = (speakerBuf.get(speaker) || '').trim();
    if (rem) {
      sseWrite(res, 'delta', { speaker, text: rem + ' ' });
      debateMaybeQuote(requestId, speaker, rem);
      speakerBuf.set(speaker, '');
    }
    sseWrite(res, 'turn', { speaker, end: true, mode: currentMode });
  }

  // Slow typing for demo/placeholder text to feel live
  async function slowSay(speaker: string, text: string, ms = 300) {
    for (const ch of text.split(/(?<=\S)\s+/)) {
      await onDelta(speaker, ch + ' ');
      await new Promise(r => setTimeout(r, ms));
    }
  }

  try {
    // Retrieval
    sseWrite(res, 'phase', { label: 'retrieval', status: 'begin' });
    const snippets = await retrieveContext(prompt, topK || 3);
    sseWrite(res, 'phase', { label: 'retrieval', status: 'end', hits: snippets.length });

    const contextBlock = packContext(snippets).length
      ? `Context:\n${packContext(snippets).map((s, i) => `(${i + 1}) ${s}`).join('\n\n')}`
      : 'Context: (none provided)';

    if (mode === 'answer') {
      // Answer mode: Moderator only
      sseWrite(res, 'phase', { label: 'moderator', status: 'begin' });
      
      const moderatorPrompt = `You are the Moderator. Synthesize the challenge into 3 decisive CTAs.
      
Format:
- [Action] — Owner: [Role] — When: [Timeframe]

Challenge: ${prompt}

${contextBlock}`;

      sseWrite(res, 'turn', { speaker: 'Moderator', start: true });
      
      if (ANTHROPIC_API_KEY && provider === 'anthropic') {
        for await (const chunk of claudeStream(moderatorPrompt, 400)) {
          if (chunk?.text) await onDelta('Moderator', chunk.text);
        }
      } else {
        // Fallback to OpenAI or mock
        const mockText = `Based on the analysis:\n\n1. Implement immediate solution — Owner: Engineering — When: 48 hours\n2. Monitor key metrics — Owner: Analytics — When: Daily\n3. Iterate based on data — Owner: Product — When: Weekly`;
        await onDelta('Moderator', mockText);
      }
      
      await onTurnEnd('Moderator');
      
      // Extract and save synthesis
      const synthesisText = (speakerBuf.get('Moderator') || '').trim();
      const ctas = normalizeCTAs(synthesisText);
      debateSetSynthesis(requestId, { summary: synthesisText, ctas });
      sseWrite(res, 'synth', { title: 'Collective Synthesis', bullets: ctas });
      
      // Sanity checks
      if (!synthesisText) {
        sseWrite(res, 'error', { code: 'NO_SYNTH', message: 'Synthesis missing' });
      }
      if (!ctas?.length) {
        sseWrite(res, 'warn', { code: 'NO_CTAS', message: 'No actionable CTAs parsed' });
      }
      
      sseWrite(res, 'phase', { label: 'moderator', status: 'end' });
      
    } else {
      // Debate mode: Full theatrical experience
      
      // 1) Roll call
      sseWrite(res, 'scene', { step: 'rollcall' });
      await onDelta('Moderator', `Roll call: ${roster.join(', ')}.`);
      await onTurnEnd('Moderator');
      
      // 2) Opening statements
      sseWrite(res, 'scene', { step: 'openings' });
      currentMode = 'opening';
      
      for (const persona of roster) {
        sseWrite(res, 'turn', { speaker: persona, start: true, mode: 'opening' });
        
        const openingPrompt = `${personaSystem(persona)}

Challenge: ${prompt}

${contextBlock}

Provide your opening position in 100 tokens or less. Be decisive and specific.`;

        if (ANTHROPIC_API_KEY && provider === 'anthropic') {
          for await (const chunk of claudeStream(openingPrompt, 120)) {
            if (chunk?.text) await onDelta(persona, chunk.text);
          }
        } else {
          // Mock response
          await onDelta(persona, `As ${persona}, I believe we should focus on practical solutions that deliver immediate value.`);
        }
        
        await onTurnEnd(persona);
        await sleep(100); // Pacing
      }
      
      // 3) Crossfire (if we have rival pairs)
      const rivals = [['Emotion', 'ROI'], ['Strategic', 'Warfare'], ['Pattern', 'Chaos']];
      const activePairs = rivals.filter(([a, b]) => roster.includes(a) && roster.includes(b));
      
      if (activePairs.length > 0) {
        sseWrite(res, 'scene', { step: 'crossfire' });
        currentMode = 'rebuttal';
        
        for (const [a, b] of activePairs) {
          // A rebuts B
          sseWrite(res, 'turn', { speaker: a, start: true, mode: 'rebuttal' });
          await slowSay(a, `I disagree with ${b}'s approach. We need to consider the human element here.`, 50);
          await onTurnEnd(a);
          
          // B rebuts A
          sseWrite(res, 'turn', { speaker: b, start: true, mode: 'rebuttal' });
          await slowSay(b, `While ${a} makes valid points, the data tells a different story.`, 50);
          await onTurnEnd(b);
        }
      }
      
      // 4) Synthesis
      sseWrite(res, 'scene', { step: 'synthesis' });
      currentMode = 'synthesis';
      sseWrite(res, 'turn', { speaker: 'Moderator', start: true, mode: 'synthesis' });
      
      const synthesisPrompt = `You are the Moderator. The board has debated: ${roster.join(', ')}.

Synthesize their positions into EXACTLY 3 action items:
- [Action] — Owner: [Role] — When: [Timeframe]

Challenge: ${prompt}

Be decisive. No hedging.`;

      if (ANTHROPIC_API_KEY && provider === 'anthropic') {
        for await (const chunk of claudeStream(synthesisPrompt, 300)) {
          if (chunk?.text) await onDelta('Moderator', chunk.text);
        }
      } else {
        const mockSynthesis = `After hearing all perspectives, here are the 3 critical actions:

1. Launch MVP experiment — Owner: Product — When: 2 weeks
2. Set up analytics pipeline — Owner: Engineering — When: 72 hours  
3. Run user interviews — Owner: Research — When: This week`;
        await onDelta('Moderator', mockSynthesis);
      }
      
      await onTurnEnd('Moderator');
      
      // Extract and save synthesis
      const synthesisText = (speakerBuf.get('Moderator') || '').trim();
      const ctas = normalizeCTAs(synthesisText);
      debateSetSynthesis(requestId, { summary: synthesisText, ctas });
      sseWrite(res, 'synth', { title: 'Collective Synthesis', bullets: ctas });
      
      // Sanity checks
      if (!synthesisText) {
        sseWrite(res, 'error', { code: 'NO_SYNTH', message: 'Synthesis missing' });
      }
      if (!ctas?.length) {
        sseWrite(res, 'warn', { code: 'NO_CTAS', message: 'No actionable CTAs parsed' });
      }
    }
    
    sseWrite(res, 'done', { ok: true });
    
  } catch (e: any) {
    sseWrite(res, 'error', { message: String(e?.message || e) });
  } finally {
    res.end();
  }
});

// Add export handler
app.post('/v1/debate/export', express.json(), exportBriefHandler);
app.post('/api/v1/debate/export', express.json(), exportBriefHandler);

// Debate endpoint (alias) - just forward to boardroom
app.post('/v1/debate', async (req: Request, res: Response) => {
  // Forward to boardroom handler
  req.url = '/v1/boardroom';
  return app._router.handle(req, res, () => {});
});

// --- Usage tracking (fast 204, accepts GET/POST/OPTIONS/etc) ---
const usageHandler = (req: Request, res: Response) => {
  try {
    const b = (req.body && Object.keys(req.body).length ? req.body : Object.fromEntries(new URLSearchParams(req.url.split('?')[1] || '')));
    const kind = b.kind || b.action || 'unknown';
    const page = b.page || b.pathname || '';
    const meta = b.meta || null;
    console.log(JSON.stringify({ t: Date.now(), event: 'usage/track', kind, page, meta }));
  } catch (_) { /* ignore */ }
  return res.status(204).end();
};

// accept all verbs + old paths
app.all('/v1/usage/track', usageHandler);
app.all('/api/usage/track', usageHandler);
app.all('/api/v1/usage/track', usageHandler);
app.all('/v1/track', usageHandler); // short version

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
    version: process.env.npm_package_version || '0.1.0',
    provider: process.env.PREFER_ANTHROPIC === 'false' ? 'openai' : 'anthropic'
  });
});

app.listen(PORT, () => {
  console.log(`orchestrator-streaming listening on :${PORT}`);
});