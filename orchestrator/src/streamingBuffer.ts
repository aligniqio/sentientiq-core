// streamingBuffer.ts - Honest pacing with server-side chunking

import { Response } from 'express';

// Split text into sentences (improved version)
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  
  // More sophisticated sentence splitting
  // Handles: periods, questions, exclamations, and common edge cases
  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")  // Split on sentence endings before capitals
    .replace(/\n\n/g, "|")                     // Paragraphs are sentence boundaries
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences;
}

// Gradually release text with natural pacing
export async function streamWithPacing(
  res: Response,
  speaker: string,
  text: string,
  options: {
    sentencePause?: number;  // Pause between sentences (ms)
    wordPause?: number;       // Pause between words (ms) 
    chunkSize?: 'sentence' | 'word' | 'phrase';
    sseWrite: (res: Response, event: string, data: any) => void;
  }
) {
  const {
    sentencePause = 100,   // 100ms between sentences
    wordPause = 0,          // No pause between words by default
    chunkSize = 'sentence',
    sseWrite
  } = options;

  const sentences = splitIntoSentences(text);
  
  for (const sentence of sentences) {
    if (chunkSize === 'sentence') {
      // Send full sentence at once
      sseWrite(res, 'delta', { speaker, text: sentence + ' ' });
      await pause(sentencePause);
      
    } else if (chunkSize === 'phrase') {
      // Split by commas and semicolons for phrase-level streaming
      const phrases = sentence.split(/[,;]/);
      for (const phrase of phrases) {
        if (phrase.trim()) {
          sseWrite(res, 'delta', { speaker, text: phrase.trim() + ' ' });
          await pause(sentencePause / 2);
        }
      }
      
    } else if (chunkSize === 'word') {
      // Word-by-word (most granular, but maybe too much)
      const words = sentence.split(/\s+/);
      for (const word of words) {
        sseWrite(res, 'delta', { speaker, text: word + ' ' });
        if (wordPause > 0) await pause(wordPause);
      }
      await pause(sentencePause);
    }
  }
}

// Helper pause function
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Collect full response from AI, then stream it gradually
export async function collectThenStream(
  generateFn: () => AsyncGenerator<{text: string}>,
  res: Response,
  speaker: string,
  options: Parameters<typeof streamWithPacing>[3]
) {
  // Collect the full response first
  let fullText = '';
  for await (const chunk of generateFn()) {
    if (chunk?.text) fullText += chunk.text;
  }
  
  // Now stream it with controlled pacing
  await streamWithPacing(res, speaker, fullText, options);
}

// Enhanced speak function that collects then streams
export async function speakWithBuffer(
  res: Response,
  speaker: string,
  mode: string,
  generateFn: () => AsyncGenerator<{text: string}>,
  options: {
    sentencePause?: number;
    chunkSize?: 'sentence' | 'word' | 'phrase';
    sseWrite: (res: Response, event: string, data: any) => void;
    onTurnEnd: (speaker: string) => Promise<void>;
  }
) {
  // Collect full response
  let fullText = '';
  for await (const chunk of generateFn()) {
    if (chunk?.text) fullText += chunk.text;
  }
  
  // Stream it gradually with pacing
  const sentences = splitIntoSentences(fullText);
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    options.sseWrite(res, 'delta', { speaker, text: sentence + ' ' });
    
    // Natural pacing: shorter pause mid-paragraph, longer at paragraph end
    const isLastSentence = i === sentences.length - 1;
    const pauseTime = isLastSentence ? 150 : options.sentencePause || 80;
    await pause(pauseTime);
  }
  
  // Signal turn end
  await options.onTurnEnd(speaker);
}

// Example usage in your debate handler:
/*
// Replace this:
await speak(res, persona, 'opening', () => personaOpeningStream(persona, prompt));

// With this:
await speakWithBuffer(res, persona, 'opening', 
  () => personaOpeningStream(persona, prompt),
  {
    sentencePause: 80,      // 80ms between sentences
    chunkSize: 'sentence',  // Send full sentences
    sseWrite,
    onTurnEnd
  }
);

// Now each persona's response is:
// 1. Fully generated (fast, using streaming from AI)
// 2. Then delivered sentence by sentence (controlled pacing)
// 3. Creating a natural debate flow
*/