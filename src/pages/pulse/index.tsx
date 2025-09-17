/**
 * Pulse Dashboard - Refactored
 * Clean separation of concerns with independent broadcast points
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import EmotionalStream from '@/components/EmotionalStream';
import InterventionStream from '@/components/InterventionStream';
import EVIDisplay from '@/components/EVIDisplay';
import {
  Brain,
  BarChart3,
  Zap,
  TrendingUp,
  Users,
  Eye
} from 'lucide-react';

const PulseDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'streams' | 'analytics' | 'overview'>('streams');

  // Mock EVI value (will be calculated from emotional stream)
  const [eviValue] = useState(50);

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
                  { id: 'streams', label: 'Live Streams', icon: Zap },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                  { id: 'overview', label: 'Overview', icon: BarChart3 }
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
      <div className="max-w-[1920px] mx-auto">
        {activeView === 'streams' && (
          <div className="p-6">
            {/* Top Level Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* EVI Display */}
              <div className="lg:col-span-2">
                <EVIDisplay
                  value={eviValue}
                  trend={eviValue > 60 ? 'up' : eviValue < 40 ? 'down' : 'stable'}
                  className="w-full h-full"
                />
              </div>

              {/* Active Users */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-6 flex flex-col items-center justify-center"
              >
                <Users className="w-8 h-8 text-purple-400 mb-3" />
                <div className="text-4xl font-bold text-white">{metrics.activeUsers}</div>
                <div className="text-sm text-white/60 mt-1">Active Users</div>
                <div className="mt-3 grid grid-cols-2 gap-4 w-full">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">
                      {metrics.conversionRate}%
                    </div>
                    <div className="text-xs text-white/40">Conversion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-400">
                      {metrics.revenueImpact}
                    </div>
                    <div className="text-xs text-white/40">Revenue</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Broadcast Streams */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Broadcast Point #1: Emotional Stream */}
              <div className="h-full">
                <EmotionalStream />
              </div>

              {/* Broadcast Point #2: Intervention Stream */}
              <div className="h-full">
                <InterventionStream />
              </div>
            </div>
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="p-6">
            <div className="text-center py-20">
              <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Advanced Analytics</h2>
              <p className="text-gray-400">Deep insights into emotional patterns and intervention effectiveness</p>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <MetricCard
                  label="Emotions/Hour"
                  value="2,847"
                  change="+12%"
                  color="from-purple-500 to-purple-600"
                />
                <MetricCard
                  label="Intervention Rate"
                  value="3.8%"
                  change="+0.5%"
                  color="from-green-500 to-green-600"
                />
                <MetricCard
                  label="Avg Response Time"
                  value="124ms"
                  change="-15ms"
                  color="from-blue-500 to-blue-600"
                />
                <MetricCard
                  label="Pattern Accuracy"
                  value="94.2%"
                  change="+2.1%"
                  color="from-yellow-500 to-yellow-600"
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'overview' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <MetricCard
                label="Active Users"
                value={metrics.activeUsers.toLocaleString()}
                change="+12%"
                color="from-blue-500 to-blue-600"
              />
              <MetricCard
                label="Emotions Detected"
                value={metrics.emotionsDetected.toLocaleString()}
                change="+28%"
                color="from-purple-500 to-purple-600"
              />
              <MetricCard
                label="Interventions"
                value={metrics.interventionsTriggered.toLocaleString()}
                change="+15%"
                color="from-orange-500 to-orange-600"
              />
              <MetricCard
                label="Conversion Rate"
                value={`${metrics.conversionRate}%`}
                change="+5.2%"
                color="from-green-500 to-green-600"
              />
              <MetricCard
                label="Revenue Impact"
                value={metrics.revenueImpact}
                change="+23%"
                color="from-yellow-500 to-yellow-600"
              />
            </div>

            {/* Emotional Pattern Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6"
              >
                <h2 className="text-xl font-semibold text-white mb-4">Emotional Patterns</h2>
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
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-6"
              >
                <h2 className="text-xl font-semibold text-white mb-4">Top Interventions</h2>
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
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  label: string;
  value: string;
  change: string;
  color: string;
}> = ({ label, value, change, color }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${color}`} />
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