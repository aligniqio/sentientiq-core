import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, Zap, Building2, ArrowRight } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useCheckout } from '../lib/checkout';
import { useCandyToast } from '../components/ui/SenseiCandy';

const PLANS = [
  {
    name: 'Community',
    price: 0,
    interval: '',
    description: 'Taste the truth',
    features: [
      '20 questions/month to the Collective',
      'EVI Dashboard (1 hour delay)',
      'Basic "Why" explanations',
      'Community support',
    ],
    limitations: [
      'No feature breakdowns',
      'No consensus meter',
      'No API access',
    ],
    cta: 'Start Free',
    ctaAction: 'signup',
    popular: false,
  },
  {
    name: 'Pro',
    price: 199,
    interval: '/month',
    description: 'Professional intelligence',
    features: [
      'Unlimited questions (fair use)',
      'Live EVI (minute + hour)',
      'Full "Why" with feature breakdown',
      'Consensus meter unlocked',
      'Priority email support',
      'Export to CSV',
    ],
    limitations: [
      'Single user',
      'No API access',
    ],
    cta: 'Upgrade to Pro',
    ctaAction: 'checkout',
    stripePriceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    popular: true,
  },
  {
    name: 'Team',
    price: 999,
    interval: '/month',
    description: 'Intelligence for teams',
    features: [
      'Everything in Pro',
      '10 team seats',
      'Dedicated workspace',
      'Brand/topic tracking',
      'Feedback loop integration',
      'Slack integration',
      'API access (1000 calls/mo)',
      'Priority support',
    ],
    limitations: [],
    cta: 'Upgrade to Team',
    ctaAction: 'checkout',
    stripePriceId: import.meta.env.VITE_STRIPE_TEAM_PRICE_ID,
    popular: false,
  },
];

function PricingCard({ plan, onSelect }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-3xl border ${
        plan.popular
          ? 'border-violet-500/50 ring-2 ring-violet-500/20'
          : 'border-white/10'
      } bg-white/5 p-6 backdrop-blur-xl`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-sky-500 px-3 py-1 text-xs font-semibold">
            <Zap className="h-3 w-3" /> MOST POPULAR
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold">{plan.name}</h3>
        <p className="text-sm text-white/60">{plan.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-extrabold">
          {plan.price === 0 ? 'Free' : `$${plan.price}`}
        </span>
        <span className="text-white/60">{plan.interval}</span>
      </div>

      <div className="mb-6 space-y-2">
        {plan.features.map((feature: string) => (
          <div key={feature} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </div>
        ))}
        {plan.limitations.map((limitation: string) => (
          <div key={limitation} className="flex items-start gap-2">
            <X className="h-4 w-4 text-red-400/60 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-white/40">{limitation}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(plan)}
        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
          plan.popular
            ? 'bg-gradient-to-r from-violet-500 to-sky-500 shadow-lg shadow-violet-500/20 ring-1 ring-white/20 hover:brightness-110'
            : 'border border-white/15 bg-white/5 hover:bg-white/10'
        }`}
      >
        {plan.cta}
      </button>
    </motion.div>
  );
}

export default function Pricing() {
  const { isSignedIn } = useUser();
  const [loading, setLoading] = useState(false);
  const { checkout } = useCheckout();
  const { push } = useCandyToast();

  async function handlePlanSelect(plan: any) {
    if (plan.ctaAction === 'signup') {
      if (!isSignedIn) {
        window.location.href = '/';
      }
      return;
    }

    if (plan.ctaAction === 'checkout' && plan.stripePriceId) {
      setLoading(true);
      try {
        await checkout(plan.stripePriceId);
      } catch (error) {
        console.error('Checkout error:', error);
        push({ kind: 'error', msg: 'Failed to start checkout. Please try again.' });
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0a0a12_0%,#0b0b14_100%)] text-white">
      {/* Neural backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_18%_-10%,rgba(124,58,237,0.16),transparent_60%),radial-gradient(800px_500px_at_82%_110%,rgba(56,189,248,0.14),transparent_60%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Header */}
        <div className="mb-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-5xl font-extrabold tracking-tight"
          >
            Pricing that respects intelligence
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-white/70"
          >
            While others charge $100k for Math.random(), we charge fairly for real neural intelligence.
          </motion.p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              onSelect={handlePlanSelect}
            />
          ))}
        </div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-r from-violet-500/10 to-sky-500/10 p-8 text-center backdrop-blur-xl"
        >
          <div className="mb-6 flex justify-center">
            <Building2 className="h-12 w-12 text-violet-300" />
          </div>
          <h3 className="mb-2 text-2xl font-bold">Enterprise</h3>
          <p className="mb-6 text-white/70">
            Custom models, unlimited API, dedicated support, and SLA.
            <br />
            Starting at $5,000/month.
          </p>
          <a
            href="mailto:truth@sentientiq.ai?subject=Enterprise%20Inquiry"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-500/20 ring-1 ring-white/20 hover:brightness-110"
          >
            Talk to Sales <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>

        {/* Trust builders */}
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <Sparkles className="mb-2 h-5 w-5 text-violet-300" />
            <h4 className="font-semibold">No Math.random()</h4>
            <p className="mt-1 text-sm text-white/60">
              Real neural intelligence, not random numbers
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <Zap className="mb-2 h-5 w-5 text-emerald-300" />
            <h4 className="font-semibold">Cancel anytime</h4>
            <p className="mt-1 text-sm text-white/60">
              No contracts, no minimums, just truth
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <Check className="mb-2 h-5 w-5 text-sky-300" />
            <h4 className="font-semibold">7-day trial</h4>
            <p className="mt-1 text-sm text-white/60">
              Try Pro features free for a week
            </p>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-violet-500" />
              <p>Redirecting to checkout...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}