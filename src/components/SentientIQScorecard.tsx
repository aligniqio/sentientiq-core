/**
 * SentientIQ Scorecard - The Crystal Palace of Marketing Truth
 * 
 * No bullshit. No vanity metrics. Just cold, hard accountability.
 * Every recommendation we made. Every action you took. Every dollar you left behind.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Scorecard {
  tenant_id: string;
  total_recommendations: number;
  acted_on: number;
  ignored: number;
  action_rate: number;
  revenue_left_on_table: number;
  missed_conversions: number;
  response_time_avg: number;
  best_performing_action: string;
  worst_ignored_recommendation: string;
  accountability_score: number;
}

interface Recommendation {
  id: string;
  timestamp: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'viewed' | 'deployed' | 'ignored' | 'dismissed';
  potential_impact: {
    revenue: number;
    conversion_rate: number;
  };
}

export const SentientIQScorecard: React.FC = () => {
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showCancellationReport, setShowCancellationReport] = useState(false);
  const [cancellationReport, setCancellationReport] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchScorecard();
    fetchRecommendations();
  }, []);

  const fetchScorecard = async () => {
    try {
      const response = await fetch('/api/scorecard', {
        headers: {
          'x-tenant-id': localStorage.getItem('tenant_id') || 'default'
        }
      });
      const data = await response.json();
      setScorecard(data.scorecard);
    } catch (error) {
      console.error('Failed to fetch scorecard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/recommendations', {
        headers: {
          'x-tenant-id': localStorage.getItem('tenant_id') || 'default'
        }
      });
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    }
  };

  const handleCancellation = async () => {
    try {
      const response = await fetch('/api/cancellation-report', {
        headers: {
          'x-tenant-id': localStorage.getItem('tenant_id') || 'default'
        }
      });
      const data = await response.json();
      setCancellationReport(data.report);
      setShowCancellationReport(true);
    } catch (error) {
      console.error('Failed to generate cancellation report:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-400 to-emerald-600';
    if (score >= 60) return 'from-yellow-400 to-amber-600';
    if (score >= 40) return 'from-orange-400 to-orange-600';
    return 'from-red-400 to-red-600';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500/20 border-red-500';
      case 'high': return 'bg-orange-500/20 border-orange-500';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500';
      default: return 'bg-gray-500/20 border-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading Truth...</div>
      </div>
    );
  }

  // Show empty state if no scorecard data
  if (!scorecard) {
    return (
      <div className="min-h-screen p-8 pt-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              SentientIQ Scorecard
            </h1>
            <p className="text-gray-300 mt-2 text-lg">
              The Crystal Palace of Marketing Truth - No Bullshit, Full Accountability
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="backdrop-blur-xl bg-white/5 rounded-3xl p-12 border border-white/10 shadow-2xl text-center"
          >
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-3xl font-bold text-white mb-4">No Data Yet</h2>
            <p className="text-gray-300 text-lg">
              Zero recommendations. Zero actions. Zero accountability to measure.
            </p>
            <p className="text-gray-400 mt-4">
              The truth starts when you start using the system.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 pt-20">
      {/* Glass morphism container */}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
            SentientIQ Scorecard
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            The Crystal Palace of Marketing Truth - No Bullshit, Full Accountability
          </p>
        </motion.div>

        {scorecard && (
          <>
            {/* Main Score Display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="backdrop-blur-xl bg-white/5 rounded-3xl p-8 mb-8 border border-white/10 shadow-2xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Accountability Score */}
                <div className="text-center">
                  <h3 className="text-gray-300 text-sm uppercase tracking-wider mb-4">
                    Accountability Score
                  </h3>
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-700"
                      />
                      <motion.circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="url(#scoreGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={553}
                        initial={{ strokeDashoffset: 553 }}
                        animate={{ 
                          strokeDashoffset: 553 - (553 * scorecard.accountability_score / 100) 
                        }}
                        transition={{ duration: 2, ease: "easeOut" }}
                      />
                      <defs>
                        <linearGradient id="scoreGradient">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="50%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#EF4444" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div>
                        <div className={`text-6xl font-bold bg-gradient-to-r ${getScoreColor(scorecard.accountability_score)} bg-clip-text text-transparent`}>
                          {scorecard.accountability_score}
                        </div>
                        <div className="text-gray-400 text-sm">out of 100</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Stats */}
                <div className="flex flex-col justify-center space-y-4">
                  <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-3xl font-bold text-white">
                      {scorecard.total_recommendations}
                    </div>
                    <div className="text-gray-400 text-sm">Total Recommendations</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="backdrop-blur-xl bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                      <div className="text-2xl font-bold text-green-400">
                        {scorecard.acted_on}
                      </div>
                      <div className="text-gray-400 text-xs">Acted On</div>
                    </div>
                    <div className="backdrop-blur-xl bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                      <div className="text-2xl font-bold text-red-400">
                        {scorecard.ignored}
                      </div>
                      <div className="text-gray-400 text-xs">Ignored</div>
                    </div>
                  </div>
                  <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-xl font-bold text-white">
                      {(scorecard.action_rate * 100).toFixed(1)}%
                    </div>
                    <div className="text-gray-400 text-sm">Action Rate</div>
                  </div>
                </div>

                {/* Impact Metrics */}
                <div className="flex flex-col justify-center space-y-4">
                  <div className="backdrop-blur-xl bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                    <div className="text-3xl font-bold text-red-400">
                      ${scorecard.revenue_left_on_table.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">Revenue Left on Table</div>
                  </div>
                  <div className="backdrop-blur-xl bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
                    <div className="text-2xl font-bold text-orange-400">
                      {scorecard.missed_conversions}
                    </div>
                    <div className="text-gray-400 text-sm">Missed Conversions</div>
                  </div>
                  <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-xl font-bold text-white">
                      {scorecard.response_time_avg.toFixed(1)}h
                    </div>
                    <div className="text-gray-400 text-sm">Avg Response Time</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Best and Worst */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="backdrop-blur-xl bg-green-500/10 rounded-2xl p-6 border border-green-500/20"
              >
                <h3 className="text-green-400 font-bold mb-2">✨ Your Best Move</h3>
                <p className="text-gray-300">{scorecard.best_performing_action}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="backdrop-blur-xl bg-red-500/10 rounded-2xl p-6 border border-red-500/20"
              >
                <h3 className="text-red-400 font-bold mb-2">💔 Your Biggest Miss</h3>
                <p className="text-gray-300">{scorecard.worst_ignored_recommendation}</p>
              </motion.div>
            </div>

            {/* Recent Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 mb-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Recent Recommendations</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recommendations.slice(0, 5).map((rec, index) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`backdrop-blur-xl rounded-xl p-4 border ${getUrgencyColor(rec.urgency)}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            rec.urgency === 'critical' ? 'bg-red-500 text-white' :
                            rec.urgency === 'high' ? 'bg-orange-500 text-white' :
                            rec.urgency === 'medium' ? 'bg-yellow-500 text-black' :
                            'bg-gray-500 text-white'
                          }`}>
                            {rec.urgency.toUpperCase()}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {new Date(rec.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold">{rec.title}</h3>
                        <p className="text-gray-300 text-sm mt-1">{rec.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span>💰 ${Math.abs(rec.potential_impact.revenue).toFixed(0)}</span>
                          <span>📈 {rec.potential_impact.conversion_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        rec.status === 'deployed' ? 'bg-green-500/20 text-green-400' :
                        rec.status === 'viewed' ? 'bg-blue-500/20 text-blue-400' :
                        rec.status === 'ignored' ? 'bg-red-500/20 text-red-400' :
                        rec.status === 'dismissed' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {rec.status}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {recommendations.length > 5 && (
                <button
                  onClick={() => navigate('/recommendations')}
                  className="mt-4 w-full py-2 backdrop-blur-xl bg-white/5 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all"
                >
                  View All {recommendations.length} Recommendations →
                </button>
              )}
            </motion.div>

            {/* Cancellation CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <button
                onClick={handleCancellation}
                className="px-8 py-3 backdrop-blur-xl bg-red-500/20 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-all font-semibold"
              >
                Thinking of Canceling? See Your Full Accountability Report
              </button>
            </motion.div>
          </>
        )}

        {/* Cancellation Report Modal */}
        <AnimatePresence>
          {showCancellationReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 z-50"
              onClick={() => setShowCancellationReport(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="max-w-4xl w-full max-h-[80vh] overflow-y-auto backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20"
                onClick={(e) => e.stopPropagation()}
              >
                <pre className="text-white whitespace-pre-wrap font-mono text-sm">
                  {cancellationReport}
                </pre>
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={() => setShowCancellationReport(false)}
                    className="flex-1 py-3 backdrop-blur-xl bg-green-500/20 rounded-xl border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-all font-semibold"
                  >
                    I'll Stay and Act on Recommendations
                  </button>
                  <button
                    onClick={() => setShowCancellationReport(false)}
                    className="flex-1 py-3 backdrop-blur-xl bg-red-500/20 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-all font-semibold"
                  >
                    Close Report
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SentientIQScorecard;