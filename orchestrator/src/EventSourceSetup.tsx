// EventSourceSetup.tsx - Native EventSource support React component

import React, { useEffect, useState } from 'react';

// Define color map for different speakers
const COLORS: Record<string, string> = {
  Moderator: '#9333ea',
  Emotion: '#ec4899',
  ROI: '#3b82f6',
  Strategic: '#10b981',
  Identity: '#f59e0b',
  Context: '#8b5cf6',
  Pattern: '#06b6d4',
  Omni: '#ef4444',
  First: '#84cc16',
  default: '#6b7280'
};

// Simple TypeLine component
function TypeLine({ label, text, color }: { label: string; text: string; color?: string }) {
  return (
    <div style={{ marginBottom: '0.5rem', color: color || '#fff' }}>
      <strong>{label}:</strong> {text}
    </div>
  );
}

export function DebateEventSource({ prompt, topK = 4 }: { prompt: string; topK?: number }) {
  const [lines, setLines] = useState<{ id: string; speaker: string; text: string }[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [scene, setScene] = useState<string>("");

  useEffect(() => {
    if (!prompt) return;

    // Native EventSource (GET request)
    const es = new EventSource(
      `/api/boardroom/sse?prompt=${encodeURIComponent(prompt)}&topK=${topK}`
    );

    // Handle meta event
    es.addEventListener("meta", (e) => {
      const data = JSON.parse(e.data);
      if (data.requestId) setRequestId(data.requestId);
    });

    // Handle scene changes
    es.addEventListener("scene", (e) => {
      const data = JSON.parse(e.data);
      setScene(data.step || "");
    });

    // Handle delta events (each sentence)
    es.addEventListener("delta", (e) => {
      const { speaker, text } = JSON.parse(e.data);
      if (text) {
        setLines(prev => [...prev, {
          id: crypto.randomUUID(),
          speaker: speaker || "System",
          text: String(text)
        }]);
      }
    });

    // Handle synthesis
    es.addEventListener("synth", (e) => {
      const data = JSON.parse(e.data);
      // Handle synthesis display
      console.log("Synthesis:", data);
    });

    // Handle errors
    es.addEventListener("error", (e) => {
      console.error("EventSource error:", e);
      // EventSource will auto-reconnect unless we close it
    });

    // Handle completion
    es.addEventListener("done", () => {
      es.close();
    });

    // EventSource error handler (connection errors)
    es.onerror = (error) => {
      console.error("EventSource connection error:", error);
      // Browser will auto-retry connection
    };

    // Cleanup
    return () => {
      es.close();
    };
  }, [prompt, topK]);

  return (
    <div className="debate-stream">
      {scene && (
        <div className="scene-indicator">
          {scene === "rollcall" && "🟣 Roll call…"}
          {scene === "openings" && "🎭 Opening statements…"}
          {scene === "crossfire" && "⚔️ Crossfire…"}
          {scene === "synthesis" && "📋 Synthesis…"}
        </div>
      )}
      
      {lines.map(line => (
        <TypeLine
          key={line.id}
          label={line.speaker}
          text={line.text}
          color={COLORS[line.speaker] || COLORS.default}
        />
      ))}
    </div>
  );
}

// ============================================
// EventSource vs ssePost Comparison
// ============================================

/*
When to use EventSource (GET):
- Simple, read-only streams
- Want automatic reconnection
- Limited parameters (can fit in URL)
- Public/cacheable endpoints

When to use ssePost (POST):
- Complex request payloads
- Authentication tokens in body
- Large prompts or configurations  
- Private/non-cacheable data
- Need to send arrays or objects

Your implementation cleverly combines both:
- GET endpoint for EventSource compatibility
- Reuses POST handler logic
- Best of both worlds!
*/