import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { runChain } from './chain';
import { enqueueDebate } from './queue/redis';

// ---------- Env ----------
const PORT = Number(process.env.PORT || 8787);

// ---------- Validation ----------
const DebateBody = z.object({
  prompt: z.string().min(3),
  personas: z.array(z.string()).optional().default(['ROI Analyst','Emotion Scientist']),
  topK: z.number().int().min(0).max(20).optional().default(6)
});

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

// Streaming endpoint (direct execution)
app.post('/v1/debate', async (req: Request, res: Response) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  attachKeepAlive(res);

  const parsed = DebateBody.safeParse(req.body);
  if (!parsed.success) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: parsed.error.message })}\n\n`);
    return res.end();
  }

  const { prompt, topK } = parsed.data;

  try {
    await runChain(prompt, topK, res);
  } catch (e: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: String(e?.message || e) })}\n\n`);
  } finally {
    res.end();
  }
});

// Queued endpoint (for async processing)
app.post('/v1/debate/queue', async (req: Request, res: Response) => {
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
});

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`orchestrator listening on :${PORT}`);
});