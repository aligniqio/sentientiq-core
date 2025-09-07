import { createClient } from 'redis';

export async function getRedis() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
  client.on('error', (e) => console.error('redis', e));
  if (!client.isOpen) await client.connect();
  return client;
}

export async function enqueueDebate(job: {
  id: string;
  prompt: string;
  topK?: number;
}) {
  const r = await getRedis();
  const stream = 'debate.requests';
  // Create the group once at boot: XGROUP CREATE debate.requests agents $ MKSTREAM
  const entryId = await r.xAdd(stream, '*', {
    id: job.id,
    payload: JSON.stringify(job),
  }, { TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: 10000 } });
  await r.quit();
  return entryId;
}