import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Send, Check } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useCandyToast } from "../components/ui/SenseiCandy";
import { Skeleton } from "../components/ui/Skeleton";
import { useChime } from "../components/ui/useChime";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// --- 12 PhDs with full credentials ---
const PHDS = [
  { 
    name: "Strategy", 
    title: "Chief Marketing Officer", 
    degree: "PhD Marketing Strategy", 
    institution: "Wharton", 
    specialty: "Market orchestration, Resource allocation", 
    color: "from-violet-500/30 to-sky-500/30" 
  },
  { 
    name: "Emotion", 
    title: "Consumer Psychology", 
    degree: "PhD Behavioral Economics", 
    institution: "Stanford", 
    specialty: "Emotional triggers, Decision architecture", 
    color: "from-rose-500/30 to-fuchsia-500/30" 
  },
  { 
    name: "Pattern", 
    title: "Data Science Lead", 
    degree: "PhD Machine Learning", 
    institution: "MIT", 
    specialty: "Predictive modeling, Anomaly detection", 
    color: "from-sky-500/30 to-cyan-500/30" 
  },
  { 
    name: "Identity", 
    title: "CDP Architect", 
    degree: "PhD Information Systems", 
    institution: "Carnegie Mellon", 
    specialty: "Identity resolution, Data unification", 
    color: "from-emerald-500/30 to-teal-500/30" 
  },
  { 
    name: "Chaos", 
    title: "Creative Mutation", 
    degree: "PhD Cognitive Science", 
    institution: "Berkeley", 
    specialty: "Creative optimization, A/B evolution", 
    color: "from-amber-500/30 to-rose-500/30" 
  },
  { 
    name: "ROI", 
    title: "Budget Optimization", 
    degree: "PhD Financial Engineering", 
    institution: "Chicago Booth", 
    specialty: "Budget optimization, ROI modeling", 
    color: "from-lime-500/30 to-emerald-500/30" 
  },
  { 
    name: "Warfare", 
    title: "Competitive Intel", 
    degree: "PhD Strategic Management", 
    institution: "INSEAD", 
    specialty: "Competitive intelligence, Market dynamics", 
    color: "from-red-500/30 to-rose-500/30" 
  },
  { 
    name: "Omni", 
    title: "Channel Optimizer", 
    degree: "PhD Media Studies", 
    institution: "Northwestern", 
    specialty: "Channel optimization, Cross-platform", 
    color: "from-indigo-500/30 to-violet-500/30" 
  },
  { 
    name: "First", 
    title: "Onboarding Intelligence", 
    degree: "PhD User Experience", 
    institution: "Michigan", 
    specialty: "Onboarding optimization, Activation", 
    color: "from-fuchsia-500/30 to-indigo-500/30" 
  },
  { 
    name: "Truth", 
    title: "Attribution Science", 
    degree: "PhD Statistical Analysis", 
    institution: "Harvard", 
    specialty: "Attribution science, Causality analysis", 
    color: "from-slate-500/30 to-blue-500/30" 
  },
  { 
    name: "Brutal", 
    title: "Shop Intelligence", 
    degree: "PhD Philosophy of Mind", 
    institution: "Oxford", 
    specialty: "Reality checks, Strategic philosophy", 
    color: "from-neutral-500/30 to-red-500/30" 
  },
  { 
    name: "Context", 
    title: "Business Intelligence", 
    degree: "PhD Business Administration", 
    institution: "London Business School", 
    specialty: "Business context, Market alignment", 
    color: "from-slate-500/30 to-zinc-500/30" 
  },
];

// Simple POST wrapper with rate limit handling
async function askAgent(question: string, agent: string, context?: any) {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      // Include user/plan headers for now (until Clerk JWT is fully wired)
      ...(typeof window !== "undefined" && window.localStorage.getItem("user_id") 
        ? { 
            "X-User-Id": window.localStorage.getItem("user_id") || "",
            "X-Plan": window.localStorage.getItem("user_plan") || "free"
          } 
        : {})
    },
    body: JSON.stringify({ question, agent, context }),
  });
  
  // Handle rate limiting and payment required
  if (res.status === 402) {
    const error = await res.json();
    throw new Error(`UPGRADE_REQUIRED: ${error.detail || "Monthly quota reached. Please upgrade your plan."}`);
  }
  if (res.status === 429) {
    const error = await res.json();
    throw new Error(`RATE_LIMITED: ${error.detail || "Too many requests. Please wait a moment."}`);
  }
  if (!res.ok) {
    const errorText = await res.text();
    console.error("API error:", errorText);
    throw new Error(`Request failed: ${res.statusText}`);
  }
  
  return (await res.json()) as {
    decision: boolean;
    confidence: number;
    agent: string;
    why: any;
  };
}

// PhD Card Component
const PhDCard: React.FC<{
  phd: typeof PHDS[0];
  active: boolean;
  onClick: () => void;
}> = ({ phd, active, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative overflow-hidden rounded-2xl border p-4 text-left transition-all
        ${active 
          ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/20' 
          : 'border-white/10 bg-white/5 hover:bg-white/10'
        }
      `}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${phd.color} opacity-20`} />
      
      <div className="relative z-10">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-white">{phd.name}</h3>
            <p className="text-xs text-white/60">{phd.title}</p>
          </div>
          {active && <Check className="h-5 w-5 text-violet-400" />}
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="text-white/80">{phd.degree}</div>
          <div className="text-violet-300">{phd.institution}</div>
          <div className="mt-2 text-white/60">{phd.specialty}</div>
        </div>
      </div>
    </motion.button>
  );
};

// Confidence Ring Component
const ConfidenceRing: React.FC<{ value: number; decision: boolean }> = ({ value, decision }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative h-28 w-28">
      <svg className="h-28 w-28 -rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-white/10"
        />
        <motion.circle
          cx="56"
          cy="56"
          r={radius}
          stroke="url(#gradient)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={decision ? "#10b981" : "#ef4444"} />
            <stop offset="100%" stopColor={decision ? "#06b6d4" : "#f97316"} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-white">{value}%</div>
        <div className={`text-xs font-medium ${decision ? 'text-emerald-400' : 'text-red-400'}`}>
          {decision ? 'YES' : 'NO'}
        </div>
      </div>
    </div>
  );
};

const Ask: React.FC = () => {
  const [q, setQ] = useState("");
  const [agent, setAgent] = useState(PHDS[0]);
  const [ans, setAns] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { push: showToast } = useCandyToast();
  const chime = useChime();

  const examples = useMemo(() => [
    "Should we launch before Black Friday?",
    "Is our pricing strategy optimal for enterprise?",
    "Will this campaign resonate with Gen Z?",
  ], []);

  const disabled = loading || q.trim().length < 3;

  async function onAsk() {
    if (disabled) return;

    setLoading(true);
    setAns(null);

    try {
      const result = await askAgent(q, agent.name);
      setAns(result);
      
      if (result.decision) {
        chime.go();
        showToast({ kind: "success", msg: `${agent.name} says YES with ${result.confidence}% confidence` });
      } else {
        chime.nope();
        showToast({ kind: "info", msg: `${agent.name} says NO with ${result.confidence}% confidence` });
      }
    } catch (error: any) {
      console.error("Ask error:", error);
      chime.nope();
      
      if (error.message?.includes('UPGRADE_REQUIRED')) {
        showToast({ kind: "error", msg: "Monthly quota reached. Please upgrade to continue." });
      } else if (error.message?.includes('RATE_LIMITED')) {
        showToast({ kind: "info", msg: "Too many requests. Please wait a moment." });
      } else {
        showToast({ kind: "error", msg: "Failed to get answer. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Neural Cathedral Background */}
      <div className="neural-bg" />
      
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-12">
          {/* Header */}
          <PageHeader 
            title="Ask the Collective"
            subtitle="Twelve PhDs. One answer with a Why."
          />

          {/* Main Grid */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* PhD Cards Grid - 2 columns */}
            <div className="lg:col-span-2">
              <h2 className="mb-4 text-lg font-bold text-white/90">Select PhD Expert</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PHDS.map((phd) => (
                  <PhDCard
                    key={phd.name}
                    phd={phd}
                    active={agent.name === phd.name}
                    onClick={() => setAgent(phd)}
                  />
                ))}
              </div>
            </div>

            {/* Question & Answer Panel - 1 column */}
            <div className="space-y-6">
              {/* Answer Panel - moved to top */}
              <div className="glass-card relative overflow-hidden p-6 min-h-[360px]">
                {/* Ambient glow */}
                <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-br from-violet-500/20 to-sky-500/20 opacity-10 blur-2xl" />
                
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-28 w-28" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-12 w-full" />
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                    </div>
                  </div>
                ) : !ans ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-white/60">
                    <Brain className="mb-3 h-8 w-8 text-white/50" />
                    The faculty is ready…
                    <div className="mt-1 text-xs">Ask a question to begin the debate.</div>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={`${ans.agent}-${ans.decision}-${ans.confidence}`}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Decision header */}
                      <div className="flex items-center gap-4">
                        <ConfidenceRing value={ans.confidence} decision={ans.decision} />
                        <div className="min-w-0">
                          <div className="text-sm text-white/60">Agent</div>
                          <div className="text-xl font-bold">{ans.agent}</div>
                          <div className="text-sm text-white/70">
                            Decision: <span className={ans.decision ? "text-emerald-400" : "text-red-400"}>
                              {ans.decision ? "YES" : "NO"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Why explanation */}
                      {ans.why && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="mt-6 space-y-4"
                        >
                          <div>
                            <h4 className="mb-2 text-sm font-bold text-white/90">Strategic Rationale</h4>
                            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                              <p className="text-sm text-white/80">{ans.why.reasoning}</p>
                            </div>
                          </div>
                          
                          {ans.why.factors && (
                            <div className="grid gap-2">
                              {ans.why.factors.map((factor: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                                  <div className={`h-2 w-2 rounded-full ${factor.impact > 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                  <span className="text-xs text-white/70">{factor.name}</span>
                                  <span className="ml-auto text-xs font-medium">{factor.weight}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="mt-3 text-xs text-white/60">
                            Model version: <span className="text-white">{ans.why.model_version}</span>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              {/* Question Input - moved to bottom */}
              <div className="glass-card p-5">
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Your question
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 ring-1 ring-white/5">
                  <Sparkles className="h-5 w-5 text-violet-300" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !disabled) onAsk();
                    }}
                    placeholder={examples[0]}
                    className="w-full bg-transparent outline-none placeholder:text-white/40"
                  />
                  <button
                    onClick={onAsk}
                    disabled={disabled}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      disabled
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : "bg-gradient-to-r from-violet-500 to-sky-500 shadow-lg shadow-violet-500/20 ring-1 ring-white/20"
                    }`}
                  >
                    {loading ? "Thinking…" : <>Ask <Send className="h-4 w-4" /></>}
                  </button>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setQ(ex)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                
                <div className="mt-2 text-[11px] text-white/50">
                  Tip: ⌘/Ctrl + Enter to ask
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ask;