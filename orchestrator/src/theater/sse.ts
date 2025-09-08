// =============================================================
// File: src/theater/sse.ts
// Purpose: Minimal SSE helpers to orchestrate scenes/turns and stream
//          persona text with sentence-level pacing.
// =============================================================
import type { Response } from 'express';

export function sse(res: Response, evt: string, data: any) {
  res.write(`event: ${evt}\n` + `data: ${JSON.stringify(data)}\n\n`);
}

export async function speak(
  res: Response,
  speaker: string,
  mode: 'opening' | 'rebuttal' | 'synthesis',
  streamFn: () => AsyncGenerator<{ text?: string }>
) {
  sse(res, 'turn', { speaker, start: true, mode });
  for await (const chunk of streamFn()) {
    if (chunk?.text) sse(res, 'delta', { speaker, text: chunk.text });
  }
  sse(res, 'turn', { speaker, end: true, mode });
}