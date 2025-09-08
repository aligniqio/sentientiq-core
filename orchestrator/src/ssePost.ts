// ssePost.ts
export type SSEHandlers = {
  onEvent?: (evt: { event: string; data: any }) => void;
  onDelta?: (payload: { speaker?: string; text: string }) => void;
  onTurn?: (payload: any) => void;
  onScene?: (payload: any) => void;
  onSynth?: (payload: any) => void;
  onMeta?: (payload: any) => void;
  onError?: (err: unknown) => void;
};

export function ssePost(url: string, body: any, handlers: SSEHandlers = {}) {
  const ctrl = new AbortController();
  (async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Bad response ${res.status}`);

      const dec = new TextDecoder();
      const reader = res.body.getReader();
      let buf = "";
      let evt = "message"; // default SSE event if none specified
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        // Parse SSE frames: blocks separated by \n\n
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 2);

          let dataLines: string[] = [];
          evt = "message";
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) evt = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5));
          }
          const dataStr = dataLines.join("\n");
          let data: any = dataStr;
          try { data = dataStr ? JSON.parse(dataStr) : {}; } catch {}
          handlers.onEvent?.({ event: evt, data });

          if (evt === "delta") handlers.onDelta?.(data);
          else if (evt === "turn") handlers.onTurn?.(data);
          else if (evt === "scene") handlers.onScene?.(data);
          else if (evt === "synth") handlers.onSynth?.(data);
          else if (evt === "meta") handlers.onMeta?.(data);
          else if (evt === "error") handlers.onError?.(data);
        }
      }
    } catch (e) {
      handlers.onError?.(e);
    }
  })();
  return () => ctrl.abort();
}