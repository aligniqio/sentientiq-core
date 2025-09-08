// DebateStage.tsx
import React from 'react';
import { useDebateStream } from './useDebateStream';

// Simple TypeLine component
function TypeLine({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div style={{ marginBottom: '0.5rem', color }}>
      <strong>{label}:</strong> {text}
    </div>
  );
}

const COLORS: Record<string,string> = {
  Emotion:"#b1107a", ROI:"#2b6cb0", Strategic:"#6b46c1", Pattern:"#16a34a",
  Identity:"#dd6b20", Truth:"#2d3748", Context:"#0ea5e9", First:"#a16207",
  Omni:"#0f766e", Brutal:"#b91c1c", Warfare:"#374151", Moderator:"#9333ea", System:"#9aa0a6"
};

export function DebateStage({ prompt, topK=4 }:{prompt:string; topK?:number}) {
  const { lines, scene } = useDebateStream("/api/sage/debate", { prompt, topK });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {scene === "rollcall" && (
        <div className="mb-3 text-sm text-gray-400">🟣 Roll call…</div>
      )}
      {lines.map((l: any) => (
        <TypeLine key={l.id} label={l.speaker.startsWith("Dr ") ? l.speaker : `Dr ${l.speaker}`} color={COLORS[l.speaker]} text={l.text} />
      ))}
    </div>
  );
}