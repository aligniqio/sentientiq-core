import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle } from 'lucide-react';

interface BrutalAnalysis {
  domain: string;
  brutalTruth: string;
  score: number;
  redFlags: string[];
  opportunity: string;
}

const BrutalGreeting: React.FC = () => {
  const [analysis, setAnalysis] = useState<BrutalAnalysis | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Dr. Brutal analyzes everything instantly
    const domain = window.location.hostname;
    const referrer = document.referrer;
    
    // Simulate Dr. Brutal's instant analysis
    const brutalAnalysis: BrutalAnalysis = {
      domain,
      brutalTruth: generateBrutalTruth(domain, referrer),
      score: Math.floor(Math.random() * 40) + 30, // Brutal scores are harsh
      redFlags: [
        "Your conversion funnel leaks like a sieve",
        "Zero emotional resonance in your messaging",
        "Competing on features, not feelings",
        "No coherent value narrative"
      ].slice(0, Math.floor(Math.random() * 3) + 2),
      opportunity: "Stop asking 'should we launch?' Start asking 'why would anyone care?'"
    };
    
    setAnalysis(brutalAnalysis);
  }, []);

  function generateBrutalTruth(domain: string, referrer: string): string {
    const truths = [
      "Your marketing is failing. I can see it in your URL structure. Let me show you why.",
      "You're asking the wrong questions. Here's what you should be worried about.",
      "That email template you're using? Everyone knows it's GPT-4. Try harder.",
      "Your competitors are eating your lunch while you debate button colors.",
      "You think you have product-market fit. You have product-hope fit.",
      "Your 'data-driven' decisions are just expensive ways to confirm biases.",
      "The reason your campaigns fail? You're solving problems nobody has."
    ];
    
    // Pick a brutal truth based on some "analysis"
    const index = (domain.length + (referrer?.length || 0)) % truths.length;
    return truths[index];
  }

  if (dismissed || !analysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed bottom-8 right-8 max-w-md z-50"
    >
      <div className="backdrop-blur-xl bg-black/90 border border-red-500/30 rounded-2xl p-6 shadow-2xl shadow-red-500/20">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 blur-xl opacity-50" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white">Dr. Sage Brutal</h3>
              <p className="text-xs text-red-400">CMO • IQ 230 • Zero Filter</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/40 hover:text-white/60 text-sm"
          >
            ×
          </button>
        </div>

        {/* Brutal Truth */}
        <div className="mb-4">
          <p className="text-sm text-white/90 leading-relaxed">
            {analysis.brutalTruth}
          </p>
        </div>

        {/* Score */}
        <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60">Marketing Effectiveness</span>
            <span className="text-lg font-bold text-red-400">{analysis.score}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${analysis.score}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
            />
          </div>
        </div>

        {/* Red Flags */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-white/60 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            RED FLAGS DETECTED
          </h4>
          <div className="space-y-1">
            {analysis.redFlags.map((flag, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-xs text-red-300 flex items-start gap-1"
              >
                <span className="text-red-500">•</span>
                {flag}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Opportunity */}
        <div className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
          <p className="text-xs text-orange-300 italic">
            "{analysis.opportunity}"
          </p>
        </div>

        {/* CTA */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="flex-1 py-2 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs font-medium text-red-300 transition-colors"
          >
            I Can Handle Truth
          </button>
          <button
            onClick={() => {
              setDismissed(true);
              // Navigate to ask page if not there
              if (window.location.pathname !== '/') {
                window.location.href = '/';
              }
            }}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg text-xs font-medium text-white shadow-lg shadow-red-500/25"
          >
            Fix This Now
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BrutalGreeting;