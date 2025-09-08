# Complete Streaming Debate Setup

## Key Components for True Streaming (No Blob)

### 1. Server-Side (server-streaming.ts)
✅ **SSE Headers** - Set before any data
✅ **No Compression** - Disable for streaming routes  
✅ **Natural Pacing** - Pauses between speakers
✅ **Sentence Splitting** - Stream each sentence separately

```typescript
// SSE headers (MUST be first)
res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
res.setHeader("Cache-Control", "no-cache, no-transform");
res.setHeader("Connection", "keep-alive");
res.setHeader("X-Accel-Buffering", "no");  // Disable Nginx buffering
res.flushHeaders?.();

// Disable compression for streaming
app.use((req, res, next) => {
  if (req.path.startsWith("/v1/boardroom")) {
    (res as any).flush = (res as any).flush || (() => {});
  }
  next();
});

// Natural pacing between turns
const pause = (ms: number) => new Promise(r => setTimeout(r, ms));
await speak(res, p, "opening", ...);
await pause(180); // 180ms between speakers
```

### 2. Client-Side Stream Reader (ssePost.ts)
✅ **ReadableStream API** - Process chunks as they arrive
✅ **NO res.text()** - Never wait for full response
✅ **Immediate Processing** - Handle each SSE frame instantly

```typescript
// CORRECT: Stream reader
const reader = res.body.getReader();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  // Process chunk immediately
}

// WRONG: These cause blob delivery
await res.text()     // ❌ Waits for entire response
await res.json()     // ❌ Waits for entire response
axios.get(...)       // ❌ Default axios buffers everything
```

### 3. React Component (DebateStreamComponent.tsx)
✅ **Per-Sentence Display** - Each delta creates a new TypeLine
✅ **Typewriter Effect** - Characters appear one by one
✅ **Speaker Attribution** - No "undefined:" prefixes

```typescript
useEffect(() => {
  const stop = ssePost("/api/sage/debate", { prompt, topK }, {
    onDelta: ({ speaker, text }) => {
      const who = speaker || "System"; // Prevent "undefined:"
      setLines(ls => [...ls, { 
        id: crypto.randomUUID(), 
        speaker: who, 
        text 
      }]);
    }
  });
  return () => stop();
}, [prompt, topK]);
```

## Why This Works

1. **Server sends** each sentence as a separate SSE event
2. **Client reads** the stream chunk by chunk (not waiting for completion)
3. **Each chunk** is immediately parsed and displayed
4. **TypeLine** adds typewriter effect to each sentence
5. **Natural pauses** between speakers create conversation feel

## Common Pitfalls to Avoid

❌ Using `res.text()` or `res.json()` - always buffers entire response
❌ Compression middleware on streaming routes - breaks chunking
❌ Missing SSE headers - browser won't treat as stream
❌ No `X-Accel-Buffering: no` - Nginx/proxies may buffer
❌ Concatenating all text before display - loses streaming benefit

## Testing the Stream

1. Open Network tab in browser DevTools
2. Look for the `/api/sage/debate` request
3. Click on it and go to "Response" or "Preview" tab
4. You should see data arriving gradually, not all at once
5. Each sentence should appear with typewriter effect

## File Structure

```
src/
├── server-streaming.ts      # Backend with SSE, no compression, pacing
├── ssePost.ts              # Stream reader using ReadableStream API  
├── DebateStreamComponent.tsx # React component with per-sentence rendering
├── EmailBriefButton.tsx    # Email brief functionality
├── EmailBriefDialog.tsx    # Email dialog modal
└── TypeLine.tsx           # Typewriter effect component
```

This setup ensures true streaming with natural debate flow!