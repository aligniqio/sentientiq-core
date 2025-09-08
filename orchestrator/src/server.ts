import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { runChain, sseWrite } from './chain';
import { enqueueDebate } from './queue/redis';
import { createClient } from '@supabase/supabase-js';

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
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Keep-alive pings so proxies don't kill SSE
function attachKeepAlive(res: Response) {
  const int = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);
  res.on('close', () => clearInterval(int));
}

// Main boardroom/debate handler - single source of truth
const boardroomHandler = async (req: Request, res: Response) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx buffering bypass
  res.flushHeaders?.();

  attachKeepAlive(res);

  const parsed = DebateBody.safeParse(req.body);
  if (!parsed.success) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: parsed.error.message })}\n\n`);
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
  
  // Meta for UI
  sseWrite(res, 'meta', { 
    mode, 
    plan, 
    personaCap, 
    roster,
    debateId,
    tenantId
  });

  try {
    if (mode === 'answer') {
      // Answer mode: Hidden panel → Moderator-only stream
      // For now, run normal chain but only stream the Moderator
      await runChain(prompt, topK, res, roster, true); // true = moderatorOnly flag
    } else {
      // Debate mode: Full visible personas + Moderator
      await runChain(prompt, topK, res, roster, false);
    }
  } catch (e: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: String(e?.message || e) })}\n\n`);
  } finally {
    res.end();
  }
};

// All possible routes that might be called - boring redundancy is GOOD
app.post('/v1/debate', boardroomHandler);
app.post('/v1/boardroom', boardroomHandler);
app.post('/api/v1/debate', boardroomHandler);
app.post('/api/v1/boardroom', boardroomHandler);
app.post('/api/sage/debate', boardroomHandler); // legacy route

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

// Usage tracking handler - simple 204 for now
const usageHandler = (_req: Request, res: Response) => {
  // TODO: optionally write to Supabase 'events' table
  res.status(204).end();
};

// Usage tracking routes - all variations someone might try
app.post('/v1/usage/track', express.json(), usageHandler);
app.post('/api/usage/track', express.json(), usageHandler);
app.post('/api/v1/usage/track', express.json(), usageHandler);
app.post('/v1/track', express.json(), usageHandler); // short version

// Health check - multiple paths because why not
const healthHandler = (_req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
    version: process.env.npm_package_version || '0.1.0'
  });
};

app.get('/health', healthHandler);
app.get('/healthz', healthHandler);  // k8s style
app.get('/ping', healthHandler);     // classic
app.get('/api/health', healthHandler);
app.get('/api/ping', healthHandler);
app.get('/', healthHandler);         // root check

app.listen(PORT, () => {
  console.log(`orchestrator listening on :${PORT}`);
});