// DebateStageWithEmail.tsx - Full integration with email button
import * as React from "react";
import { useDebateStream } from "./useDebateStream";
import { useDebateMeta } from "./useDebateMeta";
import { TypeLine } from "./useDebateStream";
import { SynthesisHeader } from "./SynthesisHeader";
import { EmailBriefButton } from "./EmailBriefButton";

const COLORS: Record<string,string> = {
  Emotion:"#b1107a", ROI:"#2b6cb0", Strategic:"#6b46c1", Pattern:"#16a34a",
  Identity:"#dd6b20", Truth:"#2d3748", Context:"#0ea5e9", First:"#a16207",
  Omni:"#0f766e", Brutal:"#b91c1c", Warfare:"#374151", Moderator:"#9333ea", System:"#9aa0a6"
};

export function DebateStageWithEmail({ 
  prompt, 
  topK=4,
  defaultEmail 
}:{
  prompt:string; 
  topK?:number;
  defaultEmail?: string | null;
}) {
  const { requestId, subject, onMeta } = useDebateMeta();
  const [showSynthesis, setShowSynthesis] = React.useState(false);
  const [synthData, setSynthData] = React.useState<any>(null);
  
  // Enhanced SSE hook with meta handler
  const { lines, scene } = useDebateStreamEnhanced("/api/sage/debate", { prompt, topK }, {
    onMeta,
    onSynth: (data: any) => {
      setShowSynthesis(true);
      setSynthData(data);
    }
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" style={{ position: 'relative' }}>
      {scene === "rollcall" && (
        <div className="mb-3 text-sm text-gray-400">🟣 Roll call…</div>
      )}
      
      {/* Main debate content */}
      <div style={{ marginBottom: showSynthesis ? '20px' : '0' }}>
        {lines.map(l => (
          <TypeLine 
            key={l.id} 
            label={l.speaker.startsWith("Dr ") ? l.speaker : `Dr ${l.speaker}`} 
            color={COLORS[l.speaker]} 
            text={l.text} 
          />
        ))}
      </div>
      
      {/* Synthesis section with email button */}
      {showSynthesis && (
        <div style={{
          borderTop: '2px solid #e5e7eb',
          paddingTop: '20px',
          marginTop: '20px'
        }}>
          <SynthesisHeader 
            requestId={requestId} 
            subject={prompt.slice(0, 120)} 
            defaultEmail={defaultEmail}
          />
          {synthData && (
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '16px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#9333ea', fontSize: '16px', fontWeight: '600' }}>
                Collective Synthesis
              </h3>
              <div style={{ color: '#374151', lineHeight: '1.6' }}>
                {synthData.summary || synthData.title}
              </div>
              {synthData.bullets && synthData.bullets.length > 0 && (
                <ul style={{ marginTop: '12px', paddingLeft: '20px' }}>
                  {synthData.bullets.map((bullet: string, i: number) => (
                    <li key={i} style={{ marginBottom: '4px', color: '#4b5563' }}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Floating email button (alternative placement - bottom right) */}
      {requestId && !showSynthesis && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
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

// Enhanced useDebateStream with additional handlers
function useDebateStreamEnhanced(url: string, body: any, handlers: any = {}) {
  const [lines, setLines] = React.useState<any[]>([]);
  const [scene, setScene] = React.useState<string>("");

  React.useEffect(() => {
    const { ssePost } = require("./ssePost");
    const stop = ssePost(url, body, {
      onScene: (d: any) => setScene(d?.step || ""),
      onDelta: (d: any) => {
        const who = d?.speaker || "System";
        const text = (d?.text ?? "").toString();
        if (!text) return;
        setLines((ls) => [...ls, { id: crypto.randomUUID(), speaker: who, text }]);
      },
      onMeta: handlers.onMeta,
      onSynth: handlers.onSynth,
    });
    return () => stop();
  }, [url, JSON.stringify(body)]);

  return { lines, scene };
}