/**
 * Accountability Scorecard - The Loop Closes Here
 * 
 * Detection → Recommendation → Action (or Inaction) → Revenue Impact
 * Every emotion detected. Every intervention suggested. Every dollar saved or lost.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  XCircle, Clock, DollarSign, Users, Activity, Target, Zap 
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import PageHeader from './PageHeader';

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
  'A': 'from-emerald-500 to-green-500',
  'B': 'from-blue-500 to-cyan-500',
  'C': 'from-yellow-500 to-amber-500',
  'D': 'from-orange-500 to-red-500',
  'F': 'from-red-500 to-red-700'
};

const SEVERITY_COLORS = {
  'critical': 'border-red-500/20 bg-red-900/5',
  'high': 'border-orange-500/20 bg-orange-900/5',
  'medium': 'border-yellow-500/20 bg-yellow-900/5',
  'low': 'border-blue-500/20 bg-blue-900/5'
};

const SEVERITY_TEXT = {
  'critical': 'text-red-400',
  'high': 'text-orange-400',
  'medium': 'text-yellow-400',
  'low': 'text-blue-400'
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
      
      // Try to fetch real data
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.sentientiq.app';
      const response = await fetch(`${apiUrl}/api/scorecard/${user?.id || 'demo'}?period=${period}`);
      
      if (response.ok) {
        const data = await response.json();
        setScore(data.scorecard);
        setRecommendations(data.recommendations);
        setInsights(data.insights);
      } else {
        // Use demo data as fallback
        setScore(generateDemoScore());
        setRecommendations(generateDemoRecommendations());
        setInsights(generateDemoInsights());
      }
      
    } catch (error) {
      console.error('Failed to fetch accountability data:', error);
      // Use demo data
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
        outcome: 'lost' as const,
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
        outcome: 'saved' as const,
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="neural-bg" />
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-purple-500" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <PageHeader 
        title="Accountability Scorecard"
        subtitle="Every recommendation. Every action. Every dollar saved or lost."
      />

          {/* Score Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 mb-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Your Accountability Score</h2>
                <p className="text-white/60">Last {period === '30d' ? '30 days' : period === '7d' ? '7 days' : '24 hours'}</p>
              </div>
              <div className="flex gap-2">
                {['24h', '7d', '30d'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                      period === p 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {/* Grade Circle */}
              <div className="flex flex-col items-center justify-center">
                <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${score ? GRADE_COLORS[score.grade] : 'from-gray-500 to-gray-700'} p-1`}>
                  <div className="w-full h-full rounded-full bg-black flex flex-col items-center justify-center">
                    <div className="text-5xl font-bold">{score?.grade || 'F'}</div>
                    <div className="text-2xl font-semibold">{score?.score || 0}%</div>
                  </div>
                </div>
                <p className="text-white/60 text-sm mt-3">Action Rate</p>
              </div>

              {/* Key Metrics */}
              <div className="col-span-3 grid grid-cols-3 gap-4">
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-white/60">Recommendations</span>
                  </div>
                  <div className="text-3xl font-bold">{score?.totalRecommendations || 0}</div>
                  <div className="text-sm text-red-400 mt-1">{score?.criticalRecommendations || 0} critical</div>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-white/60">Revenue Lost</span>
                  </div>
                  <div className="text-3xl font-bold text-red-400">
                    {formatCurrency(score?.revenueLost || 0)}
                  </div>
                  <div className="text-sm text-white/60 mt-1">from inaction</div>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-white/60">Revenue Saved</span>
                  </div>
                  <div className="text-3xl font-bold text-green-400">
                    {formatCurrency(score?.revenueSaved || 0)}
                  </div>
                  <div className="text-sm text-white/60 mt-1">from action</div>
                </div>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-white/60">Actions Taken</span>
                </div>
                <div className="text-2xl font-bold">{score?.actionsTaken || 0}</div>
              </div>
              
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-white/60">Ignored</span>
                </div>
                <div className="text-2xl font-bold text-red-400">{score?.actionsIgnored || 0}</div>
              </div>
              
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-white/60">Avg Response</span>
                </div>
                <div className="text-2xl font-bold">{score?.responseTime || 0}m</div>
              </div>
              
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-white/60">Preventable Loss</span>
                </div>
                <div className="text-2xl font-bold text-orange-400">
                  {formatCurrency(score?.preventableChurn || 0)}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Insights */}
          {insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4 mb-6"
            >
              <h3 className="text-xl font-bold">Critical Insights</h3>
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`glass-card p-6 ${
                    insight.type === 'warning' ? 'border-red-500/20 bg-red-900/5' :
                    insight.type === 'pattern' ? 'border-yellow-500/20 bg-yellow-900/5' :
                    insight.type === 'opportunity' ? 'border-blue-500/20 bg-blue-900/5' :
                    'border-green-500/20 bg-green-900/5'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      insight.type === 'warning' ? 'bg-red-500/20' :
                      insight.type === 'pattern' ? 'bg-yellow-500/20' :
                      insight.type === 'opportunity' ? 'bg-blue-500/20' :
                      'bg-green-500/20'
                    }`}>
                      {insight.type === 'warning' ? <AlertTriangle className="w-6 h-6 text-red-400" /> :
                       insight.type === 'pattern' ? <Activity className="w-6 h-6 text-yellow-400" /> :
                       insight.type === 'opportunity' ? <Zap className="w-6 h-6 text-blue-400" /> :
                       <Target className="w-6 h-6 text-green-400" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-1">{insight.message}</h4>
                      <p className="text-white/60 mb-2">{insight.impact}</p>
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
          >
            <div className="flex gap-2 mb-6">
              {[
                { id: 'overview', label: 'Overview', count: null },
                { id: 'pending', label: 'Pending', count: recommendations?.pending?.length || 0 },
                { id: 'ignored', label: 'Ignored', count: recommendations?.ignored?.length || 0 },
                { id: 'acted', label: 'Acted On', count: recommendations?.acted?.length || 0 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    selectedTab === tab.id
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
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
                  className="glass-card p-12 text-center"
                >
                  <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-4">The Accountability Loop</h3>
                  <p className="text-white/60 max-w-2xl mx-auto mb-8">
                    Every emotion detected leads to a recommendation. Every recommendation
                    requires action. Every action (or inaction) has a revenue impact.
                    This is where the loop closes.
                  </p>
                  <div className="flex justify-center gap-12">
                    <div className="text-center">
                      <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-green-400">
                        {score?.customersSaved || 0}
                      </div>
                      <div className="text-sm text-white/60">Customers Saved</div>
                    </div>
                    <div className="text-center">
                      <Users className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-red-400">
                        {score?.customersLost || 0}
                      </div>
                      <div className="text-sm text-white/60">Customers Lost</div>
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
                  {(recommendations[selectedTab as keyof typeof recommendations] || []).map((rec) => (
                    <div
                      key={rec.id}
                      className={`glass-card p-6 ${SEVERITY_COLORS[rec.severity]}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-2xl font-bold uppercase ${SEVERITY_TEXT[rec.severity]}`}>
                              {rec.emotion}
                            </span>
                            <span className="px-2 py-1 rounded-lg bg-white/10 text-sm">
                              {rec.confidence}% confidence
                            </span>
                            <span className="text-sm text-white/60">
                              {formatTimeAgo(rec.timestamp)}
                            </span>
                          </div>
                          {rec.userEmail && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-white/60">User:</span>
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
                            <div className="text-green-400 font-bold mb-1">✓ SAVED</div>
                          )}
                          {rec.outcome === 'lost' && (
                            <div className="text-red-400 font-bold mb-1">✗ LOST</div>
                          )}
                          <div className="text-2xl font-bold">
                            {formatCurrency(rec.actualRevenueLoss || rec.estimatedRevenueLoss)}
                          </div>
                          <div className="text-xs text-white/60">
                            {rec.actualRevenueLoss ? 'actual loss' : 'at risk'}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-4">
                        <div className="text-sm text-white/60 mb-1">Recommended Action:</div>
                        <div className="text-white">{rec.recommendedAction}</div>
                      </div>

                      {selectedTab === 'pending' && (
                        <div className="flex gap-3 mt-4">
                          <button className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/40 rounded-xl hover:bg-green-500/30 transition-all font-semibold">
                            Take Action
                          </button>
                          <button className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl hover:bg-red-500/30 transition-all font-semibold">
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {recommendations[selectedTab as keyof typeof recommendations].length === 0 && (
                    <div className="glass-card p-12 text-center">
                      <Activity className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                      <p className="text-white/60">
                        No {selectedTab} recommendations
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
    </>
  );
}