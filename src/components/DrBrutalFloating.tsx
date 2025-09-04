import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Send, AlertTriangle, Copy } from 'lucide-react';
import { brutalMemory } from '../lib/brutalMemoryService';

const DrBrutalFloating: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Show greeting after 30 seconds if user hasn't interacted
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasInteracted) {
        // Just pulse the bubble to get attention
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [hasInteracted]);

  const analyzeSpam = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    try {
      const result = await brutalMemory.analyzePitchWithMemory(inputText, {
        email: extractEmail(inputText),
        name: extractName(inputText)
      });
      
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractEmail = (text: string): string | undefined => {
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    return emailMatch?.[0];
  };

  const extractName = (text: string): string | undefined => {
    const nameMatch = text.match(/(?:From:|Regards,|Best,|Sincerely,)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    return nameMatch?.[1];
  };

  const copyResponse = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResponse(text);
    setTimeout(() => setCopiedResponse(null), 2000);
  };

  return (
    <>
      {/* Floating Bubble */}
      <motion.button
        onClick={() => {
          setIsOpen(true);
          setHasInteracted(true);
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 z-40 group"
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-red-500 blur-2xl opacity-30 group-hover:opacity-50 transition-opacity" />
          
          {/* Glass bubble */}
          <div className="relative w-14 h-14 backdrop-blur-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/20">
            <Brain className="w-7 h-7 text-white" />
          </div>
          
          {/* Status indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-full animate-pulse" />
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Dr. Brutal • Spam Analyzer
          </div>
        </div>
      </motion.button>

      {/* Luxe Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[800px] max-w-[90vw] z-50"
            >
              <div className="h-full backdrop-blur-2xl bg-black/80 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/10 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500 blur-xl opacity-50" />
                        <div className="relative w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
                          <Brain className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Dr. Sage Brutal</h2>
                        <p className="text-xs text-red-400">CMO • IQ 230 • Zero Filter • Memory Enabled</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-white/60" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {!analysis ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Paste the spam here. Real spam only. No generated bullshit.
                        </label>
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="LinkedIn outreach, cold emails, 'personalized' templates..."
                          className="w-full h-48 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-white/30 resize-none focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                      <button
                        onClick={analyzeSpam}
                        disabled={loading || !inputText.trim()}
                        className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg font-medium text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <span className="animate-pulse">Analyzing...</span>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Expose the Bullshit
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Analysis Results */}
                      {analysis.senderProfile && (
                        <div className="p-4 bg-orange-500/10 backdrop-blur-xl border border-orange-500/30 rounded-xl">
                          <h3 className="font-bold text-orange-400 mb-2">
                            🎯 Repeat Offender #{analysis.senderProfile.totalMessages}
                          </h3>
                          <p className="text-sm text-white/80">
                            {analysis.senderProfile.name || 'Unknown'} from {analysis.senderProfile.company || 'Mystery Inc.'}
                          </p>
                          {analysis.insideJoke && (
                            <p className="text-sm text-yellow-300 italic mt-2">
                              "{analysis.insideJoke}"
                            </p>
                          )}
                        </div>
                      )}

                      <div className="p-4 bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-xl">
                        <h3 className="font-bold text-red-400 mb-2">The Brutal Truth</h3>
                        <p className="text-white/90">{analysis.personalizedRoast || analysis.analysis.brutalTruth}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs text-red-300">Sarcasm:</span>
                          <div className="flex gap-1">
                            {[...Array(10)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < analysis.sarcasmLevel 
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                                    : 'bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg">
                          <span className="text-xs text-white/60">Authenticity</span>
                          <p className="text-2xl font-bold text-red-400">
                            {analysis.analysis.metrics.authenticityScore}%
                          </p>
                        </div>
                        <div className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg">
                          <span className="text-xs text-white/60">Manipulation</span>
                          <p className="text-2xl font-bold text-orange-400">
                            {analysis.analysis.metrics.manipulationScore}%
                          </p>
                        </div>
                      </div>

                      {analysis.analysis.tactics.length > 0 && (
                        <div className="p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                          <h3 className="font-bold text-white/80 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            Tactics Exposed
                          </h3>
                          <div className="space-y-1">
                            {analysis.analysis.tactics.slice(0, 3).map((tactic: any, i: number) => (
                              <div key={i} className="text-sm text-white/70">
                                • {tactic.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-xl border border-orange-500/30 rounded-xl">
                        <h3 className="font-bold text-orange-400 mb-3">Copy a Response</h3>
                        <div className="space-y-2">
                          {brutalMemory.generateResponseSuggestions(
                            analysis.senderProfile,
                            analysis.analysis
                          ).slice(0, 3).map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => copyResponse(suggestion)}
                              className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 transition-colors flex justify-between items-center group"
                            >
                              <span className="flex-1 pr-2">{suggestion}</span>
                              <Copy className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                                copiedResponse === suggestion ? 'text-green-400' : 'text-white/40'
                              }`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setAnalysis(null);
                          setInputText('');
                        }}
                        className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white transition-colors"
                      >
                        Analyze Another
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default DrBrutalFloating;