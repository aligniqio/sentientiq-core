import { useState } from 'react';

type CheckoutResponse = { url: string };

export async function startCheckout(priceId: string, opts?: { timeoutMs?: number }) {
  if (!priceId) throw new Error('Missing Stripe price id');

  const timeoutMs = opts?.timeoutMs ?? 15000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ priceId }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
      throw new Error(`Checkout failed: ${msg}`);
    }

    const data = (await res.json().catch(async () => {
      const t = await res.text().catch(() => '');
      throw new Error(`Invalid server response${t ? `: ${t.slice(0, 180)}` : ''}`);
    })) as CheckoutResponse;

    if (!data?.url) throw new Error('Server did not return a checkout URL.');
    window.location.assign(data.url);
  } finally {
    clearTimeout(timer);
  }
}

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (priceId: string | undefined, tierName: string) => {
    if (!priceId) {
      setError(`Price ID not configured for ${tierName}`);
      return;
    }
    
    setLoading(tierName);
    setError(null);
    
    try {
      await startCheckout(priceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(null);
    }
  };

  const tiers = [
    {
      name: 'Starter',
      price: '$497',
      period: '/month',
      tagline: 'Real emotions. Real predictions.',
      features: [
        'Detect rage in 300ms, prevent abandonment in 3s',
        'Live emotional state tracking across your site',
        'Behavioral physics engine (no probabilities)',
        'Weekly accountability scorecard',
        'PhD Collective Boardroom (included free)',
        'Up to 10,000 monthly sessions'
      ],
      cta: 'Start Detecting',
      priceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID,
      popular: false
    },
    {
      name: 'Growth',
      price: '$1,997',
      period: '/month',
      tagline: 'Learn. Predict. Intervene.',
      features: [
        'Everything in Starter, plus:',
        'Machine learning pattern evolution',
        'Predictive abandonment interventions',
        'Revenue impact tracking & attribution',
        'Custom emotional triggers & responses',
        'Unlimited Boardroom debates',
        'Up to 100,000 monthly sessions'
      ],
      cta: 'Start Predicting',
      priceId: import.meta.env.VITE_STRIPE_GROWTH_PRICE_ID,
      popular: true
    },
    {
      name: 'Scale',
      price: '$4,997',
      period: '/month',
      tagline: 'Your proprietary data moat.',
      features: [
        'Everything in Growth, plus:',
        'Unlimited sessions & pattern storage',
        'Cross-property emotional journey mapping',
        'API access for custom integrations',
        'Custom PhD personas for your industry',
        'Dedicated success manager',
        'Quarterly business reviews with ROI analysis'
      ],
      cta: 'Build Your Moat',
      priceId: import.meta.env.VITE_STRIPE_SCALE_PRICE_ID,
      popular: false
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      tagline: 'White-glove emotional intelligence.',
      features: [
        'Custom emotion detection models',
        'Private deployment options',
        'Real-time data streaming',
        'Multi-brand & multi-property support',
        'SLA with 99.99% uptime guarantee',
        'Executive quarterly insights briefing'
      ],
      cta: 'Contact Sales',
      href: 'mailto:enterprise@sentientiq.ai?subject=Enterprise%20Emotional%20Intelligence',
      priceId: null,
      popular: false
    }
  ];

  return (
    <section id="pricing" className="section py-20">
      <div className="text-center">
        <p className="kicker">Investment</p>
        <h2 className="mt-2 text-4xl font-bold">The cost of not knowing why they leave</h2>
        <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
          We show you exactly how much revenue walks away while you're looking at bounce rates.
          No free tier. This is behavioral physics, not a GPT wrapper.
        </p>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md mx-auto">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => (
          <div 
            key={tier.name}
            className={`card relative ${tier.popular ? 'border-purple-500/50 shadow-purple-500/20 shadow-xl' : ''}`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}
            
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-xl font-bold">{tier.name}</h3>
              <p className="mt-2 text-sm text-purple-400 font-medium">{tier.tagline}</p>
              
              <div className="mt-4">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-white/60">{tier.period}</span>
              </div>
              
              <ul className="mt-6 space-y-3 flex-grow">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8">
                {tier.href ? (
                  <a 
                    href={tier.href}
                    className={`btn-primary w-full text-center ${tier.popular ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}`}
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <button 
                    onClick={() => handleCheckout(tier.priceId, tier.name)}
                    disabled={loading === tier.name}
                    className={`btn-primary w-full ${tier.popular ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''} 
                      ${loading === tier.name ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {loading === tier.name ? 'Loading...' : tier.cta}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-white/50">
          🔒 Secure checkout via Stripe • Cancel anytime • No setup fees
        </p>
      </div>
    </section>
  );
}