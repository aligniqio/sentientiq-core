// useDebateStream.tsx
import * as React from "react";
import { ssePost } from "./ssePost";

export type Line = { id: string; speaker: string; text: string };

export function useDebateStream(url: string, body: any) {
  const [lines, setLines] = React.useState<Line[]>([]);
  const [scene, setScene] = React.useState<string>("");

  React.useEffect(() => {
    const stop = ssePost(url, body, {
      onScene: (d) => setScene(d?.step || ""),
      onDelta: (d) => {
        const who = d?.speaker || "System";
        const text = (d?.text ?? "").toString();
        if (!text) return;
        setLines((ls) => [...ls, { id: crypto.randomUUID(), speaker: who, text }]);
      },
    });
    return () => stop();
  }, [url, JSON.stringify(body)]);

  return { lines, scene };
}

// TypeLine.tsx
export function TypeLine({ label, color, text, speed=28 }:{
  label: string; color?: string; text: string; speed?: number;
}) {
  const [shown, setShown] = React.useState("");
  React.useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      if (i < text.length) setShown((s) => s + text[i++]);
      else clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <div className="mb-4 leading-relaxed">
      <span className="italic font-semibold mr-2" style={{ color }}>{label}:</span>
      <span className="whitespace-pre-wrap">{shown}</span>
    </div>
  );
}