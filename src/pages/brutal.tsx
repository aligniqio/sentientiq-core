import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Copy, Send, Zap } from 'lucide-react';
import { brutalMemory } from '../lib/brutalMemoryService';
import { brutalAnalyzer } from '../lib/brutalAnalysis';

const BrutalAnalysisPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState<string | null>(null);

  const analyzeSpam = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    try {
      // For now, use local analysis (would call backend API in production)
      const result = await brutalMemory.analyzePitchWithMemory(inputText, {
        // Extract sender info if available
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
    // Simple heuristic - look for "From:" or sign-off
    const nameMatch = text.match(/(?:From:|Regards,|Best,|Sincerely,)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    return nameMatch?.[1];
  };

  const copyResponse = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResponse(text);
    setTimeout(() => setCopiedResponse(null), 2000);
  };

  const generateBullshit = () => {
    const bs = brutalAnalyzer.generateBullshitInsight();
    setInputText(`Subject: Exclusive Opportunity for Forward-Thinking Leaders\n\nDear Decision Maker,\n\n${bs}\n\nOur proprietary AI-powered solution leverages cutting-edge blockchain synergies to deliver 10x ROI in just 30 days. We've helped companies like yours achieve:\n\n• 847% increase in conversion velocity\n• 92% reduction in customer acquisition costs\n• 100% success rate (guaranteed!)\n\nThis exclusive opportunity is only available to 3 companies this quarter. Reply "INTERESTED" within 24 hours to secure your spot.\n\nBest regards,\nChad Thunderstone\nCEO & Thought Leader\nDisruptive Innovations Inc.`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Neural Cathedral Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)`
          }} 
        />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 blur-xl opacity-50" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                <Brain className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Dr. Sage Brutal
              </h1>
              <p className="text-red-400">CMO • IQ 230 • Zero Filter • Memory: Enabled</p>
            </div>
          </div>
          <p className="text-white/60 max-w-2xl mx-auto">
            Paste your LinkedIn spam below. I'll tear it apart, expose their tactics, and give you the perfect response.
            {analysis?.senderProfile && (
              <span className="text-orange-400 block mt-2">
                Oh, and I remember everyone. This should be fun.
              </span>
            )}
          </p>
        </motion.div>

        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Spam Input</h2>
              <button
                onClick={generateBullshit}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm font-medium text-purple-300 transition-colors flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Generate Sample BS
              </button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste the spam message here..."
              className="w-full h-96 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-white/30 resize-none focus:outline-none focus:border-red-500/50"
            />
            <button
              onClick={analyzeSpam}
              disabled={loading || !inputText.trim()}
              className="mt-4 w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg font-medium text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          </motion.div>

          {/* Analysis Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {analysis ? (
              <div className="space-y-6">
                {/* Sender History */}
                {analysis.senderProfile && (
                  <div className="p-4 bg-orange-500/10 backdrop-blur-xl border border-orange-500/30 rounded-xl">
                    <h3 className="font-bold text-orange-400 mb-2">
                      🎯 Repeat Offender Detected
                    </h3>
                    <p className="text-sm text-white/80">
                      {analysis.senderProfile.name || 'Unknown Spammer'} from {analysis.senderProfile.company || 'Mystery Inc.'}
                    </p>
                    <p className="text-sm text-orange-300 mt-1">
                      Message #{analysis.senderProfile.totalMessages} • 
                      Average BS Score: {analysis.senderProfile.bullshitScoreAvg}%
                    </p>
                    {analysis.insideJoke && (
                      <p className="text-sm text-yellow-300 italic mt-2">
                        "{analysis.insideJoke}"
                      </p>
                    )}
                  </div>
                )}

                {/* Brutal Truth */}
                <div className="p-4 bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-xl">
                  <h3 className="font-bold text-red-400 mb-2">Brutal Truth</h3>
                  <p className="text-white/90">{analysis.personalizedRoast || analysis.analysis.brutalTruth}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-red-300">Sarcasm Level:</span>
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

                {/* Metrics */}
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

                {/* Tactics Detected */}
                <div className="p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                  <h3 className="font-bold text-white/80 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Manipulation Tactics Detected
                  </h3>
                  <div className="space-y-2">
                    {analysis.analysis.tactics.map((tactic: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        <div>
                          <span className="text-sm text-white/90">{tactic.name}</span>
                          {tactic.example && (
                            <p className="text-xs text-white/50 italic">"{tactic.example}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exposed Algorithm */}
                <div className="p-4 bg-black/50 backdrop-blur-xl border border-purple-500/30 rounded-xl">
                  <h3 className="font-bold text-purple-400 mb-2">Their Algorithm Exposed</h3>
                  <pre className="text-xs text-green-400 font-mono overflow-x-auto">
                    {analysis.analysis.exposedFunction}
                  </pre>
                </div>

                {/* Response Suggestions */}
                <div className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-xl border border-orange-500/30 rounded-xl">
                  <h3 className="font-bold text-orange-400 mb-3">Suggested Responses</h3>
                  <div className="space-y-2">
                    {brutalMemory.generateResponseSuggestions(
                      analysis.senderProfile,
                      analysis.analysis
                    ).map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => copyResponse(suggestion)}
                        className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 transition-colors group"
                      >
                        <div className="flex justify-between items-start">
                          <span>{suggestion}</span>
                          <Copy className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                            copiedResponse === suggestion ? 'text-green-400' : 'text-white/40'
                          }`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                <div className="p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-xl border border-red-500/30 rounded-xl">
                  <h3 className="font-bold text-red-400 mb-2">Dr. Brutal's Recommendation</h3>
                  <p className="text-white/90">{analysis.analysis.recommendation}</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-white/40">
                  <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Paste spam to begin analysis</p>
                  <p className="text-xs mt-2">I remember everyone. Try me.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BrutalAnalysisPage;