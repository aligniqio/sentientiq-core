import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Trash2, Send, Search, Brain } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const API_BASE = import.meta.env.VITE_SAGE_API_URL || 'http://localhost:8004';

interface SageAnalysis {
  bullshit_score: number;
  manipulation_tactics: string[];
  emotional_pattern: string;
  hidden_agenda: string;
  authentic_elements?: string[];
  recommendation: 'DELETE' | 'RESPOND' | 'INVESTIGATE';
  suggested_response?: string;
  reasoning: string;
  confidence: number;
  pattern_detected?: boolean;
  pattern_note?: string;
  similar_messages?: Array<{
    sender: string;
    bullshit_score: number;
    similarity: number;
  }>;
}

const SageInbox: React.FC = () => {
  const [message, setMessage] = useState('');
  const [sender, setSender] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SageAnalysis | null>(null);
  const [showTransparency, setShowTransparency] = useState(false);

  const analyzeMessage = async () => {
    if (!message.trim()) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE}/api/sage/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sender,
          platform: 'linkedin',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Sage analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getBullshitColor = (score: number) => {
    if (score > 0.8) return 'from-red-500 to-red-700';
    if (score > 0.5) return 'from-yellow-500 to-orange-600';
    return 'from-green-500 to-emerald-600';
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'DELETE':
        return <Trash2 className="h-5 w-5" />;
      case 'RESPOND':
        return <Send className="h-5 w-5" />;
      case 'INVESTIGATE':
        return <Search className="h-5 w-5" />;
      default:
        return null;
    }
  };

  // Sample spam messages for testing
  const sampleMessages = [
    {
      sender: "Kavita Varshney",
      message: "Hi! You've been selected as a great fit for our Excellence Award. Let's schedule a screening call to discuss the steps for becoming an honoree. Here's my calendar link..."
    },
    {
      sender: "Murali Mohan",
      message: "Hey, I noticed we share mutual connections including Collin Davis. Since you lead SentientIQ, I thought you might be interested in ways to reduce development costs..."
    },
    {
      sender: "Conference Organizer",
      message: "Congratulations! You've been nominated as a thought leader in your industry. We'd love to offer you a speaking opportunity at our exclusive event in Las Vegas..."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <PageHeader 
        title="Sage: Inbox Protector" 
        subtitle="Brutally honest analysis of your messages"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Brain className="h-8 w-8 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Analyze Message</h2>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Sender name (optional)"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <textarea
              placeholder="Paste the message you want Sage to analyze..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />

            <div className="flex gap-4">
              <button
                onClick={analyzeMessage}
                disabled={isAnalyzing || !message.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Analyzing...
                  </span>
                ) : (
                  'Analyze with Sage'
                )}
              </button>

              <button
                onClick={() => setShowTransparency(!showTransparency)}
                className="px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all"
              >
                <Shield className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sample Messages */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/60 text-sm mb-3">Try a sample message:</p>
            <div className="flex flex-wrap gap-2">
              {sampleMessages.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMessage(sample.message);
                    setSender(sample.sender);
                  }}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm hover:bg-white/10 transition-all"
                >
                  {sample.sender}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Transparency Panel */}
        <AnimatePresence>
          {showTransparency && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-green-900/20 backdrop-blur-xl rounded-2xl border border-green-500/20 p-6 mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-green-400">Full Transparency</h3>
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <p>• Sage uses Claude 3.5 Sonnet with a specific personality prompt</p>
                <p>• All analyses are stored with embeddings for pattern detection</p>
                <p>• Similar messages are found using pgvector similarity search</p>
                <p>• No Math.random(), no black boxes - just real AI analysis</p>
                <p>• You can see the exact prompt and reasoning for every decision</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Bullshit Score */}
              <div className={`bg-gradient-to-r ${getBullshitColor(analysis.bullshit_score)} p-1 rounded-2xl`}>
                <div className="bg-gray-900 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Bullshit Score</h3>
                    <div className="text-3xl font-bold text-white">
                      {(analysis.bullshit_score * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${analysis.bullshit_score * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r ${getBullshitColor(analysis.bullshit_score)}`}
                    />
                  </div>
                </div>
              </div>

              {/* Pattern Detection */}
              {analysis.pattern_detected && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-yellow-900/20 backdrop-blur-xl rounded-2xl border border-yellow-500/20 p-6"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-yellow-400">Pattern Detected</h3>
                  </div>
                  <p className="text-white/80">{analysis.pattern_note}</p>
                </motion.div>
              )}

              {/* Recommendation */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Recommendation</h3>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    analysis.recommendation === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                    analysis.recommendation === 'RESPOND' ? 'bg-green-500/20 text-green-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {getRecommendationIcon(analysis.recommendation)}
                    <span className="font-medium">{analysis.recommendation}</span>
                  </div>
                </div>
                <p className="text-white/70">{analysis.reasoning}</p>
              </div>

              {/* Manipulation Tactics */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Manipulation Tactics Detected</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.manipulation_tactics.map((tactic, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-sm"
                    >
                      {tactic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hidden Agenda & Emotional Pattern */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Hidden Agenda</h3>
                  <p className="text-white/70">{analysis.hidden_agenda}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Emotional Pattern</h3>
                  <p className="text-white/70">{analysis.emotional_pattern}</p>
                </div>
              </div>

              {/* Suggested Response */}
              {analysis.suggested_response && (
                <div className="bg-green-900/20 backdrop-blur-xl rounded-2xl border border-green-500/20 p-6">
                  <h3 className="text-lg font-semibold text-green-400 mb-3">Suggested Response</h3>
                  <p className="text-white/80 italic">"{analysis.suggested_response}"</p>
                </div>
              )}

              {/* Similar Messages */}
              {analysis.similar_messages && analysis.similar_messages.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Similar Messages Found</h3>
                  <div className="space-y-2">
                    {analysis.similar_messages.slice(0, 3).map((msg, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5">
                        <span className="text-white/70">{msg.sender}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-white/50 text-sm">
                            {(msg.similarity * 100).toFixed(0)}% similar
                          </span>
                          <span className="text-red-400 text-sm">
                            BS: {(msg.bullshit_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SageInbox;