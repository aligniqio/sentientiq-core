/**
 * Pulse Dashboard
 * The crystal palace of marketing truth
 * Where emotional intelligence becomes visible
 */

import React, { useState } from 'react';
import { InterventionDashboard } from '@/components/InterventionDashboard';
import EmotionalLiveFeed from '@/components/EmotionalLiveFeed';
import { motion } from 'framer-motion';
import {
  Activity,
  Brain,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  Eye,
  Target
} from 'lucide-react';

const PulseDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'interventions' | 'analytics'>('interventions');

  // Mock metrics (would be fetched from API)
  const metrics = {
    activeUsers: 1847,
    emotionsDetected: 23451,
    interventionsTriggered: 892,
    conversionRate: 34.2,
    revenueImpact: '+$124,320'
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">SentientIQ Pulse</h1>
                  <p className="text-xs text-gray-400">Emotional Intelligence Dashboard</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex gap-1">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'interventions', label: 'Interventions', icon: Zap },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      activeView === tab.id
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      {activeView === 'interventions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-w-[1920px] mx-auto">
          <div className="h-full">
            <EmotionalLiveFeed />
          </div>
          <div className="h-full">
            <InterventionDashboard />
          </div>
        </div>
      )}

      {activeView === 'overview' && (
        <div className="p-6 max-w-7xl mx-auto">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <MetricCard
              icon={Users}
              label="Active Users"
              value={metrics.activeUsers.toLocaleString()}
              change="+12%"
              color="from-blue-500 to-blue-600"
            />
            <MetricCard
              icon={Brain}
              label="Emotions Detected"
              value={metrics.emotionsDetected.toLocaleString()}
              change="+28%"
              color="from-purple-500 to-purple-600"
            />
            <MetricCard
              icon={Zap}
              label="Interventions"
              value={metrics.interventionsTriggered.toLocaleString()}
              change="+15%"
              color="from-orange-500 to-orange-600"
            />
            <MetricCard
              icon={Target}
              label="Conversion Rate"
              value={`${metrics.conversionRate}%`}
              change="+5.2%"
              color="from-green-500 to-green-600"
            />
            <MetricCard
              icon={TrendingUp}
              label="Revenue Impact"
              value={metrics.revenueImpact}
              change="+23%"
              color="from-yellow-500 to-yellow-600"
            />
          </div>

          {/* Real-time Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Emotional Patterns</h2>
              <div className="p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md border border-white/20">
                <div className="space-y-3">
                  {[
                    { emotion: 'Frustration', percentage: 34, color: 'bg-red-500' },
                    { emotion: 'Interest', percentage: 28, color: 'bg-blue-500' },
                    { emotion: 'Confusion', percentage: 22, color: 'bg-yellow-500' },
                    { emotion: 'Excitement', percentage: 16, color: 'bg-green-500' }
                  ].map(emotion => (
                    <div key={emotion.emotion}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-300">{emotion.emotion}</span>
                        <span className="text-white font-medium">{emotion.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${emotion.percentage}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={`h-full ${emotion.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">Top Interventions</h2>
              <div className="p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md border border-white/20">
                <div className="space-y-3">
                  {[
                    { type: 'Discount Offer', conversions: 234, rate: '42%' },
                    { type: 'Trust Signals', conversions: 189, rate: '38%' },
                    { type: 'Social Proof', conversions: 156, rate: '31%' },
                    { type: 'Urgency', conversions: 98, rate: '27%' }
                  ].map(intervention => (
                    <div key={intervention.type} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div>
                        <div className="text-white font-medium">{intervention.type}</div>
                        <div className="text-xs text-gray-400">{intervention.conversions} conversions</div>
                      </div>
                      <div className="text-green-400 font-bold">{intervention.rate}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'analytics' && (
        <div className="p-6 max-w-7xl mx-auto">
          <div className="text-center py-20">
            <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Advanced Analytics</h2>
            <p className="text-gray-400">Deep insights into emotional patterns and intervention effectiveness</p>
            <p className="text-sm text-gray-500 mt-4">Coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  icon: any;
  label: string;
  value: string;
  change: string;
  color: string;
}> = ({ icon: Icon, label, value, change, color }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`text-xs font-medium ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
          {change}
        </span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </motion.div>
  );
};

export default PulseDashboard;