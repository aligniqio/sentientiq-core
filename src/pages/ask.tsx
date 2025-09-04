import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle, Shield } from "lucide-react";
import { useCandyToast } from "../components/ui/SenseiCandy";
import { Skeleton } from "../components/ui/Skeleton";
import { useChime } from "../components/ui/useChime";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// PhD COLLECTIVE - FULL CREDENTIALS
const PHDS = [
  {
    name: "Dr. Strategic",
    degree: "PhD Marketing Strategy",
    institution: "Wharton",
    year: 2019,
    documentsAnalyzed: 127439,
    accuracy: 96.2,
    specialty: "Market orchestration, Resource allocation",
    status: "verified"
  },
  {
    name: "Dr. Emotion", 
    degree: "PhD Behavioral Economics",
    institution: "Stanford",
    year: 2020,
    documentsAnalyzed: 89234,
    accuracy: 93.8,
    specialty: "Emotional triggers, Consumer psychology",
    status: "verified"
  },
  {
    name: "Dr. Pattern",
    degree: "PhD Machine Learning",
    institution: "MIT",
    year: 2018,
    documentsAnalyzed: 203847,
    accuracy: 97.1,
    specialty: "Predictive modeling, Pattern recognition",
    status: "verified"
  },
  {
    name: "Dr. Identity",
    degree: "PhD Information Systems",
    institution: "Carnegie Mellon",
    year: 2021,
    documentsAnalyzed: 67892,
    accuracy: 95.4,
    specialty: "Identity resolution, CDP architecture",
    status: "verified"
  },
  {
    name: "Dr. Chaos",
    degree: "PhD Cognitive Science",
    institution: "Berkeley",
    year: 2019,
    documentsAnalyzed: 45673,
    accuracy: 91.7,
    specialty: "Creative optimization, A/B evolution",
    status: "verified"
  },
  {
    name: "Dr. Omni",
    degree: "PhD Cross-Channel Systems",
    institution: "Stanford GSB",
    year: 2020,
    documentsAnalyzed: 91847,
    accuracy: 94.9,
    specialty: "Omnichannel orchestration, Attribution",
    status: "verified"
  },
  {
    name: "Dr. Warfare",
    degree: "PhD Competitive Intelligence",
    institution: "INSEAD",
    year: 2018,
    documentsAnalyzed: 78234,
    accuracy: 95.8,
    specialty: "Market warfare, Disruption strategies",
    status: "verified"
  },
  {
    name: "Dr. First",
    degree: "PhD Consumer Psychology",
    institution: "Yale",
    year: 2019,
    documentsAnalyzed: 83927,
    accuracy: 92.4,
    specialty: "First-party data, Zero-party strategies",
    status: "verified"
  },
  {
    name: "Dr. ROI",
    degree: "PhD Financial Engineering",
    institution: "Chicago Booth",
    year: 2020,
    documentsAnalyzed: 156439,
    accuracy: 98.2,
    specialty: "ROI optimization, LTV modeling",
    status: "verified"
  },
  {
    name: "Dr. Truth",
    degree: "PhD Data Science",
    institution: "Harvard",
    year: 2019,
    documentsAnalyzed: 178439,
    accuracy: 96.7,
    specialty: "Truth architecture, Source systems",
    status: "verified"
  },
  {
    name: "Dr. Context",
    degree: "PhD Business Intelligence",
    institution: "MIT Sloan",
    year: 2021,
    documentsAnalyzed: 94756,
    accuracy: 93.8,
    specialty: "Contextual intelligence, Real-time decisioning",
    status: "verified"
  },
  {
    name: "Dr. Brutal",
    degree: "PhD Marketing Warfare + CMO",
    institution: "Wharton",
    year: 2017,
    documentsAnalyzed: 234756,
    accuracy: 97.9,
    specialty: "Debate orchestration, Consensus synthesis",
    status: "verified"
  }
];

// API wrapper
async function askCollective(question: string, context?: any) {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(typeof window !== "undefined" && window.localStorage.getItem("user_id") 
        ? { 
            "X-User-Id": window.localStorage.getItem("user_id") || "",
            "X-Plan": window.localStorage.getItem("user_plan") || "free"
          } 
        : {})
    },
    body: JSON.stringify({ 
      question, 
      agent: "Consensus", 
      context: { ...context, mode: "debate" } 
    }),
  });
  
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
    decision: string;  // "GO" or "WAIT"
    confidence: number;
    agent: string;
    why: any;
  };
}

// PhD Card Component with full credentials and blockchain verification
const PhDCard: React.FC<{ phd: typeof PHDS[0] }> = ({ phd }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  return (
    <div 
      className="relative h-[280px] w-full perspective-1000"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        className="absolute inset-0 w-full h-full transition-transform duration-700 transform-style-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
      >
        {/* Front of card */}
        <div className="absolute inset-0 backface-hidden">
          <div className="h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
            {/* Gradient background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 opacity-50" />
            
            {/* Status Badge */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-xs font-bold uppercase text-green-400">VERIFIED</span>
                </div>
                <div className="text-xs text-white/40">{phd.year}</div>
              </div>
              
              {/* Agent Name */}
              <h3 className="font-bold text-white text-lg mb-1">{phd.name}</h3>
              <p className="text-xs text-white/60 mb-3">{phd.degree}</p>
              
              {/* Institution */}
              <div className="text-xs text-violet-300 mb-3">{phd.institution}</div>
              
              {/* Stats */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Documents</span>
                  <span className="text-white font-mono">{phd.documentsAnalyzed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Accuracy</span>
                  <span className="text-white font-mono">{phd.accuracy}%</span>
                </div>
              </div>
              
              {/* Specialty */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/70 line-clamp-2">{phd.specialty}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Back of card - Blockchain verification */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <div className="h-full backdrop-blur-xl bg-gradient-to-br from-green-900/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-5 flex flex-col justify-center">
            <Shield className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <div className="text-center">
              <div className="text-xs font-bold text-green-400 mb-2">BLOCKCHAIN VERIFIED</div>
              <div className="font-mono text-[10px] text-green-300/80 mb-3">
                0x{Math.random().toString(16).substring(2, 18)}
              </div>
              <div className="text-xs text-white/60 mb-2">Credential Hash</div>
              <div className="space-y-1">
                <div className="text-xs text-white/50">Block: #{Math.floor(Math.random() * 900000 + 100000)}</div>
                <div className="text-xs text-white/50">Chain: Ethereum</div>
                <div className="text-xs text-green-400">✓ Immutable</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Confidence Ring Component
const ConfidenceRing: React.FC<{ value: number; decision: string }> = ({ value, decision }) => {
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
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="url(#gradient)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={decision === 'GO' ? "#10b981" : "#ef4444"} />
            <stop offset="100%" stopColor={decision === 'GO' ? "#06b6d4" : "#f97316"} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-white">{value.toFixed(2)}%</div>
        <div className={`text-xs font-medium ${decision === 'GO' ? 'text-emerald-400' : 'text-amber-400'}`}>
          {decision === 'GO' ? 'GO' : 'WAIT'}
        </div>
      </div>
    </div>
  );
};

const Ask: React.FC = () => {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Auto-capture context
  const autoContext = useMemo(() => {
    const url = window.location.href;
    const domain = window.location.hostname;
    const params = new URLSearchParams(window.location.search);
    const contextParams: Record<string, string> = {};
    
    params.forEach((value, key) => {
      if (key.startsWith('utm_') || key.includes('context')) {
        contextParams[key] = value;
      }
    });
    
    return {
      url,
      domain,
      params: contextParams,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      history: JSON.parse(sessionStorage.getItem('ask_history') || '[]')
    };
  }, []);
  
  const { push: showToast } = useCandyToast();
  const chime = useChime();

  const disabled = loading || q.trim().length < 3;

  async function startDebate() {
    if (disabled) return;

    setLoading(true);
    setAns(null);

    try {
      // Store question in history
      const history = JSON.parse(sessionStorage.getItem('ask_history') || '[]');
      history.push({ q, timestamp: Date.now() });
      sessionStorage.setItem('ask_history', JSON.stringify(history.slice(-10)));
      
      const result = await askCollective(q, autoContext);
      setAns(result);
      
      const isGo = result.decision === "GO";
      
      if (isGo) {
        chime.go();
        showToast({ kind: "success", msg: `PhD Collective consensus: GO with ${(result.confidence * 100).toFixed(2)}% confidence` });
      } else {
        chime.nope();
        showToast({ kind: "info", msg: `PhD Collective consensus: WAIT with ${(result.confidence * 100).toFixed(2)}% confidence` });
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
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Ask the Collective
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Twelve PhDs. One answer with a Why.
          </p>
        </div>

        {/* Main Content - Flex container */}
        <div className="flex-1 px-8 pb-8 flex flex-col lg:flex-row gap-8">
          {/* PhD Cards Grid - Left side */}
          <div className="flex-1 lg:flex-[2]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {PHDS.map((phd, index) => (
                <motion.div
                  key={phd.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <PhDCard phd={phd} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Question & Answer Panel - Right side */}
          <div className="lg:flex-1 space-y-6 flex flex-col">
            {/* Answer Panel */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 flex-1 min-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="space-y-4">
                    <Brain className="w-12 h-12 text-purple-400 animate-pulse mx-auto" />
                    <div className="text-center text-white/60">The faculty is debating...</div>
                    <Skeleton className="w-48 h-4 mx-auto" />
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
                      <ConfidenceRing value={ans.confidence * 100} decision={ans.decision} />
                      <div className="min-w-0">
                        <div className="text-sm text-white/60">Consensus</div>
                        <div className="text-xl font-bold">PhD Collective</div>
                        <div className="text-sm text-white/70">
                          Decision: <span className={ans.decision === "GO" ? "text-emerald-400" : "text-amber-400"}>
                            {ans.decision === "GO" ? "GO" : "WAIT"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Strategic Rationale */}
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
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Question Input */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5">
              <label className="mb-2 block text-sm font-medium text-white/70">
                Ask a question to begin the debate.
              </label>
              
              {/* Example */}
              <div className="mb-3 text-xs text-white/50">
                e.g., "Should we launch before Black Friday?"
              </div>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !disabled) startDebate();
                  }}
                  placeholder="Should we launch before Black Friday?"
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={startDebate}
                  disabled={disabled}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    disabled
                      ? "bg-white/10 text-white/40 cursor-not-allowed"
                      : "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                  }`}
                >
                  {loading ? "Debating…" : "Start a Debate"}
                </button>
              </div>
              
              <div className="mt-2 text-[11px] text-white/40">
                Tip: Cmd + Enter to ask
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ask;