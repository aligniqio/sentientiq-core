import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  DollarSign,
  AlertOctagon,
  Check,
  Calculator,
  Siren
} from 'lucide-react';

// const API_BASE = import.meta.env.VITE_INTEL_API_URL as string | undefined;

interface RiskEvent {
  type: 'breach' | 'scandal' | 'regulation' | 'crisis' | 'competitor';
  severity: number;
  description: string;
  source: string;
  timestamp: Date;
}

interface InsuranceQuote {
  premium: number;
  coverage: number;
  riskScore: number;
  recommendation: 'proceed' | 'delay' | 'abort';
  events: RiskEvent[];
}

const DEMO_SCENARIOS = {
  hospital: {
    trigger: 'hospital',
    event: {
      type: 'breach' as const,
      severity: 94,
      description: 'MAJOR HIPAA BREACH: 4.2M patient records exposed at Regional Health System',
      source: 'Reuters, WSJ, trending #1 on Twitter',
      timestamp: new Date()
    }
  },
  crypto: {
    trigger: 'crypto',
    event: {
      type: 'scandal' as const,
      severity: 87,
      description: 'SEC INVESTIGATION: Major exchange under federal probe for fraud',
      source: 'Bloomberg Terminal, Reddit r/cryptocurrency meltdown',
      timestamp: new Date()
    }
  },
  ai: {
    trigger: 'ai',
    event: {
      type: 'regulation' as const,
      severity: 76,
      description: 'EU AI ACT: Emergency session on AI marketing ban',
      source: 'EU Commission, TechCrunch, Hacker News',
      timestamp: new Date()
    }
  }
};

const InsuranceCalculator: React.FC = () => {
  const [budget, setBudget] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [calculating, setCalculating] = useState(false);
  const [quote, setQuote] = useState<InsuranceQuote | null>(null);
  const [showDramaticReveal, setShowDramaticReveal] = useState(false);
  const [detectedEvent, setDetectedEvent] = useState<RiskEvent | null>(null);
  const [evi, setEvi] = useState(42); // Normal baseline

  // Simulate live EVI monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if (!detectedEvent) {
        // Normal fluctuation
        setEvi(prev => Math.max(20, Math.min(60, prev + (Math.random() - 0.5) * 5)));
      } else {
        // Spike during crisis
        setEvi(prev => Math.min(100, prev + 10));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [detectedEvent]);

  const calculateInsurance = async () => {
    setCalculating(true);
    setQuote(null);
    setDetectedEvent(null);
    setShowDramaticReveal(false);

    // Check for demo triggers
    const lowerCompany = company.toLowerCase();
    const lowerIndustry = industry.toLowerCase();
    
    let scenario: typeof DEMO_SCENARIOS[keyof typeof DEMO_SCENARIOS] | null = null;
    
    if (lowerCompany.includes('hospital') || lowerIndustry.includes('health')) {
      scenario = DEMO_SCENARIOS.hospital;
    } else if (lowerCompany.includes('crypto') || lowerIndustry.includes('blockchain')) {
      scenario = DEMO_SCENARIOS.crypto;
    } else if (lowerCompany.includes('ai') || lowerIndustry.includes('artificial')) {
      scenario = DEMO_SCENARIOS.ai;
    }

    // Simulate calculation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (scenario) {
      // DRAMATIC CRISIS DETECTION
      setDetectedEvent(scenario.event);
      
      // Wait for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, ''));
      
      setQuote({
        premium: budgetNum, // THE ENTIRE BUDGET
        coverage: budgetNum,
        riskScore: scenario.event.severity,
        recommendation: 'abort',
        events: [scenario.event]
      });
      
      setShowDramaticReveal(true);
    } else {
      // Normal scenario
      const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, ''));
      const riskScore = Math.floor(Math.random() * 30) + 20; // 20-50 normal range
      
      setQuote({
        premium: budgetNum * 0.03, // 3% premium for normal conditions
        coverage: budgetNum,
        riskScore,
        recommendation: 'proceed',
        events: []
      });
    }
    
    setCalculating(false);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 relative">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-black to-blue-950/20" />
        {detectedEvent && (
          <>
            <div className="absolute inset-0 bg-red-900/20 animate-pulse" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/20 rounded-full blur-3xl animate-ping" />
          </>
        )}
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-black mb-2">CAMPAIGN INSURANCE CALCULATOR</h1>
          <p className="text-xl text-gray-400">
            The first financial instrument for emotional markets. Hedge your marketing risk.
          </p>
        </motion.div>

        {/* Live EVI Monitor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 backdrop-blur-2xl bg-white/5 rounded-xl border border-white/10 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${evi > 70 ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
              <span className="text-sm text-gray-400">LIVE MARKET CONDITIONS</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Current EVI:</span>
              <span className={`text-2xl font-bold ${evi > 70 ? 'text-red-500' : evi > 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                {evi}
              </span>
              {evi > 70 && <Siren className="w-6 h-6 text-red-500 animate-bounce" />}
            </div>
          </div>
        </motion.div>

        {/* Calculator Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-8"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Calculator className="w-8 h-8" />
              Campaign Details
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Campaign Budget</label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="$500,000"
                  className="w-full p-4 rounded-xl bg-black/50 border border-white/20 text-2xl font-bold focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Company/Client</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., Regional Hospital Group"
                  className="w-full p-4 rounded-xl bg-black/50 border border-white/20 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Healthcare"
                  className="w-full p-4 rounded-xl bg-black/50 border border-white/20 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <button
                onClick={calculateInsurance}
                disabled={!budget || !company || calculating}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calculating ? 'CALCULATING RISK...' : 'CALCULATE INSURANCE'}
              </button>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-yellow-900/20 border border-yellow-900/50">
              <p className="text-sm">
                <strong>Try these scenarios:</strong><br/>
                • Company: "Regional Hospital Group" → HIPAA breach detection<br/>
                • Company: "CryptoTrade Exchange" → SEC investigation alert<br/>
                • Company: "AI Marketing Platform" → Regulation warning
              </p>
            </div>
          </motion.div>

          {/* Results Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-8"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Shield className="w-8 h-8" />
              Insurance Quote
            </h2>

            {!quote && !calculating && !detectedEvent && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <DollarSign className="w-24 h-24 text-gray-700 mb-4" />
                <p className="text-gray-400">
                  Enter your campaign details to calculate emotional risk insurance
                </p>
              </div>
            )}

            {calculating && !detectedEvent && (
              <div className="flex flex-col items-center justify-center h-full">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 border-4 border-purple-600 border-t-transparent rounded-full"
                />
                <p className="mt-4 text-gray-400">Analyzing market conditions...</p>
              </div>
            )}

            {/* CRISIS DETECTION ALERT */}
            <AnimatePresence>
              {detectedEvent && !quote && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="relative"
                  >
                    <AlertOctagon className="w-32 h-32 text-red-500" />
                    <motion.div
                      className="absolute inset-0 w-32 h-32 bg-red-500 rounded-full opacity-20"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-red-500 mt-6 mb-2">
                    CRITICAL RISK DETECTED
                  </h3>
                  <p className="text-lg text-gray-300 text-center px-4">
                    {detectedEvent.description}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Source: {detectedEvent.source}
                  </p>
                  <div className="mt-4 text-sm text-gray-400">
                    Calculating insurance premium...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quote Results */}
            <AnimatePresence>
              {quote && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: showDramaticReveal ? 0.5 : 0 }}
                >
                  {quote.recommendation === 'abort' ? (
                    // ABORT SCENARIO
                    <div className="space-y-6">
                      <motion.div
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center py-8"
                      >
                        <div className="text-6xl font-black text-red-500 mb-2">
                          ABORT MISSION
                        </div>
                        <p className="text-xl text-gray-300">
                          Insurance Premium Required:
                        </p>
                        <div className="text-5xl font-black text-red-400 mt-4">
                          {formatCurrency(quote.premium)}
                        </div>
                        <div className="text-lg text-red-300 mt-2">
                          YOUR ENTIRE BUDGET
                        </div>
                      </motion.div>

                      <div className="p-4 rounded-xl bg-red-900/30 border border-red-900/50">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                          <span className="font-bold text-red-400">CRITICAL RISK FACTORS</span>
                        </div>
                        {quote.events.map((event, i) => (
                          <div key={i} className="mt-2">
                            <p className="text-sm">{event.description}</p>
                            <p className="text-xs text-gray-400 mt-1">Severity: {event.severity}/100</p>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 rounded-xl bg-gray-900 border border-gray-700">
                        <p className="text-sm text-gray-300">
                          <strong>RECOMMENDATION:</strong> Delay campaign launch by minimum 30 days. 
                          Current market conditions guarantee catastrophic failure. 
                          This is not a suggestion. This is a mathematical certainty.
                        </p>
                      </div>

                      <div className="text-center pt-4">
                        <p className="text-2xl font-bold text-green-400">
                          Money Saved: {formatCurrency(quote.premium)}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          By NOT launching today
                        </p>
                      </div>
                    </div>
                  ) : (
                    // PROCEED SCENARIO
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          LOW RISK ENVIRONMENT
                        </div>
                        <p className="text-gray-400">
                          Favorable conditions for campaign launch
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-gray-900">
                          <p className="text-sm text-gray-400">Coverage</p>
                          <p className="text-2xl font-bold">{formatCurrency(quote.coverage)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-900">
                          <p className="text-sm text-gray-400">Premium (3%)</p>
                          <p className="text-2xl font-bold">{formatCurrency(quote.premium)}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-green-900/20 border border-green-900/50">
                        <p className="text-sm">
                          <strong>RECOMMENDATION:</strong> Proceed with launch. 
                          Current emotional market conditions are stable. 
                          Risk Score: {quote.riskScore}/100 (Normal range)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Call to Action */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-8 p-6 rounded-xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30"
                  >
                    <h3 className="text-lg font-bold mb-2">Want Real-Time Protection?</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Enterprise clients get 24/7 monitoring, instant alerts, and automated campaign pausing.
                    </p>
                    <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-sm hover:from-purple-700 hover:to-blue-700 transition-all">
                      Schedule Enterprise Demo
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Bottom Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">THE FUTURE OF MARKETING RISK</h3>
              <p className="text-gray-400">
                Just like currency hedging protects global operations, emotional hedging protects brand investments. 
                CMOs can finally sleep at night knowing their campaigns won't launch into a crisis.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black">NO MORE</div>
              <div className="text-3xl font-black text-red-400">GAMBLING</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InsuranceCalculator;