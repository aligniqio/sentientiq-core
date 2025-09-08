// EventSourceEndpoint.ts - Optional GET endpoint for native EventSource
// Add this to server-streaming.ts if you want EventSource support

// GET endpoint for EventSource (limited to query params)
app.get('/v1/boardroom/stream', async (req: Request, res: Response) => {
  // Parse query parameters
  const prompt = req.query.prompt as string;
  const topK = parseInt(req.query.topK as string) || 4;
  const tenantId = req.query.tenantId as string || 'default';
  
  if (!prompt) {
    res.status(400).json({ error: 'Missing prompt parameter' });
    return;
  }

  // SSE headers for EventSource
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*'); // For EventSource CORS
  res.flushHeaders?.();

  // Generate requestId
  const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  
  // Send initial meta
  res.write(`event: meta\n`);
  res.write(`data: ${JSON.stringify({ requestId, subject: prompt.slice(0, 120) })}\n\n`);

  // Keep-alive interval
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
  });

  // Run the debate logic (reuse existing debate function)
  // ... your existing debate logic here ...
  
  // Example events
  res.write(`event: scene\n`);
  res.write(`data: ${JSON.stringify({ step: 'rollcall' })}\n\n`);
  
  res.write(`event: delta\n`);
  res.write(`data: ${JSON.stringify({ speaker: 'Moderator', text: 'Roll call: Emotion, ROI, Strategic.' })}\n\n`);
  
  // When done
  res.write(`event: done\n`);
  res.write(`data: {}\n\n`);
  res.end();
});

// ============================================
// Client-side EventSource usage
// ============================================

/*
// Native EventSource (GET only, limited functionality)
const source = new EventSource(`/api/sage/debate/stream?prompt=${encodeURIComponent(prompt)}&topK=4`);

source.addEventListener('meta', (e) => {
  const data = JSON.parse(e.data);
  setRequestId(data.requestId);
});

source.addEventListener('delta', (e) => {
  const { speaker, text } = JSON.parse(e.data);
  setLines(prev => [...prev, { 
    id: crypto.randomUUID(), 
    speaker: speaker || 'System', 
    text 
  }]);
});

source.addEventListener('error', (e) => {
  console.error('EventSource error:', e);
  source.close();
});

source.addEventListener('done', () => {
  source.close();
});

// Cleanup
return () => source.close();
*/

// ============================================
// Comparison: EventSource vs SSE-over-POST
// ============================================

/*
EventSource (GET):
✅ Native browser API
✅ Automatic reconnection
✅ Simple for read-only streams
❌ GET only (limited data in URL)
❌ No request body
❌ No custom headers
❌ URL length limits

SSE-over-POST (ssePost):
✅ POST with request body
✅ Complex payloads
✅ Custom headers
✅ Works with auth tokens
✅ No URL length limits
❌ Manual reconnection needed
❌ Not native API

Recommendation: Use ssePost for complex debates with multiple parameters
*/