import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Calendar, TrendingUp, AlertCircle, Check, X, Zap, Shield, BarChart3 } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import PageHeader from '../components/PageHeader';

export default function Billing() {
  const { user } = useUser();
  const subscription = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    // Redirect to marketing site pricing page
    window.location.href = 'https://sentientiq.ai/#pricing';
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      // Create Stripe portal session
      const apiUrl = import.meta.env.VITE_BILLING_API_URL || 'http://localhost:3003';
      const response = await fetch(`${apiUrl}/api/create-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
      alert('Unable to open billing portal. Please contact support.');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'text-emerald-400';
      case 'trialing':
        return 'text-sky-400';
      case 'past_due':
        return 'text-amber-400';
      case 'canceled':
        return 'text-red-400';
      default:
        return 'text-white/60';
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'starter':
        return 'from-purple-500 to-blue-500';
      case 'growth':
        return 'from-emerald-500 to-teal-500';
      case 'scale':
        return 'from-amber-500 to-orange-500';
      case 'enterprise':
        return 'from-red-500 to-pink-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'starter':
        return Zap;
      case 'growth':
        return TrendingUp;
      case 'scale':
        return BarChart3;
      case 'enterprise':
        return Shield;
      default:
        return Zap;
    }
  };

  const TierIcon = getTierIcon(subscription.tier || 'free');

  if (subscription.loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="neural-bg" />
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-purple-500" />
      </div>
    );
  }

  const currentTier = subscription.tier || 'free';
  const isFreeTier = currentTier === 'free';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Neural Cathedral Background */}
      <div className="neural-bg" />
      
      <div className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-20">
          {/* Header */}
          <PageHeader 
            title="Emotional Intelligence Billing"
            subtitle="Manage your subscription and track emotion detection usage"
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Current Plan Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 glass-card p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Current Plan</h2>
                <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${getTierBadgeColor(currentTier)} px-4 py-2 text-sm font-semibold`}>
                  <TierIcon className="h-4 w-4" />
                  {currentTier.toUpperCase()}
                </span>
              </div>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Status</span>
                  <span className={`font-semibold ${getStatusColor(subscription.status)}`}>
                    {subscription.status || 'No subscription'}
                  </span>
                </div>

                {/* Billing Period */}
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Next billing date</span>
                    <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Sessions Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Identified sessions this month</span>
                    <span>
                      {subscription.sessionsUsed || 0}
                      {subscription.sessionsLimit > 0 && ` / ${subscription.sessionsLimit.toLocaleString()}`}
                      {subscription.sessionsLimit === -1 && ' / Unlimited'}
                    </span>
                  </div>
                  {subscription.sessionsLimit > 0 && (
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                        style={{
                          width: `${Math.min(100, ((subscription.sessionsUsed || 0) / subscription.sessionsLimit) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Emotions Detected */}
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Emotions detected today</span>
                  <span className="font-mono">{subscription.emotionsToday || 0}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {isFreeTier ? (
                    <button
                      onClick={handleUpgrade}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 text-sm font-semibold shadow-lg shadow-purple-500/20 ring-1 ring-white/20 hover:brightness-110 disabled:opacity-50"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Upgrade to Starter
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleManageSubscription}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                      >
                        <CreditCard className="h-4 w-4" />
                        Manage Subscription
                      </button>
                      {currentTier !== 'scale' && currentTier !== 'enterprise' && (
                        <button
                          onClick={handleUpgrade}
                          disabled={loading}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                        >
                          <TrendingUp className="h-4 w-4" />
                          Upgrade Plan
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Features Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h2 className="mb-4 text-xl font-bold">Your Features</h2>
              <div className="space-y-3">
                <FeatureRow
                  name={
                    isFreeTier ? "10 sessions/mo" : 
                    currentTier === 'starter' ? "10,000 sessions/mo" : 
                    currentTier === 'growth' ? "100,000 sessions/mo" : 
                    "Unlimited sessions"
                  }
                  enabled={true}
                />
                <FeatureRow
                  name="Identity resolution"
                  enabled={!isFreeTier}
                />
                <FeatureRow
                  name="12 emotion detection"
                  enabled={!isFreeTier}
                />
                <FeatureRow
                  name="CRM sync"
                  enabled={currentTier === 'growth' || currentTier === 'scale' || currentTier === 'enterprise'}
                />
                <FeatureRow
                  name="API access"
                  enabled={currentTier === 'scale' || currentTier === 'enterprise'}
                />
                <FeatureRow
                  name="Success manager"
                  enabled={currentTier === 'scale' || currentTier === 'enterprise'}
                />
              </div>
            </motion.div>
          </div>

          {/* Emotion Detection History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 glass-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Emotion Detection Analytics</h2>
              <Calendar className="h-5 w-5 text-white/60" />
            </div>
            
            {/* Placeholder for emotion analytics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-purple-400">
                  {subscription.rageDetections || 0}
                </div>
                <div className="text-sm text-white/60 mt-1">Rage Detections</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-blue-400">
                  {subscription.hesitationDetections || 0}
                </div>
                <div className="text-sm text-white/60 mt-1">Hesitations</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-amber-400">
                  {subscription.confusionDetections || 0}
                </div>
                <div className="text-sm text-white/60 mt-1">Confusions</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-red-400">
                  {subscription.abandonmentsSaved || 0}
                </div>
                <div className="text-sm text-white/60 mt-1">Saved from Leaving</div>
              </div>
            </div>
            
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-black/30">
              <p className="text-white/40">Real-time emotion graph coming soon</p>
            </div>
          </motion.div>

          {/* ROI Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 glass-card p-6 border-emerald-500/20 bg-emerald-500/5"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Your Emotional ROI</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-3xl font-bold text-emerald-400">
                      ${subscription.revenueSaved || 0}
                    </p>
                    <p className="text-sm text-white/60">Revenue saved this month</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-amber-400">
                      {subscription.interventionsTriggered || 0}
                    </p>
                    <p className="text-sm text-white/60">Interventions triggered</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-purple-400">
                      {subscription.accuracyRate || 95}%
                    </p>
                    <p className="text-sm text-white/60">Detection accuracy</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Need help? */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 glass-card p-6 border-amber-500/20 bg-amber-500/5"
          >
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Need help with billing?</h3>
                <p className="mt-1 text-sm text-white/70">
                  Contact us at{' '}
                  <a href="mailto:billing@sentientiq.ai" className="text-purple-400 hover:text-purple-300">
                    billing@sentientiq.ai
                  </a>{' '}
                  or check our{' '}
                  <a href="https://docs.sentientiq.ai/billing" className="text-purple-400 hover:text-purple-300">
                    billing documentation
                  </a>.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={enabled ? 'text-white' : 'text-white/40'}>{name}</span>
      {enabled ? (
        <Check className="h-5 w-5 text-emerald-400" />
      ) : (
        <X className="h-5 w-5 text-white/20" />
      )}
    </div>
  );
}