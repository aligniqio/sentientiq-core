import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, CheckCircle, XCircle, Loader2, Users } from 'lucide-react';
import { API_CONFIG } from '../config/api';

interface AgentAnalysis {
  agent: string;
  analysis: string;
  confidence: number;
  timestamp: string;
}

interface SwarmConsensus {
  agreement_level: number;
  key_insights: string[];
  disagreements: string[];
  confidence: number;
}

interface SwarmDecision {
  action: 'GO' | 'WAIT' | 'ABORT' | 'REVIEW' | 'NEED_MORE_DATA';
  confidence: number;
  reasoning: string;
}

interface SwarmResult {
  timestamp: string;
  analyses: AgentAnalysis[];
  consensus: SwarmConsensus;
  decision: SwarmDecision;
}

interface SwarmAnalysisPanelProps {
  post: {
    id: string;
    content: string;
    author: string;
    platform: string;
    url?: string;
  };
  onClose: () => void;
}

const AGENT_ICONS: Record<string, string> = {
  'Fraud Detective': '🕵️',
  'Emotion Analyst': '🎭',
  'Virality Predictor': '📈',
  'Authenticity Scorer': '✓',
  'Context Historian': '📚',
  'Risk Assessor': '⚠️',
  'Opportunity Spotter': '💡',
  'Bullshit Caller': '🚫',
  'Signal Extractor': '📡',
  'Consensus Builder': '🤝',
  "Devil's Advocate": '😈',
  'Truth Synthesizer': '⚖️'
};

const SwarmAnalysisPanel: React.FC<SwarmAnalysisPanelProps> = ({ post, onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SwarmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeWithSwarm = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.SWARM_API}/api/swarm/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: post.content,
          platform: post.platform,
          author: post.author,
          url: post.url || null,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze post');
    } finally {
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
    analyzeWithSwarm();
  }, []);

  const getDecisionColor = (action: string) => {
    switch (action) {
      case 'GO': return 'text-green-400 bg-green-500/10 ring-green-500/30';
      case 'ABORT': return 'text-red-400 bg-red-500/10 ring-red-500/30';
      case 'WAIT': return 'text-yellow-400 bg-yellow-500/10 ring-yellow-500/30';
      case 'REVIEW': return 'text-blue-400 bg-blue-500/10 ring-blue-500/30';
      default: return 'text-gray-400 bg-gray-500/10 ring-gray-500/30';
    }
  };

  const getConfidenceBar = (confidence: number) => {
    const width = Math.round(confidence * 100);
    const color = confidence > 0.7 ? 'bg-green-500' : confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            className={`h-full ${color}`}
          />
        </div>
        <span className="text-xs text-white/60">{width}%</span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto glass-card p-6 ring-2 ring-violet-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-violet-400" />
            12-Agent Swarm Analysis
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Post Content */}
        <div className="mb-6 p-4 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
            <span>{post.author}</span>
            <span>•</span>
            <span>{post.platform}</span>
          </div>
          <p className="text-sm text-white/80 line-clamp-3">{post.content}</p>
        </div>

        {isAnalyzing && !result && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin mb-4" />
            <p className="text-white/60">12 agents analyzing in parallel...</p>
            <p className="text-xs text-white/40 mt-2">No Math.random(). Just truth.</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 rounded-lg text-red-300 mb-6">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Decision */}
            <div className={`p-4 rounded-lg ring-1 ${getDecisionColor(result.decision.action)}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Swarm Decision: {result.decision.action}</h3>
                {getConfidenceBar(result.decision.confidence)}
              </div>
              <p className="text-sm text-white/80">{result.decision.reasoning}</p>
            </div>

            {/* Consensus */}
            <div className="glass-card p-4 ring-1 ring-white/10">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                <Users className="h-5 w-5 text-violet-400" />
                Swarm Consensus
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">Agreement Level:</span>
                  {getConfidenceBar(result.consensus.agreement_level)}
                </div>
                {result.consensus.key_insights.length > 0 && (
                  <div>
                    <span className="text-xs text-white/50">Key Insights:</span>
                    <ul className="mt-1 space-y-1">
                      {result.consensus.key_insights.map((insight, idx) => (
                        <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.consensus.disagreements.length > 0 && (
                  <div>
                    <span className="text-xs text-white/50">Disagreements:</span>
                    <ul className="mt-1 space-y-1">
                      {result.consensus.disagreements.map((disagreement, idx) => (
                        <li key={idx} className="text-sm text-yellow-400/80 flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                          {disagreement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Individual Agent Analyses */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Individual Agent Analyses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.analyses.map((analysis, idx) => (
                  <motion.div
                    key={analysis.agent}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card p-3 ring-1 ring-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <span>{AGENT_ICONS[analysis.agent] || '🤖'}</span>
                        {analysis.agent}
                      </span>
                      {getConfidenceBar(analysis.confidence)}
                    </div>
                    <p className="text-xs text-white/70 line-clamp-3">{analysis.analysis}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-white/40 text-center">
              Analysis completed: {new Date(result.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SwarmAnalysisPanel;