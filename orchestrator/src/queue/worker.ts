import { createClient } from 'redis';
import { runChain } from '../chain'; // hook to your orchestrator step

const STREAM = 'debate.requests';
const GROUP  = 'agents';

async function ensureGroup(r: any) {
  try { await r.xGroupCreate(STREAM, GROUP, '$', { MKSTREAM: true }); }
  catch (e: any) { if (!String(e?.message).includes('BUSYGROUP')) throw e; }
}

export async function startWorker(name = 'w1') {
  const r = createClient({ url: process.env.REDIS_URL });
  await r.connect();
  await ensureGroup(r);

  while (true) {
    const resp = await r.xReadGroup(GROUP, name, [{ key: STREAM, id: '>' }], { COUNT: 10, BLOCK: 5000 });
    if (!resp) continue;

    for (const { messages } of resp as any[]) {
      for (const m of messages) {
        const fields = Object.fromEntries(m.message as any);
        const payload = JSON.parse(fields.payload);
        try {
          await runChain(payload.prompt, payload.topK ?? 6); // your 3-chain call
          await r.xAck(STREAM, GROUP, m.id);
        } catch (err) {
          console.error('worker error', err);
          // leave unacked; it will show in XPENDING and can be XCLAIMed by another worker (retry policy)
          // optionally: after N attempts, dead-letter:
          // await r.xAck(STREAM, GROUP, m.id);
          // await r.xAdd('debate.dlq', '*', { from: m.id, payload: fields.payload });
        }
      }
    }
  }
}