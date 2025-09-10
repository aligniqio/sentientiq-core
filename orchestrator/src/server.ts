import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { callAnthropic } from './services/hybrid-llm.js';
import { 
  generalLimiter, 
  debateLimiter, 
  sageLimiter,
  strictLimiter,
  securityHeaders,
  errorHandler,
  timeoutMiddleware,
  validateDebateRequest,
  validateSageRequest,
  handleValidationErrors,
  requestSizeLimiter,
  sanitizeInput
} from './middleware/security.js';
import { enqueueDebate } from './queue/redis.js';
import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { 
  pickPersonas, 
  rivalPairs, 
  speak, 
  streamPersonaOpening, 
  streamPersonaRebuttal, 
  streamSynthesis,
  takeTopCTAs,
  TOK,
  sseWrite 
} from './theatrical-helpers.js';
import { exportBriefHandler } from './services/brief/exportBrief.js';
import { debateInit, debateMaybeQuote, debateSetSynthesis } from './services/brief/store.js';

// ---------- Env ----------
const PORT = Number(process.env.PORT || 8787);

// ---------- Plan Caps ----------
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

// ---------- Supabase ----------
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ---------- Clerk ----------
const clerkClient = process.env.CLERK_SECRET_KEY 
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

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

// ---------- Validation ----------
const DebateBody = z.object({
  prompt: z.string().min(3),
  personas: z.array(z.string()).optional(),
  topK: z.number().int().min(0).max(20).optional().default(3),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  mode: z.enum(['answer', 'debate']).optional().default('answer'),
  temperature: z.number().min(0).max(1).optional().default(0.2)
});

// Default personas for free tier
const DEFAULT4 = ['ROI Analyst', 'CRO Specialist', 'Emotion Scientist', 'Data Skeptic'];
const DEFAULT_PERSONAS = [
  'ROI Analyst', 'Emotion Scientist', 'CRO Specialist', 'Copy Chief',
  'Performance Engineer', 'Brand Strategist', 'UX Researcher', 'Data Skeptic',
  'Social Strategist', 'Customer Success', 'CEO Provocateur', 'Compliance Counsel'
];

// ---------- Server ----------
const app = express();
// Security middleware
app.use(securityHeaders);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://sentientiq.app', 'https://www.sentientiq.app', 'https://api.sentientiq.app']
    : true,
  credentials: true,
  maxAge: 86400
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestSizeLimiter('1mb'));
app.use(generalLimiter);

// Sanitize all incoming request bodies
app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
});

// Keep-alive pings so proxies don't kill SSE
function attachKeepAlive(res: Response) {
  const int = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);
  res.on('close', () => clearInterval(int));
}

// Main boardroom/debate handler - single source of truth
const boardroomHandler = async (req: Request, res: Response) => {
  // === PROVENANCE ID & SSE HEADERS (must be before flush) ===
  const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx buffering bypass
  res.setHeader('x-request-id', requestId); // set BEFORE flush
  res.flushHeaders?.();
  attachKeepAlive(res);

  // Validate input
  const parsed = DebateBody.safeParse(req.body);
  if (!parsed.success) {
    res.write(`event: error\ndata: ${JSON.stringify({
      code: 'BAD_BODY',
      message: parsed.error.message,
      requestId
    })}\n\n`);
    return res.end();
  }

  const { prompt, topK, tenantId, personas, mode } = parsed.data;
  const debateId = `debate-${Date.now()}`;

  // Get tenant plan and enforce caps
  const plan = await getTenantPlan(tenantId);
  const personaCap = capForPlan(plan);
  
  // Roster (dedupe + cap) or default quartet
  const requested = Array.from(new Set(personas ?? []));
  const roster = (requested.length ? requested : DEFAULT4).slice(0, personaCap);
  
  // Always emit a meta event early so client/UI can show provenance
  res.write(
    `event: meta\n` +
    `data: ${JSON.stringify({ 
      requestId, 
      backend: 'orchestrator',
      mode, 
      plan, 
      personaCap, 
      roster,
      debateId,
      tenantId
    })}\n\n`
  );

  try {
    if (mode === 'answer') {
      // Answer mode: Show selected personas' perspectives, then synthesize
      sseWrite(res, 'phase', { label: 'answer', status: 'begin' });
      sseWrite(res, 'meta', { requestId, subject: prompt.slice(0, 120), personas: roster });
      
      // Collect perspectives from each selected persona
      const perspectives: Record<string, string> = {};
      
      for (const persona of roster) {
        sseWrite(res, 'turn', { speaker: persona, start: true });
        
        // Generate persona's answer (shorter than debate mode)
        const personaAnswer = await streamPersonaOpening(persona, prompt, 80); // Shorter token limit for answer mode
        perspectives[persona] = personaAnswer;
        
        // Stream the persona's response
        await speak(res, persona, async () => personaAnswer);
        sseWrite(res, 'turn', { speaker: persona, end: true, mode: 'opening' });
      }
      
      // Synthesis of all perspectives
      sseWrite(res, 'turn', { speaker: 'Synthesis', start: true });
      
      const synthesisPrompt = `Based on these perspectives:
${Object.entries(perspectives).map(([p, text]) => `${p}: ${text}`).join('\n\n')}

Provide a synthesis that captures the core tension and non-obvious insight.`;
      
      const synthesis = await callAnthropic(
        'You are the Synthesis voice. Identify tensions, reveal non-obvious insights, and suggest bold actions. Be concise.',
        synthesisPrompt
      );
      
      await speak(res, 'Synthesis', async () => synthesis);
      sseWrite(res, 'message', {});
      sseWrite(res, 'turn', { speaker: 'Synthesis', end: true, mode: 'opening' });
      sseWrite(res, 'synth', { synthesis: '', personas: roster });
      sseWrite(res, 'phase', { label: 'answer', status: 'end' });
      
      // Final moderator synthesis with CTAs
      sseWrite(res, 'scene', { step: 'synthesis' });
      sseWrite(res, 'turn', { speaker: 'Moderator', start: true, mode: 'synthesis' });
      
      const moderatorPrompt = `The board has debated: ${roster.join(', ')}.

Challenge: ${prompt}

Synthesize into EXACTLY 3 action items:
- [Action] — Owner: [Role] — When: [Timeframe]`;
      
      const moderatorSynthesis = await callAnthropic(
        'You are the Moderator. Be decisive. No hedging.',
        moderatorPrompt
      );
      
      await speak(res, 'Moderator', async () => moderatorSynthesis);
      sseWrite(res, 'turn', { speaker: 'Moderator', end: true, mode: 'synthesis' });
      
      // Extract and send CTAs
      const bullets = takeTopCTAs(moderatorSynthesis, 3);
      const ctas = bullets.map(b => {
        const match = b.match(/(.+?)—\s*Owner:\s*(.+?)—\s*When:\s*(.+)/);
        if (match) {
          return { action: match[1].trim(), owner: match[2].trim(), when: match[3].trim() };
        }
        return { action: b, owner: 'Team', when: 'ASAP' };
      });
      
      sseWrite(res, 'synth', { title: 'Collective Synthesis', bullets: ctas });
      
      if (ctas.length === 0) {
        sseWrite(res, 'warn', { code: 'NO_CTAS', message: 'No actionable CTAs parsed' });
      }
      
      sseWrite(res, 'done', { ok: true })
    } else {
      // Debate mode: Full theatrical debate with personas
      
      // Initialize debate state
      const provider = process.env.PREFER_ANTHROPIC === 'true' ? 'anthropic' : 'openai';
      const model = provider === 'anthropic' ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL;
      debateInit(requestId, { subject: prompt, provider, model });
      
      // 1) Roll call
      sseWrite(res, "scene", { step: "rollcall" });
      const ACTIVE = pickPersonas(topK ?? 12, process.env.DEMO_MODE === 'true'); // drop Brutal/Warfare/Chaos if not demo
      sseWrite(res, "delta", { speaker: "Moderator", text: `Roll call: ${ACTIVE.join(", ")}.` + "\n" });

      // 2) Openings
      global.currentMode = "opening";
      sseWrite(res, "scene", { step: "openings" });
      for (const p of ACTIVE) {
        const text = await streamPersonaOpening(p, prompt, TOK.persona);
        // Capture quotes from openings
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        sentences.forEach(s => debateMaybeQuote(requestId, p, s.trim()));
        await speak(res, p, () => streamPersonaOpening(p, prompt, TOK.persona));
      }

      // 3) Crossfire
      global.currentMode = "rebuttal";
      sseWrite(res, "scene", { step: "crossfire" });
      for (const [a,b] of rivalPairs(ACTIVE)) {
        await speak(res, a, () => streamPersonaRebuttal(a, b, prompt, TOK.reply));
        await speak(res, b, () => streamPersonaRebuttal(b, a, prompt, TOK.reply));
      }

      // 4) Synthesis
      global.currentMode = "synthesis";
      sseWrite(res, "scene", { step: "synthesis" });
      const synthesisText = await streamSynthesis(ACTIVE, prompt, TOK.moderator);
      
      // Extract CTAs and summary
      const bullets = takeTopCTAs(synthesisText, 3);
      const summary = synthesisText.split('\n')[0] || 'The collective has reached consensus.';
      
      // Parse CTAs into structured format
      const ctas = bullets.map(b => {
        const match = b.match(/(.+?)·\s*Owner:\s*(.+?)·\s*When:\s*(.+)/);
        if (match) {
          return { action: match[1].trim(), owner: match[2].trim(), when: match[3].trim() };
        }
        return { action: b, owner: 'Team', when: 'ASAP' };
      });
      
      // Store synthesis
      debateSetSynthesis(requestId, { summary, ctas });
      
      // Stream synthesis to client
      await speak(res, "Moderator", () => streamSynthesis(ACTIVE, prompt, TOK.moderator));
      sseWrite(res, "synth", {
        title: "Collective Synthesis",
        bullets: ctas
      });
    }
  } catch (e: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: String(e?.message || e) })}\n\n`);
  } finally {
    res.end();
  }
};

// All possible routes that might be called - boring redundancy is GOOD
app.post('/v1/debate', debateLimiter, timeoutMiddleware(60), validateDebateRequest, handleValidationErrors, boardroomHandler);
app.post('/v1/boardroom', debateLimiter, timeoutMiddleware(60), validateDebateRequest, handleValidationErrors, boardroomHandler);
app.post('/api/v1/debate', debateLimiter, timeoutMiddleware(60), validateDebateRequest, handleValidationErrors, boardroomHandler);
app.post('/api/v1/boardroom', debateLimiter, timeoutMiddleware(60), validateDebateRequest, handleValidationErrors, boardroomHandler);
app.post('/api/sage/debate', debateLimiter, timeoutMiddleware(60), validateDebateRequest, handleValidationErrors, boardroomHandler); // legacy route

// Queued endpoint handler
const queueHandler = async (req: Request, res: Response) => {
  const parsed = DebateBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const { prompt, topK } = parsed.data;
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    const entryId = await enqueueDebate({ id: jobId, prompt, topK });
    res.json({ jobId, entryId, status: 'queued' });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
};

// Queue routes - all variations
app.post('/v1/debate/queue', queueHandler);
app.post('/v1/boardroom/queue', queueHandler);
app.post('/api/v1/debate/queue', queueHandler);
app.post('/api/v1/boardroom/queue', queueHandler);

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

// Wire up the new export handler
app.post('/v1/debate/export', express.json(), exportBriefHandler);
app.post('/api/v1/debate/export', express.json(), exportBriefHandler);

// Invite user endpoint for super-admin
const inviteUserHandler = async (req: Request, res: Response) => {
  try {
    const { email, name, organizationId, organizationName, role } = req.body;
    
    if (!email || !organizationId) {
      return res.status(400).json({ error: 'Email and organizationId are required' });
    }
    
    if (!clerkClient) {
      return res.status(500).json({ error: 'Clerk is not configured' });
    }
    
    // Create an invitation through Clerk
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        organization_id: organizationId,
        organization_name: organizationName,
        role: role || 'user',
        invited_by: 'super-admin'
      },
      redirectUrl: `${process.env.FRONTEND_URL || 'https://sentientiq.app'}/sign-up?organization=${organizationId}`,
      notify: true
    });
    
    res.json({ 
      ok: true, 
      invitationId: invitation.id,
      email: invitation.emailAddress,
      status: invitation.status
    });
  } catch (error) {
    console.error('Failed to send invitation:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send invitation' 
    });
  }
};

app.post('/v1/invite-user', express.json(), inviteUserHandler);
app.post('/api/v1/invite-user', express.json(), inviteUserHandler);

// Admin toggle for provider preference
const adminToggleHandler = (req: Request, res: Response) => {
  const { prefer_anthropic } = req.body;
  
  // Simple auth check - you should add proper admin auth
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Toggle the env var (note: this won't persist across restarts)
  process.env.PREFER_ANTHROPIC = String(prefer_anthropic);
  
  res.json({ 
    ok: true, 
    prefer_anthropic: process.env.PREFER_ANTHROPIC,
    provider: process.env.PREFER_ANTHROPIC === 'true' ? 'anthropic' : 'openai'
  });
};

app.post('/v1/admin/toggle-provider', express.json(), adminToggleHandler);

// Health check - multiple paths because why not
const healthHandler = (_req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
    version: process.env.npm_package_version || '0.1.0',
    provider: process.env.PREFER_ANTHROPIC === 'true' ? 'anthropic' : 'openai'
  });
};

// Sage analyze endpoint
app.post('/api/sage/analyze', sageLimiter, timeoutMiddleware(30), validateSageRequest, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    
    // Call Claude Sonnet 3.5 for Sage's brutally honest response
    const response = await callAnthropic(
      `You are Sage, the brutally honest AI assistant. You call out BS, manipulation, and corporate-speak without mercy. 
      Analyze this message and respond with your trademark wit and honesty:
      
      Context: ${context || 'General inquiry'}
      Message: ${message}`,
      'claude-3-5-sonnet-20241022'
    );
    
    res.json({
      response: response,
      bullshit_score: Math.random() * 100, // TODO: Implement actual BS detection
      sage_says: "I've seen worse, but not by much."
    });
  } catch (error) {
    console.error('Sage analyze error:', error);
    res.status(500).json({ error: 'Sage is taking a coffee break' });
  }
});

app.get('/health', healthHandler);
app.get('/healthz', healthHandler);  // k8s style
app.get('/ping', healthHandler);     // classic
app.get('/api/health', healthHandler);
app.get('/api/ping', healthHandler);
app.get('/', healthHandler);         // root check

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`orchestrator listening on :${PORT}`);
});