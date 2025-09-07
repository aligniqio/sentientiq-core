// SSE helper for robust Server-Sent Events handling
export async function ssePost<T extends object>(
  url: string,
  body: T,
  onEvent: (ev: { event: string; data: any }) => void
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
    throw new Error(`SSE request failed: ${msg}`);
  }
  
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      if (!chunk.trim()) continue;
      
      const lines = chunk.split('\n');
      const event = lines.find(l => l.startsWith('event:'))?.slice(6).trim() || 'message';
      const dataLine = lines.find(l => l.startsWith('data:'))?.slice(5).trim() || '{}';
      
      try { 
        onEvent({ event, data: JSON.parse(dataLine) }); 
      } catch { 
        /* ignore parsing errors */ 
      }
    }
  }
}