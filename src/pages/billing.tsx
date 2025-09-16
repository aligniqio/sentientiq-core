import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Calendar, Shield, Lock, Crown, Sparkles, Palette, Eye } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';
import { useSuperAdmin } from '../hooks/useSuperAdmin';
import PageHeader from '../components/PageHeader';
import { interventionTemplates } from '../data/intervention-templates';
import { getSupabaseClient } from '../lib/supabase';

export default function Billing() {
  const { user } = useUser();
  const subscription = useSubscription();
  const { isSuperAdmin } = useSuperAdmin();
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  // Load selected template
  useEffect(() => {
    if (user?.id && supabase) {
      loadSelectedTemplate();
    }
  }, [user?.id]);

  const loadSelectedTemplate = async () => {
    try {
      const { data } = await supabase
        ?.from('tenant_templates')
        .select('selected_template_id')
        .eq('tenant_id', user?.id)
        .single();

      if (data) {
        setSelectedTemplateId(data.selected_template_id);
      }
    } catch (error) {
      console.log('No template selected yet');
    }
  };
  
  const handleManageSubscription = async () => {
    setLoading(true);
    try {
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

  if (subscription.loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="neural-bg" />
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-purple-500" />
      </div>
    );
  }

  // Determine user role and tenant status
  const isAdmin = user?.publicMetadata?.role === 'admin' || isSuperAdmin;
  const isTenantAdmin = user?.publicMetadata?.role === 'tenant_admin';
  const tenantName = isSuperAdmin ? 'SentientIQ Corporate' : (user?.publicMetadata?.tenantName as string || 'Your Organization');
  const currentTier = isSuperAdmin ? 'enterprise' : (subscription.tier || 'starter');

  // Non-admins see a simplified view
  if (!isAdmin && !isTenantAdmin && !isSuperAdmin) {
    return (
      <>
        <PageHeader 
          title="Account Status"
          subtitle="Your organization's subscription details"
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20">
              <Lock className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{tenantName}</h2>
              <p className="text-white/60">Member Account</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-white/60">Organization Plan</span>
              <span className="font-semibold capitalize">{currentTier}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-white/60">Account Status</span>
              <span className={`font-semibold ${getStatusColor(subscription.status)}`}>
                {subscription.status || 'Active'}
              </span>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-400">
              For billing inquiries, please contact your organization administrator or email{' '}
              <a href="mailto:billing@sentientiq.ai" className="underline">
                billing@sentientiq.ai
              </a>
            </p>
          </div>
        </motion.div>
      </>
    );
  }

  // Admin and Super Admin view
  return (
    <>
      <PageHeader
        title="Billing & Usage"
        subtitle="Manage your organization's subscription"
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
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2 text-sm font-semibold">
                <Crown className="h-4 w-4" />
                SUPER ADMIN
              </span>
            ) : (
              <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 text-sm font-semibold`}>
                <Shield className="h-4 w-4" />
                {currentTier.toUpperCase()}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Tenant Name */}
            <div className="flex items-center justify-between">
              <span className="text-white/60">Organization</span>
              <span className="font-semibold">{tenantName}</span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-white/60">Status</span>
              <span className={`font-semibold ${getStatusColor(isSuperAdmin ? 'active' : subscription.status)}`}>
                {isSuperAdmin ? 'Active' : (subscription.status || 'No subscription')}
              </span>
            </div>

            {/* Billing Period */}
            {!isSuperAdmin && subscription.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-white/60">Next billing date</span>
                <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            )}

            {/* Sessions Usage - Only for non-super admins */}
            {!isSuperAdmin && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">API Calls This Month</span>
                  <span>
                    {subscription.questionsUsed || 0}
                    {subscription.questionsLimit > 0 && ` / ${subscription.questionsLimit}`}
                    {subscription.questionsLimit === -1 && ' / Unlimited'}
                  </span>
                </div>
                {subscription.questionsLimit > 0 && (
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                      style={{
                        width: `${Math.min(100, (subscription.questionsUsed / subscription.questionsLimit) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {isSuperAdmin ? (
                <div className="text-sm text-white/60">
                  All features enabled • Unlimited access • Priority support
                </div>
              ) : isTenantAdmin && (
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" />
                  Manage Subscription
                </button>
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
          <h2 className="mb-4 text-xl font-bold">Included Features</h2>
          {isSuperAdmin ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
                <p className="text-sm font-semibold text-yellow-400 mb-2">Super Admin Access</p>
                <p className="text-xs text-white/70">All features enabled</p>
                <p className="text-xs text-white/70">System administration</p>
                <p className="text-xs text-white/70">Tenant management</p>
                <p className="text-xs text-white/70">Priority support</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Intervention Templates by Tier */}
              <div className="pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-400">Intervention Templates</span>
                </div>
                <FeatureRow
                  name={`${currentTier === 'starter' ? '1' : currentTier === 'growth' ? '3' : currentTier === 'scale' ? '10' : 'Unlimited'} Premium Templates`}
                  enabled={true}
                />
                <FeatureRow name="Visual Template Gallery" enabled={true} />
                <FeatureRow name="Live Preview Mode" enabled={true} />
                <FeatureRow name="Brand Customization" enabled={true} />
                <FeatureRow name="A/B Testing" enabled={currentTier === 'growth' || currentTier === 'scale' || currentTier === 'enterprise'} />
                <FeatureRow name="Custom HTML/CSS" enabled={currentTier === 'enterprise'} />
              </div>

              {/* Core features - all tiers get these */}
              <FeatureRow name="Emotional tracking script" enabled={true} />
              <FeatureRow name="Real-time emotion detection" enabled={true} />
              <FeatureRow name="Behavioral interventions" enabled={true} />
              <FeatureRow name="Dashboard & analytics" enabled={true} />
              <FeatureRow name="GTM integration" enabled={true} />

              {/* Growth features */}
              <FeatureRow name="CRM integration" enabled={currentTier === 'growth' || currentTier === 'scale' || currentTier === 'enterprise'} />
              <FeatureRow name="Identity resolution" enabled={currentTier === 'growth' || currentTier === 'scale' || currentTier === 'enterprise'} />
              <FeatureRow name="Email interventions" enabled={currentTier === 'growth' || currentTier === 'scale' || currentTier === 'enterprise'} />
              <FeatureRow name="Slack alerts" enabled={currentTier === 'growth' || currentTier === 'scale' || currentTier === 'enterprise'} />

              {/* Scale features */}
              <FeatureRow name="Unlimited events" enabled={currentTier === 'scale' || currentTier === 'enterprise'} />
              <FeatureRow name="Custom webhooks" enabled={currentTier === 'scale' || currentTier === 'enterprise'} />
              <FeatureRow name="API access" enabled={currentTier === 'scale' || currentTier === 'enterprise'} />
              <FeatureRow name="Multi-domain" enabled={currentTier === 'scale' || currentTier === 'enterprise'} />

              {/* Enterprise features */}
              <FeatureRow name="Executive alerts" enabled={currentTier === 'enterprise'} />
              <FeatureRow name="Custom ML models" enabled={currentTier === 'enterprise'} />
              <FeatureRow name="White-label" enabled={currentTier === 'enterprise'} />
              <FeatureRow name="99.99% SLA" enabled={currentTier === 'enterprise'} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Active Intervention Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 glass-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Intervention Templates</h2>
          <Palette className="h-5 w-5 text-purple-400" />
        </div>

        <div className="grid gap-4">
          {/* Active Template */}
          {selectedTemplateId && (() => {
            const template = interventionTemplates.find(t => t.id === selectedTemplateId);
            if (!template) return null;
            return (
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <p className="text-sm text-white/60">{template.description}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">ACTIVE</span>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <a
                    href="/system/configuration?step=interventions"
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    Change Template →
                  </a>
                  <a
                    href={`/preview/${template.id}?tenant=${user?.id}`}
                    target="_blank"
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Available Templates Count */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Available Templates</p>
                <p className="text-2xl font-bold">
                  {currentTier === 'starter' ? '1' : currentTier === 'growth' ? '3' : currentTier === 'scale' ? '10' : 'Unlimited'}
                  <span className="text-sm text-white/40 ml-2">templates</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60">Template Types</p>
                <p className="text-sm font-semibold">Modal • Banner • Toast • Badge</p>
              </div>
            </div>
            {currentTier !== 'enterprise' && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <a
                  href="/pricing"
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  Upgrade to unlock more templates →
                </a>
              </div>
            )}
          </div>

          {/* Template Performance */}
          {selectedTemplateId && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-green-400">—</p>
                <p className="text-xs text-white/60 mt-1">Conversions</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-blue-400">—</p>
                <p className="text-xs text-white/60 mt-1">Impressions</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-purple-400">—%</p>
                <p className="text-xs text-white/60 mt-1">CTR</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Invoice History - Only for tenant admins */}
      {isTenantAdmin && !isSuperAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 glass-card p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Billing History</h2>
            <Calendar className="h-5 w-5 text-white/60" />
          </div>
          
          <div className="flex h-32 items-center justify-center rounded-xl border border-white/10 bg-black/30">
            <p className="text-white/40">Access billing history in the customer portal</p>
          </div>
        </motion.div>
      )}

      {/* Support Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 glass-card p-6 border-purple-500/20 bg-purple-500/5"
      >
        <div className="flex items-start gap-4">
          <Shield className="h-6 w-6 text-purple-400 flex-shrink-0" />
          <div>
            <h3 className="font-semibold">
              {isSuperAdmin ? 'Priority Support Channel' : 'Need help with billing?'}
            </h3>
            <p className="mt-1 text-sm text-white/70">
              {isSuperAdmin ? (
                <>
                  Direct line:{' '}
                  <a href="mailto:enterprise@sentientiq.ai" className="text-purple-400 hover:text-purple-300">
                    enterprise@sentientiq.ai
                  </a>
                </>
              ) : (
                <>
                  Contact us at{' '}
                  <a href="mailto:billing@sentientiq.ai" className="text-purple-400 hover:text-purple-300">
                    billing@sentientiq.ai
                  </a>
                  {' or check our '}
                  <a href="https://docs.sentientiq.ai/billing" className="text-purple-400 hover:text-purple-300">
                    billing documentation
                  </a>.
                </>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function FeatureRow({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={enabled ? 'text-white' : 'text-white/40'}>{name}</span>
      <div className={`h-5 w-5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-white/20'} flex items-center justify-center`}>
        {enabled && <span className="text-xs text-black">✓</span>}
      </div>
    </div>
  );
}