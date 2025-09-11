/**
 * Accountability Scorecard - The Loop Closes Here
 * 
 * Detection → Recommendation → Action (or Inaction) → Revenue Impact
 * Every emotion detected. Every intervention suggested. Every dollar saved or lost.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import NeuronCursor from './ui/NeuronCursor';
import PulseDot from './ui/PulseDot';
import PageHeader from './PageHeader';
import { track } from '../lib/track';

interface AccountabilityScore {
  companyId: string;
  period: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalRecommendations: number;
  criticalRecommendations: number;
  actionsTaken: number;
  actionsIgnored: number;
  responseTime: number; // minutes
  revenueSaved: number;
  revenueLost: number;
  preventableChurn: number;
  customersSaved: number;
  customersLost: number;
}

interface Recommendation {
  id: string;
  timestamp: string;
  emotion: string;
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  userId?: string;
  userEmail?: string;
  userValue?: number;
  recommendedAction: string;
  estimatedRevenueLoss: number;
  deadline: string;
  actionTaken?: boolean;
  outcome?: 'saved' | 'lost' | 'pending';
  actualRevenueLoss?: number;
}

interface AccountabilityInsight {
  type: 'pattern' | 'warning' | 'opportunity' | 'achievement';
  message: string;
  impact: string;
  suggestedAction?: string;
}

const GRADE_COLORS = {
  'A': 'text-green-400 border-green-400',
  'B': 'text-blue-400 border-blue-400',
  'C': 'text-yellow-400 border-yellow-400',
  'D': 'text-orange-400 border-orange-400',
  'F': 'text-red-400 border-red-400'
};

const SEVERITY_COLORS = {
  'critical': 'bg-red-500/20 border-red-500/40 text-red-400',
  'high': 'bg-orange-500/20 border-orange-500/40 text-orange-400',
  'medium': 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
  'low': 'bg-blue-500/20 border-blue-500/40 text-blue-400'
};

export default function AccountabilityScorecard() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<AccountabilityScore | null>(null);
  const [recommendations, setRecommendations] = useState<{
    pending: Recommendation[];
    ignored: Recommendation[];
    acted: Recommendation[];
  }>({ pending: [], ignored: [], acted: [] });
  const [insights, setInsights] = useState<AccountabilityInsight[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'pending' | 'ignored' | 'acted'>('overview');
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchAccountabilityData();
  }, [period]);

  const fetchAccountabilityData = async () => {
    try {
      setLoading(true);
      
      // Fetch accountability score and recommendations
      const response = await fetch(`/api/scorecard/${user?.id || 'demo'}?period=${period}`);
      const data = await response.json();
      
      setScore(data.scorecard);
      setRecommendations(data.recommendations);
      setInsights(data.insights);
      
      track('accountability_scorecard_viewed', {
        score: data.scorecard.score,
        grade: data.scorecard.grade,
        period
      });
    } catch (error) {
      console.error('Failed to fetch accountability data:', error);
      // Use demo data for now
      setScore(generateDemoScore());
      setRecommendations(generateDemoRecommendations());
      setInsights(generateDemoInsights());
    } finally {
      setLoading(false);
    }
  };

  const generateDemoScore = (): AccountabilityScore => ({
    companyId: 'demo',
    period: '30d',
    score: 42,
    grade: 'D',
    totalRecommendations: 147,
    criticalRecommendations: 23,
    actionsTaken: 43,
    actionsIgnored: 104,
    responseTime: 127,
    revenueSaved: 128000,
    revenueLost: 342000,
    preventableChurn: 285000,
    customersSaved: 12,
    customersLost: 8
  });

  const generateDemoRecommendations = () => ({
    pending: [
      {
        id: '1',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        emotion: 'rage',
        confidence: 95,
        severity: 'critical' as const,
        userEmail: 'ceo@fortune500.com',
        userValue: 120000,
        recommendedAction: 'Immediate CEO alert + Support chat auto-open',
        estimatedRevenueLoss: 120000,
        deadline: new Date(Date.now() + 5 * 60000).toISOString()
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
        emotion: 'confusion',
        confidence: 87,
        severity: 'high' as const,
        userEmail: 'buyer@enterprise.com',
        userValue: 85000,
        recommendedAction: 'Simplify pricing display + Offer demo',
        estimatedRevenueLoss: 85000,
        deadline: new Date(Date.now() + 30 * 60000).toISOString()
      }
    ],
    ignored: [
      {
        id: '3',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        emotion: 'abandonment',
        confidence: 92,
        severity: 'critical' as const,
        userEmail: 'vp@bigcorp.com',
        userValue: 150000,
        recommendedAction: 'Exit intent modal + Discount offer',
        estimatedRevenueLoss: 150000,
        deadline: new Date(Date.now() - 3600000).toISOString(),
        actionTaken: false,
        outcome: 'lost',
        actualRevenueLoss: 150000
      }
    ],
    acted: [
      {
        id: '4',
        timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
        emotion: 'hesitation',
        confidence: 78,
        severity: 'medium' as const,
        userEmail: 'director@startup.com',
        userValue: 36000,
        recommendedAction: 'Show social proof + Testimonials',
        estimatedRevenueLoss: 36000,
        deadline: new Date(Date.now() - 23 * 3600000).toISOString(),
        actionTaken: true,
        outcome: 'saved',
        actualRevenueLoss: 0
      }
    ]
  });

  const generateDemoInsights = (): AccountabilityInsight[] => [
    {
      type: 'warning',
      message: 'You consistently ignore rage signals (78% ignored)',
      impact: 'This pattern has cost $342,000 in preventable churn this month',
      suggestedAction: 'Enable automatic Slack alerts for high-value rage events'
    },
    {
      type: 'pattern',
      message: 'Response time for critical alerts averages 127 minutes',
      impact: 'Every hour of delay reduces save rate by 47%',
      suggestedAction: 'Set up automated interventions for faster response'
    },
    {
      type: 'opportunity',
      message: 'Enterprise customers respond 3x better to human intervention',
      impact: 'Could save additional $180k/month with dedicated response team',
      suggestedAction: 'Assign account managers to high-value emotional events'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Brain className="w-12 h-12 text-purple-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <NeuronCursor />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <PageHeader 
          title="Accountability Scorecard"
          subtitle="Every recommendation. Every action. Every dollar."
        />

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 glass-panel p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Your Accountability Score</h2>
              <p className="text-gray-400">Last {period === '30d' ? '30 days' : period === '7d' ? '7 days' : '24 hours'}</p>
            </div>
            <div className="flex gap-2">
              {['24h', '7d', '30d'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    period === p 
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:border-gray-600/50'
                  }`}
                >
                  {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Grade */}
            <div className="text-center">
              <div className={`text-8xl font-bold mb-2 ${score ? GRADE_COLORS[score.grade] : ''}`}>
                {score?.grade || 'F'}
              </div>
              <div className="text-3xl font-semibold">{score?.score || 0}%</div>
              <div className="text-gray-400 text-sm mt-1">Action Rate</div>
            </div>

            {/* Key Metrics */}
            <div className="col-span-3 grid grid-cols-3 gap-4">
              <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-gray-400">Recommendations</span>
                </div>
                <div className="text-3xl font-bold">{score?.totalRecommendations || 0}</div>
                <div className="text-sm text-red-400">{score?.criticalRecommendations || 0} critical</div>
              </div>

              <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-gray-400">Revenue Lost</span>
                </div>
                <div className="text-3xl font-bold text-red-400">
                  {formatCurrency(score?.revenueLost || 0)}
                </div>
                <div className="text-sm text-gray-400">from inaction</div>
              </div>

              <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-400">Revenue Saved</span>
                </div>
                <div className="text-3xl font-bold text-green-400">
                  {formatCurrency(score?.revenueSaved || 0)}
                </div>
                <div className="text-sm text-gray-400">from action</div>
              </div>
            </div>
          </div>

          {/* Action Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="glass-panel p-3 text-center">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <div className="text-2xl font-bold">{score?.actionsTaken || 0}</div>
              <div className="text-xs text-gray-400">Actions Taken</div>
            </div>
            <div className="glass-panel p-3 text-center">
              <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-400">{score?.actionsIgnored || 0}</div>
              <div className="text-xs text-gray-400">Ignored</div>
            </div>
            <div className="glass-panel p-3 text-center">
              <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <div className="text-2xl font-bold">{score?.responseTime || 0}m</div>
              <div className="text-xs text-gray-400">Avg Response</div>
            </div>
            <div className="glass-panel p-3 text-center">
              <DollarSign className="w-6 h-6 text-orange-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-400">
                {formatCurrency(score?.preventableChurn || 0)}
              </div>
              <div className="text-xs text-gray-400">Preventable Loss</div>
            </div>
          </div>
        </motion.div>

        {/* Insights */}
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 space-y-4"
          >
            <h3 className="text-xl font-semibold mb-4">Critical Insights</h3>
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`glass-panel p-6 border-l-4 ${
                  insight.type === 'warning' ? 'border-red-400' :
                  insight.type === 'pattern' ? 'border-yellow-400' :
                  insight.type === 'opportunity' ? 'border-blue-400' :
                  'border-green-400'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl">
                    {insight.type === 'warning' ? '⚠️' :
                     insight.type === 'pattern' ? '📊' :
                     insight.type === 'opportunity' ? '💡' : '🎯'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{insight.message}</h4>
                    <p className="text-gray-400 mb-2">{insight.impact}</p>
                    {insight.suggestedAction && (
                      <p className="text-sm text-purple-400">
                        → {insight.suggestedAction}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Recommendations Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <div className="flex gap-2 mb-6">
            {[
              { id: 'overview', label: 'Overview', count: null },
              { id: 'pending', label: 'Pending', count: recommendations.pending.length },
              { id: 'ignored', label: 'Ignored', count: recommendations.ignored.length },
              { id: 'acted', label: 'Acted On', count: recommendations.acted.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
                  selectedTab === tab.id
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:border-gray-600/50'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    tab.id === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    tab.id === 'ignored' ? 'bg-red-500/20 text-red-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {selectedTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-panel p-6"
              >
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-2">The Accountability Loop</h3>
                  <p className="text-gray-400 max-w-2xl mx-auto">
                    Every emotion detected leads to a recommendation. Every recommendation
                    requires action. Every action (or inaction) has a revenue impact.
                    This is where the loop closes.
                  </p>
                  <div className="flex justify-center gap-8 mt-8">
                    <div>
                      <div className="text-3xl font-bold text-green-400">
                        {score?.customersSaved || 0}
                      </div>
                      <div className="text-sm text-gray-400">Customers Saved</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-red-400">
                        {score?.customersLost || 0}
                      </div>
                      <div className="text-sm text-gray-400">Customers Lost</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {selectedTab !== 'overview' && (
              <motion.div
                key={selectedTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {recommendations[selectedTab as keyof typeof recommendations].map((rec) => (
                  <div
                    key={rec.id}
                    className={`glass-panel p-6 ${SEVERITY_COLORS[rec.severity]}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold uppercase">{rec.emotion}</span>
                          <span className="px-2 py-1 rounded bg-white/10 text-sm">
                            {rec.confidence}% confidence
                          </span>
                          <span className="text-sm text-gray-400">
                            {formatTimeAgo(rec.timestamp)}
                          </span>
                        </div>
                        {rec.userEmail && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">User:</span>
                            <span className="text-white">{rec.userEmail}</span>
                            {rec.userValue && (
                              <span className="text-green-400 font-bold">
                                ({formatCurrency(rec.userValue)}/yr)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {rec.outcome === 'saved' && (
                          <div className="text-green-400 font-bold">SAVED</div>
                        )}
                        {rec.outcome === 'lost' && (
                          <div className="text-red-400 font-bold">LOST</div>
                        )}
                        <div className="text-2xl font-bold mt-1">
                          {formatCurrency(rec.actualRevenueLoss || rec.estimatedRevenueLoss)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {rec.actualRevenueLoss ? 'actual loss' : 'at risk'}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <div className="text-sm text-gray-400 mb-1">Recommended Action:</div>
                      <div className="text-white">{rec.recommendedAction}</div>
                    </div>

                    {selectedTab === 'pending' && (
                      <div className="flex gap-3 mt-4">
                        <button className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/40 rounded-lg hover:bg-green-500/30 transition-all">
                          Take Action
                        </button>
                        <button className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg hover:bg-red-500/30 transition-all">
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {recommendations[selectedTab as keyof typeof recommendations].length === 0 && (
                  <div className="glass-panel p-12 text-center">
                    <PulseDot color="purple" />
                    <p className="text-gray-400 mt-4">
                      No {selectedTab} recommendations
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}