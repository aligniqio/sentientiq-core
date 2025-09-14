import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  Users,
  Key,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Zap
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useEnhancedSubscription, formatEventCount, getTierBadgeColor } from '../hooks/useEnhancedSubscription';
import { useTenant } from '../hooks/useTenant';

export default function UsageDashboard() {
  const subscription = useEnhancedSubscription();
  const { organization } = useTenant();

  if (subscription.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-purple-500" />
      </div>
    );
  }

  // Calculate days left in billing period
  const daysLeft = subscription.currentPeriodEnd
    ? Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 30;

  // Usage status colors
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 75) return 'text-amber-400';
    return 'text-green-400';
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 75) return 'from-amber-500 to-amber-600';
    return 'from-green-500 to-green-600';
  };

  return (
    <>
      <PageHeader
        title="Usage & Analytics"
        subtitle="Monitor your organization's SentientIQ usage"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Current Plan Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {organization?.name || 'Your Organization'}
              </h2>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${getTierBadgeColor(subscription.tier)}`}>
                  {subscription.tier.toUpperCase()}
                </span>
                <span className={`text-sm ${subscription.status === 'active' ? 'text-green-400' : 'text-amber-400'}`}>
                  {subscription.status === 'active' ? '● Active' : `● ${subscription.status}`}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-sm">Billing Period Ends</p>
              <p className="text-xl font-semibold text-white">
                {daysLeft} days
              </p>
              <p className="text-white/40 text-xs">
                {subscription.currentPeriodEnd?.toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <span className={`text-sm font-semibold ${getUsageColor(subscription.eventsPercentage)}`}>
                  {subscription.eventsPercentage}%
                </span>
              </div>
              <p className="text-white/60 text-sm">Events Used</p>
              <p className="text-lg font-semibold text-white">
                {formatEventCount(subscription.eventsUsed)} / {formatEventCount(subscription.eventsLimit)}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Key className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold text-white">
                  {subscription.apiKeysUsed}/{subscription.apiKeysLimit === -1 ? '∞' : subscription.apiKeysLimit}
                </span>
              </div>
              <p className="text-white/60 text-sm">API Keys</p>
              <p className="text-lg font-semibold text-white">
                {subscription.canAddApiKey ? 'Available' : 'Limit Reached'}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-green-400" />
                <span className="text-sm font-semibold text-white">
                  {subscription.teamMembersCount}/{subscription.teamMembersLimit === -1 ? '∞' : subscription.teamMembersLimit}
                </span>
              </div>
              <p className="text-white/60 text-sm">Team Members</p>
              <p className="text-lg font-semibold text-white">
                {subscription.canAddTeamMember ? 'Seats Available' : 'At Capacity'}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-white">
                  {Math.round((30 - daysLeft) / 30 * 100)}%
                </span>
              </div>
              <p className="text-white/60 text-sm">Period Progress</p>
              <p className="text-lg font-semibold text-white">
                Day {30 - daysLeft} of 30
              </p>
            </div>
          </div>
        </motion.div>

        {/* Detailed Usage */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Events Usage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Emotional Events Tracked
              </h3>
              <span className={`text-2xl font-bold ${getUsageColor(subscription.eventsPercentage)}`}>
                {subscription.eventsPercentage}%
              </span>
            </div>

            <div className="space-y-4">
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getUsageBarColor(subscription.eventsPercentage)} transition-all duration-500`}
                  style={{ width: `${Math.min(100, subscription.eventsPercentage)}%` }}
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-white/60">
                  {formatEventCount(subscription.eventsUsed)} events used
                </span>
                <span className="text-white/60">
                  {formatEventCount(Math.max(0, subscription.eventsLimit - subscription.eventsUsed))} remaining
                </span>
              </div>

              {subscription.eventsPercentage >= 80 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-400 font-semibold">
                        Approaching Event Limit
                      </p>
                      <p className="text-xs text-white/60 mt-1">
                        You've used {subscription.eventsPercentage}% of your monthly events.
                        Consider upgrading to {subscription.tier === 'free' ? 'Starter' : 'Professional'} for more events.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Features Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Features & Capabilities
            </h3>

            <div className="space-y-3">
              {Object.entries(subscription.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-white/80">
                    {feature.split('_').map(word =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                  {enabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-white/20" />
                  )}
                </div>
              ))}
            </div>

            {subscription.tier !== 'enterprise' && (
              <button className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm font-semibold">
                Upgrade for More Features
              </button>
            )}
          </motion.div>
        </div>

        {/* Usage Trends (Placeholder for charts) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Usage Trends (Last 30 Days)
          </h3>

          <div className="h-64 flex items-center justify-center text-white/40">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Usage analytics coming soon</p>
              <p className="text-xs mt-2">Track daily events, API calls, and team activity</p>
            </div>
          </div>
        </motion.div>

        {/* Recommendations */}
        {subscription.tier !== 'enterprise' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Optimization Recommendations
            </h3>

            <div className="space-y-3">
              {subscription.eventsPercentage > 50 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Consider upgrading your plan
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      You're using {subscription.eventsPercentage}% of your event limit.
                      Upgrading ensures uninterrupted emotional tracking.
                    </p>
                  </div>
                </div>
              )}

              {!subscription.features.api_access && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2" />
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Unlock API Access
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      Integrate SentientIQ directly into your applications with API access.
                    </p>
                  </div>
                </div>
              )}

              {subscription.teamMembersLimit <= 3 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Expand your team
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      Add more team members to collaborate on emotional intelligence insights.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}