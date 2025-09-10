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
import { hybridLLMStream, getModelDistribution } from './services/hybrid-llm.js';
import { DebateStateMachine, getOrCreateDebateState, clearDebateState } from './debate-state.js';
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

// Sage Integration - The Crystal Palace of Marketing Truth
import { sageWatcher } from './services/sage-stream.js';
import { setupSageRoutes } from './api/sage-endpoint.js';
import { createClient } from 'redis';

// Redis client for Sage communication
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect()
  .then(() => console.log('📡 Redis connected for Sage'))
  .catch(err => console.error('📡 Redis connection failed:', err));

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
const PORT = Number(process.env.STREAMING_PORT || 8788);

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
function sseWrite(res: Response, event: string, data: any, debateId?: string) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  (res as any).flush?.(); // Force flush after EVERY write
  
  // Publish debate messages to Redis for Sage
  if (debateId && (event === 'message' || event === 'synthesis' || event === 'conclusion')) {
    redisClient.publish(`debate:${debateId}`, JSON.stringify({
      event,
      ...data,
      timestamp: new Date().toISOString()
    })).catch(err => console.error('Redis publish failed:', err));
  }
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
  
  console.log(`[TENANT] Received tenantId: ${tenantId}`);
  
  // Send meta information to client
  sseWrite(res, 'meta', { requestId, subject: prompt.slice(0, 120) });
  const debateId = `debate-${Date.now()}`;
  
  // Get tenant plan and enforce caps
  const plan = await getTenantPlan(tenantId);
  console.log(`[TENANT] Plan from DB: ${plan}`);
  
  // Override for Matt's tenant during development
  const effectivePlan = tenantId === '7a6c61c4-95e4-4b15-94b8-02995f81c291' ? 'enterprise' : plan;
  console.log(`[TENANT] Effective plan: ${effectivePlan} (override: ${tenantId === '7a6c61c4-95e4-4b15-94b8-02995f81c291'})`);
  
  const personaCap = capForPlan(effectivePlan);
  console.log(`[TENANT] Persona cap: ${personaCap}`);
  
  // Pick personas - personaCap is a MAXIMUM, not a default
  const requested = Array.from(new Set(personas ?? []));
  
  // In debate mode, don't default to any personas if none selected
  const roster = requested.length > 0 
    ? requested.slice(0, personaCap)  // Use what they selected, up to the cap
    : (mode === 'debate' ? [] : DEFAULT_PERSONAS.slice(0, personaCap));   // Default to cap in answer mode
    
  console.log(`[PERSONAS] Requested: ${requested.length} personas:`, requested);
  console.log(`[PERSONAS] Roster (cap=${personaCap}, actual=${roster.length}):`, roster);
  
  // For debate mode with no personas, send an error
  if (mode === 'debate' && roster.length === 0) {
    sseWrite(res, 'error', { 
      code: 'NO_FIGHTERS',
      message: 'You came to the fight with no fighters? Choose at least 2 personas for a debate!'
    });
    sseWrite(res, 'done', { ok: false });
    return res.end();
  }
  
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
    // Use the same aggressive biases as answer mode
    const agentBias = getAgentBias(name);
    const sys = `${EI_PREAMBLE} You are ${name}. ${agentBias} Be direct and contrarian. Challenge conventional wisdom. ${RIVALS?.[name] ? `Your rival ${RIVALS[name]} is watching.` : ''} 1-2 sharp sentences. No "I feel" or hedging. Take a strong stance. NEVER use em-dashes (—). Use commas, periods, or simple hyphens instead.`;
    
    // Use hybrid LLM system for diverse responses
    const stream = hybridLLMStream(name, sys, prompt, 0.6); // Higher temp for spicier takes
    for await (const chunk of stream) {
      yield { text: chunk.text };
    }
  }

  async function* personaRebuttalStream(name: string, rival: string, prompt: string, maxTok=60) {
    const agentBias = getAgentBias(name);
    const sys = `${EI_PREAMBLE} You are ${name}. ${agentBias} In ONE sentence, rebut ${rival} (witty, respectful), then add ONE new point tied to: "${prompt}". Be sharp but professional. NEVER use em-dashes (—).`;
    const user = `Rebut ${rival} and make your point about: ${prompt}`;
    
    // Use hybrid LLM - rebuttals should be spicier
    const stream = hybridLLMStream(name, sys, user, 0.8); // Even higher temp for conflict
    for await (const chunk of stream) {
      yield { text: chunk.text };
    }
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
    
    if (speaker === 'Moderator' && fullText.includes(' - ')) {
      // Special handling for Moderator's action items
      // Split by newlines first, then by sentence endings
      sentences = fullText
        .split(/\n+/)
        .filter(s => s.trim())
        .flatMap(line => {
          // If it's an action item (contains dash), keep it whole
          if (line.includes(' - ')) return [line];
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
      const displaySpeaker = (speaker === 'Moderator' || speaker === 'Synthesis') ? speaker : `Dr. ${speaker}`;
      sseWrite(res, 'delta', { speaker: displaySpeaker, text: sentence + ' ' });
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

  // Get agent-specific system prompts based on their professional DNA
  function getAgentBias(name: string) {
    // Each persona's worldview shaped by their career experiences
    const biases: Record<string, string> = {
      'ROI Analyst': "Ex-McKinsey. Emotion Scientist's touchy-feely BS bankrupts companies. Money talks, feelings walk.",
      'Emotion Scientist': "Stanford PhD. ROI Analyst's spreadsheet addiction misses why humans actually buy. Feelings drive wallets.",
      'CRO Specialist': "Built Booking.com's test framework. Brand Strategist's 'authenticity' doesn't convert. Test or guess.",
      'Copy Chief': "Mad Men era survivor. UX Researcher's interviews miss the point. Great copy creates need, not just meets it.",
      'Performance Engineer': "Ex-Google. CEO's 'move fast' breaks everything. Milliseconds matter more than moonshots.",
      'Brand Strategist': "Helped Nike through sweatshop crisis. CRO's A/B obsession commoditizes soul. Brand equity compounds.",
      'UX Researcher': "Ethnographer turned tech. Copy Chief writes fiction. I watch reality. Users don't read your clever words.",
      'Data Skeptic': "Former Theranos whistleblower. CEO Provocateur's 'vision' is usually fraud. Show me the real data.",
      'Social Strategist': "Managed United's Twitter during THAT incident. Internet never forgets. Perception IS reality.",
      'Customer Success': "20 years in SaaS. Confusion kills retention. Happy customers don't read fine print.",
      'CEO Provocateur': "Three unicorns, two failures. Convention is competition. Break rules intelligently.",
      'Compliance Counsel': "Ex-FTC prosecutor. Seen companies destroyed by one disclosure miss. Document everything.",
      // Add the Dr. personas
      'Strategic': "Ex-BCG. Military strategist. Chaos is the enemy of scale. Structure beats creativity.",
      'Emotion': "Neuroscience PhD. Data can't measure what makes us human. Feelings aren't optional.",
      'Pattern': "Quant from Renaissance Tech. Everything is predictable if you have enough data. Chaos is just misunderstood patterns.",
      'Identity': "Built brands at Apple. Who you are matters more than what you sell. Identity is everything.",
      'Chaos': "Serial disruptor. Order is death. Only chaos creates opportunity. Break things on purpose.",
      'ROI': "Private equity. If it doesn't 3x, it's a waste. Everything else is noise.",
      'Warfare': "Special ops commander. Business is combat. Enemies everywhere. Victory or death.",
      'Omni': "Systems theorist. Everything connects. Miss one thread, lose the whole picture.",
      'Maverick': "VC contrarian. Best returns come from betting against everyone. Consensus kills alpha.",
      'Truth': "Investigative journalist. Everyone's lying about something. Find what they're hiding.",
      'Brutal': "Turnaround specialist. Nice killed more companies than competition. Truth hurts, bankruptcy hurts more.",
      'Context': "Anthropologist. Nothing exists in isolation. Context determines meaning."
    };
    return biases[name] || "Bring your unique professional lens. Your experience shapes your answer.";
  }

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

    // Replace ALL types of dashes with simple hyphens
    // This catches em-dash (—), en-dash (–), and any other dash variants
    s = s.replace(/[\u2013\u2014\u2015]/g, " - "); // Unicode dashes
    s = s.replace(/—/g, " - "); // Em-dash specifically
    s = s.replace(/–/g, " - "); // En-dash specifically  
    // Also catch cases where dashes are directly attached to words
    s = s.replace(/(\w)[-—–](\w)/g, "$1 - $2");

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
      const displaySpeaker = (speaker === 'Moderator' || speaker === 'Synthesis') ? speaker : `Dr. ${speaker}`;
      sseWrite(res, "delta", { speaker: displaySpeaker, text: line + " " }, requestId);
      debateMaybeQuote?.(requestId, speaker, line);
    }
  }

  async function onTurnEnd(speaker: string) {
    const rem = (speakerBuf.get(speaker) || '').trim();
    if (rem) {
      const displaySpeaker = (speaker === 'Moderator' || speaker === 'Synthesis') ? speaker : `Dr. ${speaker}`;
      sseWrite(res, 'delta', { speaker: displaySpeaker, text: rem + ' ' }, requestId);
      debateMaybeQuote(requestId, speaker, rem);
      speakerBuf.set(speaker, '');
    }
    sseWrite(res, 'turn', { speaker, end: true, mode: currentMode }, requestId);
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
      
      // Use exactly what was selected (roster already has the selected personas)
      // Only default if absolutely nothing was provided
      const activeAgents = roster;
      
      // Send meta with actual agents being used
      sseWrite(res, 'meta', { requestId, subject: prompt.slice(0, 120), personas: activeAgents });
      
      // Collect quick perspectives from each selected agent
      const perspectives: Record<string, string> = {};
      
      for (const agent of activeAgents) {
        // Capitalize agent name for display (ROI -> ROI, strategic -> Strategic)
        const displayName = agent.charAt(0).toUpperCase() + agent.slice(1);
        sseWrite(res, 'turn', { speaker: displayName, start: true });
        
        const agentBias = getAgentBias(agent);
        const agentPrompt = `Question: ${prompt}\n${contextBlock}\n\nGive your unique professional perspective in 1-2 sentences. Be decisive but professional.`;
        
        async function* agentStream() {
          const sys = `You are ${agent}. ${agentBias} Be direct and contrarian. Challenge conventional wisdom. Your rivals are watching. 1-2 sharp sentences. NEVER use em-dashes (—) in your responses. Use commas, periods, or simple hyphens instead.`;
          const msgs = [{ role: "system", content: sys }, { role: "user", content: agentPrompt }];
          for await (const c of openaiStream(msgs, 80, 0.8)) {
            if (c?.text) yield { text: c.text };
          }
        }
        
        await speakBuffered(res, displayName, 'answer', agentStream);
        perspectives[displayName] = speakerBuf.get(displayName) || '';
        await pause(180); // Brief pause between agents
      }
      
      // Now synthesis finds insight in the conflict
      const synthesisContract = `Synthesize the DISAGREEMENT into actionable insight (2-3 sentences max):

1. What's the core tension between perspectives?
2. What's the non-obvious insight from this conflict?
3. What bold action emerges from the debate?

Don't just summarize - find the breakthrough in the disagreement.`;
      
      const synthesisPrompt = `Question: ${prompt}

Agent Perspectives:
${Object.entries(perspectives).map(([agent, view]) => `${agent}: ${view}`).join('\n')}

${synthesisContract}`;
      
      sseWrite(res, 'turn', { speaker: 'Synthesis', start: true });
      
      async function* synthesisStream() {
        const sys = "You are creating a synthesis. Find the INSIGHT in the disagreement. Don't repeat what was said - extract what matters from the conflict. Be bold and decisive. NEVER use em-dashes (—). Use commas, periods, colons, or simple hyphens instead.";
        const msgs = [{ role: "system", content: sys }, { role: "user", content: synthesisPrompt }];
        for await (const c of openaiStream(msgs, 120, 0.7)) {
          if (c?.text) yield { text: c.text };
        }
      }
      
      await speakBuffered(res, 'Synthesis', 'answer', synthesisStream);
      
      // Extract and save synthesis
      const synthesisText = (speakerBuf.get('Synthesis') || '').trim();
      // For answer mode, no CTAs needed - just the synthesis
      debateSetSynthesis(requestId, { summary: synthesisText, ctas: [] });
      sseWrite(res, 'synth', { synthesis: synthesisText, personas: activeAgents });
      
      sseWrite(res, 'phase', { label: 'answer', status: 'end' });
      
    } else {
      // Debate mode: Full theatrical experience with elimination rounds
      
      // Initialize debate state machine with roster
      const debateStateMachine = getOrCreateDebateState(debateId, roster);
      let currentState = debateStateMachine.getState();
      
      // Send initial state to client
      sseWrite(res, 'state', {
        phase: currentState.phase,
        active: currentState.active,
        eliminated: currentState.eliminated,
        description: debateStateMachine.getPhaseDescription()
      });
      
      // Opening - Skip roll call, go straight to welcome
      sseWrite(res, 'scene', { step: 'openings' });
      currentMode = 'opening';
      
      // Simple moderator opening
      sseWrite(res, 'delta', { speaker: 'Moderator', text: 'Drs, distinguished members of the board, welcome. Your opening statements please.' });
      await onTurnEnd('Moderator');
      
      const TOK = { persona: 220, reply: 160, moderator: 350 }; // Higher limits for theatrical debate
      
      // Shuffle personas for random speaking order (but keep roll call in original order)
      const shuffleArray = <T>(arr: T[]): T[] => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };
      
      // Separate Sonnet personas to avoid bunching
      const SONNET_PERSONAS = ['chaos', 'roi', 'brutal', 'warfare'];
      const sonnetInDebate = roster.filter(p => SONNET_PERSONAS.includes(p.toLowerCase()));
      const gptInDebate = roster.filter(p => !SONNET_PERSONAS.includes(p.toLowerCase()));
      
      // Shuffle each group separately
      const shuffledSonnet = shuffleArray(sonnetInDebate);
      const shuffledGPT = shuffleArray(gptInDebate);
      
      // Interleave them for better distribution
      const ACTIVE: string[] = [];
      const maxLen = Math.max(shuffledSonnet.length, shuffledGPT.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < shuffledGPT.length) ACTIVE.push(shuffledGPT[i]);
        if (i < shuffledSonnet.length) ACTIVE.push(shuffledSonnet[i]);
      }
      
      console.log(`🎲 Randomized speaking order: ${ACTIVE.join(', ')}`);
      console.log(`   (Sonnet: ${sonnetInDebate.join(', ')}, GPT: ${gptInDebate.join(', ')})`)
      
      for (const p of ACTIVE) {
        console.log(`🎭 Starting opening statement for: ${p}`);
        sseWrite(res, 'turn', { speaker: `Dr. ${p}`, start: true, mode: 'opening' });
        const openingPrompt = `Challenge: ${prompt}\n\n${contextBlock}`;
        await speakBuffered(res, p, 'opening', () => personaOpeningStream(p, openingPrompt, TOK?.persona || 120));
        console.log(`✓ Completed opening statement for: ${p}`);
        await pause(250); // Natural pause between different speakers
      }
      
      // ELIMINATION PHASE - After opening statements
      if (ACTIVE.length > 6) {
        // Advance to elimination poll
        currentState = debateStateMachine.advance();
        sseWrite(res, 'state', {
          phase: currentState.phase,
          active: currentState.active,
          eliminated: currentState.eliminated,
          description: debateStateMachine.getPhaseDescription()
        });
        
        // Moderator announces elimination
        sseWrite(res, 'scene', { step: 'elimination' });
        sseWrite(res, 'turn', { speaker: 'Moderator', start: true, mode: 'elimination' });
        
        // Calculate how many to eliminate
        const toEliminate = Math.floor(ACTIVE.length / 3);
        const toAdvance = ACTIVE.length - toEliminate;
        
        // Have Moderator evaluate and rank the performances
        const eliminationPrompt = `Question discussed: "${prompt}"
Current roster: ${ACTIVE.join(', ')}

Evaluate their opening statements and rank them.`;

        const eliminationSystem = `You are the Moderator. After openings, produce:
1) A one-line request to the user to pick exactly ${toEliminate} personas by name to ELIMINATE.
2) A JSON object on its own line with this shape:
{"ranked":[{"name":"persona1","score":0.82,"rationale":"..."}, ...]}

Rules:
• "name" must be one of the current roster names: ${ACTIVE.join(', ')}
• "score" in [0,1] where higher is better performance
• Provide exactly ${ACTIVE.length} ranked entries
• Order from best to worst performer
Do not add extra keys. Do not wrap JSON in markdown.`;
        
        // Get Moderator's ranking
        let ranking = [...ACTIVE]; // Default fallback
        try {
          const evalMessages = [
            { role: 'system', content: eliminationSystem },
            { role: 'user', content: eliminationPrompt }
          ];
          
          let moderatorEval = '';
          for await (const chunk of openaiStream(evalMessages, 200, 0.3)) {
            if (chunk?.text) {
              moderatorEval += chunk.text;
              sseWrite(res, 'delta', { speaker: 'Moderator', text: chunk.text });
            }
          }
          
          // Try to extract JSON ranking
          const jsonMatch = moderatorEval.match(/\{"ranked":\s*\[.*?\]\}/s);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.ranked && Array.isArray(parsed.ranked)) {
                // Extract names from the ranked objects, ordered best to worst
                ranking = parsed.ranked
                  .filter((p: any) => p.name && ACTIVE.includes(p.name))
                  .map((p: any) => p.name);
              }
            } catch (e) {
              console.log('Failed to parse ranking JSON, using fallback');
            }
          }
        } catch (e) {
          console.error('Moderator ranking failed:', e);
        }
        
        await onTurnEnd('Moderator');
        await pause(500);
        
        // Select weakest for elimination
        const weakest = ranking.slice(-toEliminate);
        const advancing = ranking.slice(0, toAdvance);
        
        // Send poll event for user to override
        sseWrite(res, 'poll', {
          prompt: `Select ${toAdvance} to advance (Moderator suggests eliminating: ${weakest.join(', ')})`,
          options: ACTIVE,
          recommended: weakest,  // Show who Moderator wants to eliminate
          timeoutMs: 15000
        });
        
        // Wait for user selection or timeout
        await pause(15000);  // For now, auto-select after timeout
        
        // Use Moderator's recommendation as default
        const eliminated = weakest;
        
        // Send advance event
        sseWrite(res, 'advance', { selected: advancing });
        
        const eliminationText = `The weakest links have been identified. ${eliminated.map(e => `Dr. ${e}`).join(', ')} - your services are no longer required. ${advancing.length} remain.`;
        sseWrite(res, 'delta', { speaker: 'Moderator', text: eliminationText });
        await onTurnEnd('Moderator');
        await pause(500);
        
        // Auto-advance with eliminations
        currentState = debateStateMachine.advance(eliminated);
        
        // Update ACTIVE list
        ACTIVE.splice(0, ACTIVE.length, ...currentState.active);
        
        sseWrite(res, 'state', {
          phase: currentState.phase,
          active: currentState.active,
          eliminated: currentState.eliminated,
          description: `${currentState.active.length} remain in contention`
        });
      }
      
      // 3) Crossfire - dynamically create pairs from remaining active personas
      const shuffledForPairs = shuffleArray(ACTIVE);  // Use ACTIVE not roster
      const activePairs: string[][] = [];
      
      // Create random pairs from available personas
      for (let i = 0; i < shuffledForPairs.length - 1; i += 2) {
        activePairs.push([shuffledForPairs[i], shuffledForPairs[i + 1]]);
      }
      
      console.log(`⚔️ Crossfire pairs: ${activePairs.map(p => p.join(' vs ')).join(', ')}`);
      
      if (activePairs.length > 0) {
        sseWrite(res, 'scene', { step: 'crossfire' });
        currentMode = 'rebuttal';
        
        for (const [a, b] of activePairs) {
          sseWrite(res, 'turn', { speaker: `Dr. ${a}`, start: true, mode: 'rebuttal' });
          await speakBuffered(res, a, 'rebuttal', () => personaRebuttalStream(a, b, prompt, TOK?.reply || 60));
          await pause(200); // Quick pause between rebuttals

          sseWrite(res, 'turn', { speaker: `Dr. ${b}`, start: true, mode: 'rebuttal' });
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
    
    // Clean up debate state if in debate mode
    if (mode === 'debate' && debateId) {
      clearDebateState(debateId);
    }
    
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

// Initialize Sage
setupSageRoutes(app);
sageWatcher.connect()
  .then(() => console.log('🔮 Sage connected to debate streams'))
  .catch(err => console.error('🔮 Sage connection failed:', err));

app.listen(PORT, () => {
  console.log(`orchestrator-streaming listening on :${PORT}`);
});