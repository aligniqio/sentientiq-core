import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Calendar, TrendingUp, AlertCircle, Check, X } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { TIERS } from '../lib/billing';
import PageHeader from '../components/PageHeader';

export default function Billing() {
  const { user } = useUser();
  const subscription = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    // Redirect to pricing page for upgrade
    window.location.href = '/pricing';
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      // Create portal session
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
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
      case TIERS.PRO:
        return 'from-violet-500 to-sky-500';
      case TIERS.TEAM:
        return 'from-emerald-500 to-teal-500';
      case TIERS.ENTERPRISE:
        return 'from-amber-500 to-rose-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (subscription.loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Neural Cathedral Background */}
      <div className="neural-bg" />
      
      <div className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 pt-12">
        {/* Header */}
        <PageHeader 
          title="Billing & Usage"
          subtitle="Manage your subscription and track your usage"
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
              <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${getTierBadgeColor(subscription.tier)} px-3 py-1 text-sm font-semibold`}>
                {subscription.tier.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-white/60">Status</span>
                <span className={`font-semibold ${getStatusColor(subscription.status)}`}>
                  {subscription.status || 'Free'}
                </span>
              </div>

              {/* Billing Period */}
              {subscription.currentPeriodEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Next billing date</span>
                  <span>{subscription.currentPeriodEnd.toLocaleDateString()}</span>
                </div>
              )}

              {/* Questions Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Questions this month</span>
                  <span>
                    {subscription.questionsUsed}
                    {subscription.questionsLimit > 0 && ` / ${subscription.questionsLimit}`}
                  </span>
                </div>
                {subscription.questionsLimit > 0 && (
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-sky-500 transition-all"
                      style={{
                        width: `${Math.min(100, (subscription.questionsUsed / subscription.questionsLimit) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {subscription.tier === TIERS.FREE ? (
                  <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2 text-sm font-semibold shadow-lg shadow-violet-500/20 ring-1 ring-white/20 hover:brightness-110 disabled:opacity-50"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Upgrade to Pro
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
                    {subscription.tier !== TIERS.TEAM && (
                      <button
                        onClick={handleUpgrade}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                      >
                        <TrendingUp className="h-4 w-4" />
                        Upgrade
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
                name={subscription.tier === TIERS.FREE ? "20 questions/month" : "Unlimited questions"}
                enabled={true}
              />
              <FeatureRow
                name={subscription.tier === TIERS.FREE ? "EVI (1 hour delay)" : "Live EVI dashboard"}
                enabled={true}
              />
              <FeatureRow
                name={subscription.tier === TIERS.FREE ? "Basic Why explanations" : "Full Why explanations"}
                enabled={true}
              />
              <FeatureRow
                name="CSV export"
                enabled={subscription.canExport}
              />
              <FeatureRow
                name="API access"
                enabled={subscription.tier === TIERS.TEAM || subscription.tier === TIERS.ENTERPRISE}
              />
              <FeatureRow
                name="Priority support"
                enabled={subscription.tier !== TIERS.FREE}
              />
            </div>
          </motion.div>
        </div>

        {/* Usage History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Usage History</h2>
            <Calendar className="h-5 w-5 text-white/60" />
          </div>
          
          {/* Placeholder for usage chart */}
          <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-black/30">
            <p className="text-white/40">Usage analytics coming soon</p>
          </div>
        </motion.div>

        {/* Need help? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-xl"
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold">Need help with billing?</h3>
              <p className="mt-1 text-sm text-white/70">
                Contact us at{' '}
                <a href="mailto:billing@sentientiq.ai" className="text-violet-300 hover:text-violet-200">
                  billing@sentientiq.ai
                </a>{' '}
                or visit our{' '}
                <a href="/docs/billing" className="text-violet-300 hover:text-violet-200">
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