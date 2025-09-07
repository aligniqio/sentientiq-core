// Anthropic Messages API streaming → your SSE bridge
export async function claudeStream(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (err: any) => void;
}) {
  const {
    apiKey, model, system, user,
    temperature = 0.2, maxTokens = 1200,
    onDelta, onDone, onError
  } = opts;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model, system,
        temperature,
        max_tokens: maxTokens,
        stream: true,                     // <- important
        messages: [{ role: 'user', content: user }]
      })
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`Anthropic ${res.status} ${res.statusText} ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let sentDone = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const chunk = buf.slice(0, idx); // one SSE event
        buf = buf.slice(idx + 2);
        if (!chunk.trim()) continue;

        // parse lines: "event: ..." + "data: {...}"
        const lines = chunk.split('\n');
        const event = lines.find(l => l.startsWith('event:'))?.slice(6).trim();
        const dataLine = lines.find(l => l.startsWith('data:'))?.slice(5).trim();
        if (!event || !dataLine) continue;

        if (event === 'content_block_delta') {
          try {
            const j = JSON.parse(dataLine);
            const t = j?.delta?.text;
            if (t) onDelta(String(t));
          } catch { /* ignore */ }
        } else if (event === 'message_stop') {
          sentDone = true;
          onDone();
        } else if (event === 'error') {
          try { onError(JSON.parse(dataLine)); } catch (e) { onError(e); }
        }
      }
    }

    if (!sentDone) onDone();
  } catch (err) {
    onError(err);
  }
}

// OpenAI streaming support
export async function openAIStream(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (err: any) => void;
}) {
  const {
    apiKey, model, system, user,
    temperature = 0.4, maxTokens = 1200,
    onDelta, onDone, onError
  } = opts;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true
      })
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI ${res.status} ${res.statusText} ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onDone();
            return;
          }
          
          try {
            const j = JSON.parse(data);
            const content = j?.choices?.[0]?.delta?.content;
            if (content) onDelta(content);
          } catch { /* ignore */ }
        }
      }
    }

    onDone();
  } catch (err) {
    onError(err);
  }
}