// DebateStage.tsx - The theatrical debate UI
import { useEffect, useRef, useState } from "react";
import { TypeLine } from "./TypeLine";
import { motion, AnimatePresence } from "framer-motion";

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
  Chaos: "#fbbf24",
  Moderator: "#9333ea"
};

type Line = { 
  speaker: string; 
  text: string; 
  id: string;
  scene?: string;
};

type DebateStageProps = {
  stream: EventSource | null;
  onComplete?: (brief: any) => void;
};

export default function DebateStage({ stream, onComplete }: DebateStageProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [currentScene, setCurrentScene] = useState<string>("");
  const [rollCall, setRollCall] = useState<string>("");
  const [synthesis, setSynthesis] = useState<any>(null);
  const buf = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!stream) return;

    const onScene = (e: MessageEvent) => {
      const { step } = JSON.parse(e.data);
      setCurrentScene(step);
      
      if (step === 'rollcall') {
        // Animate roll call
        const names = Object.keys(COLORS).join(', Dr. ');
        setRollCall(`Roll call: Dr. ${names}`);
      }
    };

    const onDelta = (e: MessageEvent) => {
      const { speaker, label, text } = JSON.parse(e.data);
      const who = speaker || label || "Unknown";
      
      // Buffer text for this speaker
      buf.current[who] = (buf.current[who] || "") + text;
      
      // Push completed sentences to UI when we see punctuation
      const last = buf.current[who];
      const match = last.match(/^([\s\S]*?[\.!?])(\s|$)/);
      
      if (match) {
        setLines(ls => [...ls, { 
          speaker: who, 
          text: match[1], 
          id: crypto.randomUUID(),
          scene: currentScene
        }]);
        buf.current[who] = last.slice(match[1].length);
      }
    };

    const onTurn = (e: MessageEvent) => {
      const { speaker, end } = JSON.parse(e.data);
      
      if (end && buf.current[speaker]?.trim()) {
        // Flush remaining text for this speaker
        setLines(ls => [...ls, { 
          speaker, 
          text: buf.current[speaker], 
          id: crypto.randomUUID(),
          scene: currentScene
        }]);
        buf.current[speaker] = "";
      }
    };

    const onSynth = (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setSynthesis(data);
      if (onComplete) onComplete(data);
    };

    stream.addEventListener("scene", onScene);
    stream.addEventListener("delta", onDelta);
    stream.addEventListener("turn", onTurn);
    stream.addEventListener("synth", onSynth);

    return () => {
      stream.removeEventListener("scene", onScene);
      stream.removeEventListener("delta", onDelta);
      stream.removeEventListener("turn", onTurn);
      stream.removeEventListener("synth", onSynth);
    };
  }, [stream, currentScene, onComplete]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Roll Call Banner */}
      <AnimatePresence>
        {rollCall && currentScene === 'rollcall' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-8 text-center"
          >
            <div className="text-sm text-white/50 font-mono">
              {rollCall}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene Indicator */}
      {currentScene && currentScene !== 'rollcall' && (
        <div className="mb-4 text-xs uppercase tracking-wider text-white/30">
          {currentScene === 'opening' && '— Opening Statements —'}
          {currentScene === 'crossfire' && '— Crossfire —'}
          {currentScene === 'synthesis' && '— Executive Synthesis —'}
        </div>
      )}

      {/* Debate Lines */}
      <div className="space-y-1">
        {lines.map((l, idx) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <TypeLine 
              label={`Dr. ${l.speaker}`} 
              color={COLORS[l.speaker] || "#e5e7eb"} 
              text={l.text}
              speed={l.scene === 'crossfire' ? 20 : 28} // Faster for crossfire
            />
          </motion.div>
        ))}
      </div>

      {/* Final Synthesis Card */}
      {synthesis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10"
        >
          <h3 className="text-lg font-bold text-amber-400 mb-4">
            Executive Brief
          </h3>
          
          <div className="space-y-3">
            {synthesis.bullets?.map((bullet: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span className="text-white/90">{bullet}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-all">
              📧 Email Brief
            </button>
            <button className="px-4 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-all">
              💾 Save to Library
            </button>
          </div>

          {/* Provenance chip */}
          <div className="mt-4 text-xs text-white/30">
            anthropic · claude-3-5-sonnet · {new Date().toISOString()}
          </div>
        </motion.div>
      )}
    </div>
  );
}