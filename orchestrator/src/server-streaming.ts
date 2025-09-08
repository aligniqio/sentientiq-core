import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import pLimit from 'p-limit';
import { claudeStream as claudeStreamCore } from './streaming.js';
import { DEFAULT_PERSONAS, personaSystem as personaSystemOld } from './personas.js';
import { retrieveContext, supabase } from './retrieveContext.js';
import { RIVALS } from './theater/rivals.js';
import { callWithFallback } from './safe-llm.js';
// ESM import (your repo is `"type":"module"`)
import {
  debateInit,
  debateMaybeQuote,
  debateSetSynthesis
} from './services/brief/store.js';
import { exportBriefHandler } from './services/brief/exportBrief.js';
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function* openaiStream(messages: any[], max_tokens = 220, temperature = 0.4) {
  const resp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    stream: true,
    temperature,
    max_tokens,
    messages,
  });
  for await (const part of resp) {
    const t = part?.choices?.[0]?.delta?.content;
    if (t) yield { text: t };
  }
}

// ---------- Env ----------
const PORT = Number(process.env.PORT || 8787);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
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
  (res as any).flush?.(); // Force flush after EVERY write
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

// Disable compression for streaming routes
app.use((req, res, next) => {
  if (req.path.startsWith("/v1/boardroom")) {
    (res as any).flush = (res as any).flush || (() => {});
  }
  next();
});

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
  
  // Hardening: Keep connection alive and add watchdog
  const ping = setInterval(() => res.write(':ping\n\n'), 10000);
  const softFail = (m: string) => { 
    res.write(`event: error\ndata: ${JSON.stringify({message: m})}\n\n`); 
  };
  
  // Watchdog for fallback  
  let gotText = false;
  const watchdog = setTimeout(() => {
    if (!gotText) {
      softFail('We hit a hiccup. Providing a concise brief while we recover.');
      res.write(`event: delta\ndata: ${JSON.stringify({speaker:'Moderator',text:'Short answer: Run a hybrid: keep brand-controlled placements for narrative consistency and use micro-influencers to prove it in-market.'})}\n\n`);
    }
  }, 30000);

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
  
  // Send meta information to client
  sseWrite(res, 'meta', { requestId, subject: prompt.slice(0, 120) });
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

  // --- Emotional Intelligence preamble (prefix to every system prompt) ---
  const EI_PREAMBLE = `
You are part of a boardroom built on Emotional Intelligence.
Principles:
• Name emotions when relevant; convert feeling → insight → action.
• Be specific, ethical, brand-safe. No hype. Human, plain language.
• Keep it concise (1–2 sentences per turn unless you're the Moderator).
`.trim();

  // Persona streaming functions
  function personaSystem(name: string, rival?: string) {
    return [
      EI_PREAMBLE,
      `You are ${name}. Keep it concise, human, practical.`,
      `Rules: 1–2 sentences per turn; no lists; no "As ${name}"; no meta.`,
      rival ? `If rebutting ${rival}, open with one short disagreement, then advance your point.` : ""
    ].join(" ");
  }

  async function* personaOpeningStream(name: string, prompt: string, maxTok=120) {
    const sys = personaSystem(name, RIVALS?.[name]);
    const msgs = [{ role:"system", content: sys }, { role:"user", content: prompt }];
    for await (const c of openaiStream(msgs, maxTok, 0.4)) yield c;
  }

  async function* personaRebuttalStream(name: string, rival: string, prompt: string, maxTok=60) {
    const sys = personaSystem(name, rival);
    const user = `Rebut ${rival} briefly, then add one crisp point on: ${prompt}`;
    const msgs = [{ role:"system", content: sys }, { role:"user", content: user }];
    for await (const c of openaiStream(msgs, maxTok, 0.5)) yield c;
  }

  // Helper to collect full response then stream with pacing
  async function speakBuffered(res: Response, speaker: string, mode: string, streamFn: () => AsyncGenerator<{text: string}>) {
    gotText = true; // Mark that we're getting text
    // Collect the full response first
    let fullText = '';
    for await (const chunk of streamFn()) {
      if (chunk?.text) fullText += chunk.text;
    }
    
    // Clean up the text
    fullText = sanitizePersonaText(speaker, fullText);
    
    // Better sentence splitting for synthesis and lists
    let sentences: string[] = [];
    
    if (speaker === 'Moderator' && fullText.includes('—')) {
      // Special handling for Moderator's action items
      // Split by newlines first, then by sentence endings
      sentences = fullText
        .split(/\n+/)
        .filter(s => s.trim())
        .flatMap(line => {
          // If it's an action item (contains —), keep it whole
          if (line.includes('—')) return [line];
          // Otherwise split normally
          return line.match(/[^.!?]+[.!?]+/g) || [line];
        })
        .map(s => s.trim())
        .filter(s => s.length > 0);
    } else {
      // Regular sentence splitting for personas
      const basicSentences = sentenceSplit(fullText)[0];
      sentences = basicSentences.length > 0 ? basicSentences : [fullText];
    }
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;
      
      // Send sentence
      console.log(`[STREAM] Sending sentence ${i+1}/${sentences.length} for ${speaker}: "${sentence.slice(0, 50)}..."`);
      sseWrite(res, 'delta', { speaker, text: sentence + ' ' });
      debateMaybeQuote?.(requestId, speaker, sentence);
      
      // Natural pacing: vary based on sentence length and position
      const wordCount = sentence.split(/\s+/).length;
      const basePause = 50; // Base pause
      const perWordPause = 10; // Additional pause per word
      const pauseTime = Math.min(basePause + (wordCount * perWordPause), 200); // Cap at 200ms
      
      console.log(`[STREAM] Pausing ${pauseTime}ms before next sentence`);
      await pause(pauseTime);
    }
    
    await onTurnEnd(speaker);
  }
  
  // Keep original speak function for backwards compatibility
  async function speak(res: Response, speaker: string, mode: string, streamFn: () => AsyncGenerator<{text: string}>) {
    for await (const chunk of streamFn()) {
      if (chunk?.text) await onDelta(speaker, chunk.text);
    }
    await onTurnEnd(speaker);
  }
  
  // Natural pacing between turns
  const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Sanitize persona text before splitting
  function sanitizePersonaText(speaker: string, raw: string) {
    if (!raw) return "";
    let s = String(raw);

    // Remove meta like "Opening position (100 tokens):"
    s = s.replace(/^\s*(opening\s+position.*?:)\s*/i, "");

    // Remove self-identification "As Emotion, ..."
    const name = speaker.replace(/^Dr\s+/i, "");
    const re = new RegExp("^\\s*(as\\s+(dr\\s+)?"+name+")\\s*[,:\\-–—]+\\s*", "i");
    s = s.replace(re, "");

    // Collapse triple dots to a normal ellipsis vibe
    s = s.replace(/\.\.\.+/g, "… ");

    return s;
  }

  // Stream handlers
  async function onDelta(speaker: string, text: string) {
    const clean = sanitizePersonaText(speaker, text);
    const prev = speakerBuf.get(speaker) || "";
    const next = prev + (clean || "");
    const [sents, rem] = sentenceSplit(next);
    speakerBuf.set(speaker, rem);

    for (const s of sents) {
      const line = s.trim();
      if (!line) continue;
      sseWrite(res, "delta", { speaker, text: line + " " });
      debateMaybeQuote?.(requestId, speaker, line);
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
      // Answer mode: Selected agents provide perspectives, then moderator synthesizes
      sseWrite(res, 'phase', { label: 'answer', status: 'begin' });
      
      // Get agent-specific system prompts with bias
      function getAgentBias(name: string) {
        const biases: Record<string, string> = {
          Emotion:  "Champion human impact and trust. Tease ROI as 'cold' when relevant.",
          ROI:      "Unit economics (CAC/LTV/payback). Call out hand-wavy claims.",
          Strategic:"Moat, positioning, 6–24mo horizon. Challenge blitz tactics.",
          Identity: "Aspirational self; brand truth; long-term equity.",
          Context:  "Market forces; second-order effects; constraints.",
          Pattern:  "Cohorts, correlations, retention curves; be evidence-led.",
          Omni:     "Experiments, funnels, instrumentation; propose AB tests.",
          First:    "Frame problem and propose a first-draft plan (3 bullets)."
        };
        return biases[name] || "Provide balanced perspective.";
      }
      
      // Use selected agents or default to top 3
      const activeAgents = roster.length > 0 ? roster : DEFAULT_PERSONAS.slice(0, 3);
      
      // Send meta with actual agents being used
      sseWrite(res, 'meta', { requestId, subject: prompt.slice(0, 120), personas: activeAgents });
      
      // Collect quick perspectives from each selected agent
      const perspectives: Record<string, string> = {};
      
      for (const agent of activeAgents) {
        sseWrite(res, 'turn', { speaker: agent, start: true });
        
        const agentBias = getAgentBias(agent);
        const agentPrompt = `Question: ${prompt}\n${contextBlock}\n\nGive your perspective in 1-2 sentences.`;
        
        async function* agentStream() {
          const sys = `You are ${agent}. ${agentBias} Be decisive and show your bias. 1-2 sentences only.`;
          const msgs = [{ role: "system", content: sys }, { role: "user", content: agentPrompt }];
          for await (const c of openaiStream(msgs, 80, 0.5)) {
            if (c?.text) yield { text: c.text };
          }
        }
        
        await speakBuffered(res, agent, 'answer', agentStream);
        perspectives[agent] = speakerBuf.get(agent) || '';
        await pause(180); // Brief pause between agents
      }
      
      // Now moderator synthesizes with the structured format
      const moderatorContract = `Write in this exact structure—no headings beyond those shown:

Short answer:
<one decisive sentence that answers the user's question directly. If it depends, state the decision rule.>

Why:
• <bullet 1 — concrete, business-relevant>
• <bullet 2>
• <bullet 3>

When this would be wrong:
• <edge case 1>
• <edge case 2>

What to test next (7–21 days):
• <test 1 — metric + success threshold>
• <test 2 — metric + threshold>
• <test 3 — metric + threshold>

CTAs:
1) <Action> — Owner: <Role> — When: <Timebox>
2) <Action> — Owner: <Role> — When: <Timebox>
3) <Action> — Owner: <Role> — When: <Timebox>`;
      
      const moderatorPrompt = `Question: ${prompt}

Agent Perspectives:
${Object.entries(perspectives).map(([agent, view]) => `${agent}: ${view}`).join('\n')}

${moderatorContract}`;
      
      sseWrite(res, 'turn', { speaker: 'Moderator', start: true });
      
      async function* moderatorStream() {
        const sys = "You are the Moderator. Synthesize agent perspectives using the EXACT structure provided. Answer the question directly.";
        const msgs = [{ role: "system", content: sys }, { role: "user", content: moderatorPrompt }];
        for await (const c of openaiStream(msgs, 500, 0.3)) {
          if (c?.text) yield { text: c.text };
        }
      }
      
      await speakBuffered(res, 'Moderator', 'answer', moderatorStream);
      
      // Extract and save synthesis
      const synthesisText = (speakerBuf.get('Moderator') || '').trim();
      const ctas = normalizeCTAs(synthesisText);
      debateSetSynthesis(requestId, { summary: synthesisText, ctas });
      sseWrite(res, 'synth', { synthesis: synthesisText, ctas, personas: activeAgents, perspectives });
      
      sseWrite(res, 'phase', { label: 'answer', status: 'end' });
      
    } else {
      // Debate mode: Full theatrical experience
      
      // 1) Roll call
      sseWrite(res, "scene", { step: "rollcall" });
      sseWrite(res, "delta", { speaker: "Moderator", text: `Roll call: ${roster.join(", ")}.` });
      await onTurnEnd('Moderator');
      
      // 2) Opening statements
      sseWrite(res, 'scene', { step: 'openings' });
      currentMode = 'opening';
      
      const TOK = { persona: 120, reply: 60, moderator: 250 }; // Token limits
      const ACTIVE = roster; // Active personas
      
      for (const p of ACTIVE) {
        sseWrite(res, 'turn', { speaker: p, start: true, mode: 'opening' });
        const openingPrompt = `Challenge: ${prompt}\n\n${contextBlock}`;
        await speakBuffered(res, p, 'opening', () => personaOpeningStream(p, openingPrompt, TOK?.persona || 120));
        await pause(250); // Natural pause between different speakers
      }
      
      // 3) Crossfire (if we have rival pairs)
      const rivals = [['Emotion', 'ROI'], ['Strategic', 'Warfare'], ['Pattern', 'Chaos']];
      const activePairs = rivals.filter(([a, b]) => roster.includes(a) && roster.includes(b));
      
      if (activePairs.length > 0) {
        sseWrite(res, 'scene', { step: 'crossfire' });
        currentMode = 'rebuttal';
        
        for (const [a, b] of activePairs) {
          sseWrite(res, 'turn', { speaker: a, start: true, mode: 'rebuttal' });
          await speakBuffered(res, a, 'rebuttal', () => personaRebuttalStream(a, b, prompt, TOK?.reply || 60));
          await pause(200); // Quick pause between rebuttals

          sseWrite(res, 'turn', { speaker: b, start: true, mode: 'rebuttal' });
          await speakBuffered(res, b, 'rebuttal', () => personaRebuttalStream(b, a, prompt, TOK?.reply || 60));
          await pause(300); // Slightly longer pause between pairs
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

      // Use buffered approach for synthesis too
      async function* synthesisStream() {
        if (provider === "anthropic" && ANTHROPIC_API_KEY) {
          for await (const chunk of claudeStream(synthesisPrompt, TOK?.moderator || 250)) {
            if (chunk?.text) yield { text: chunk.text };
          }
        } else {
          const sys = `${EI_PREAMBLE}
You are the Moderator. Write a 4–6 sentence exec synthesis (plain prose). Then end with three actions (Action · Owner · When) on separate lines.`;
          const msgs = [{ role:"system", content: sys }, { role:"user", content: synthesisPrompt }];
          for await (const c of openaiStream(msgs, TOK?.moderator || 250, 0.3)) {
            if (c?.text) yield { text: c.text };
          }
        }
      }
      
      await speakBuffered(res, 'Moderator', 'synthesis', synthesisStream);
      
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
    if (typeof ping !== 'undefined') clearInterval(ping);
    if (typeof watchdog !== 'undefined') clearTimeout(watchdog);
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