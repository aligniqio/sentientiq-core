// DebateStreamComponent.tsx - Complete streaming debate component
import * as React from "react";
import { useState, useEffect } from "react";
import { ssePost } from "./ssePost";
import { EmailBriefButton } from "./EmailBriefButton";

// TypeLine component with typewriter effect
function TypeLine({ label, color, text, speed = 28 }: {
  label: string;
  color?: string;
  text: string;
  speed?: number;
}) {
  const [shown, setShown] = useState("");
  
  useEffect(() => {
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

// Speaker colors
const COLORS: Record<string, string> = {
  Emotion: "#b1107a",
  ROI: "#2b6cb0",
  Strategic: "#6b46c1",
  Pattern: "#16a34a",
  Identity: "#dd6b20",
  Truth: "#2d3748",
  Context: "#0ea5e9",
  First: "#a16207",
  Omni: "#0f766e",
  Brutal: "#b91c1c",
  Warfare: "#374151",
  Moderator: "#9333ea",
  System: "#9aa0a6"
};

// Main streaming debate component
export function DebateStreamComponent({ 
  prompt, 
  topK = 4,
  defaultEmail 
}: {
  prompt: string;
  topK?: number;
  defaultEmail?: string | null;
}) {
  const [lines, setLines] = useState<{ id: string; speaker: string; text: string }[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [scene, setScene] = useState<string>("");
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [synthData, setSynthData] = useState<any>(null);

  useEffect(() => {
    // Clear previous debate
    setLines([]);
    setRequestId(null);
    setScene("");
    setShowSynthesis(false);
    setSynthData(null);

    const stop = ssePost("/api/sage/debate", { prompt, topK }, {
      onEvent: (e) => {
        // Capture requestId from meta event
        if (e.event === "meta" && e.data?.requestId) {
          setRequestId(e.data.requestId);
        }
      },
      onScene: (d) => {
        setScene(d?.step || "");
      },
      onDelta: ({ speaker, text }) => {
        const who = speaker || "System"; // ← prevents "undefined: " prefix
        if (text) {
          setLines(ls => [...ls, { 
            id: crypto.randomUUID(), 
            speaker: who, 
            text: String(text) 
          }]);
        }
      },
      onSynth: (data) => {
        setShowSynthesis(true);
        setSynthData(data);
      },
      onError: (err) => {
        console.error("Debate stream error:", err);
        setLines(ls => [...ls, { 
          id: crypto.randomUUID(), 
          speaker: "System", 
          text: "Error: Unable to complete debate stream." 
        }]);
      }
    });

    return () => stop();
  }, [prompt, topK]);

  return (
    <div className="debate-container" style={{ 
      maxWidth: "48rem", 
      margin: "0 auto", 
      padding: "1.5rem 1rem",
      position: "relative" 
    }}>
      {/* Scene indicator */}
      {scene && (
        <div style={{ 
          marginBottom: "1rem", 
          fontSize: "0.875rem", 
          color: "#9ca3af",
          fontStyle: "italic"
        }}>
          {scene === "rollcall" && "🟣 Roll call…"}
          {scene === "openings" && "🎭 Opening statements…"}
          {scene === "crossfire" && "⚔️ Crossfire debate…"}
          {scene === "synthesis" && "📋 Synthesis…"}
        </div>
      )}

      {/* Debate lines with typewriter effect */}
      <div style={{ marginBottom: "2rem" }}>
        {lines.map((line) => (
          <TypeLine
            key={line.id}
            label={line.speaker === "Moderator" ? line.speaker : `Dr ${line.speaker}`}
            color={COLORS[line.speaker] || "#666"}
            text={line.text}
            speed={28}
          />
        ))}
      </div>

      {/* Synthesis section */}
      {showSynthesis && synthData && (
        <div style={{
          borderTop: "2px solid #e5e7eb",
          paddingTop: "1.5rem",
          marginTop: "1.5rem"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem"
          }}>
            <h3 style={{ 
              margin: 0,
              fontSize: "1.125rem",
              fontWeight: "600",
              color: "#9333ea"
            }}>
              Executive Brief
            </h3>
            <EmailBriefButton
              requestId={requestId}
              subject={prompt.slice(0, 120)}
              defaultEmail={defaultEmail}
            />
          </div>
          
          <div style={{
            backgroundColor: "#f9fafb",
            borderRadius: "0.5rem",
            padding: "1rem",
            marginTop: "0.75rem"
          }}>
            {synthData.summary && (
              <p style={{ 
                margin: "0 0 1rem 0",
                color: "#374151",
                lineHeight: 1.6 
              }}>
                {synthData.summary}
              </p>
            )}
            {synthData.bullets && synthData.bullets.length > 0 && (
              <ul style={{ 
                margin: 0,
                paddingLeft: "1.25rem",
                color: "#4b5563"
              }}>
                {synthData.bullets.map((bullet: string, i: number) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Floating email button (when no synthesis yet but requestId available) */}
      {requestId && !showSynthesis && (
        <div style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 100
        }}>
          <EmailBriefButton
            requestId={requestId}
            subject={prompt.slice(0, 120)}
            defaultEmail={defaultEmail}
          />
        </div>
      )}
    </div>
  );
}