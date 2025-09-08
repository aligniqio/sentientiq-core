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
      name: 'Free',
      price: '$0',
      period: '',
      tagline: 'Start with EI micro-debates.',
      features: [
        '1 insight per day (Daily Refresh)',
        'Two-persona micro-debates',
        'Boardroom preview (4 personas, limited runs)',
        'Short answer + Why (no export)',
        'Shareable evidence snippets (recent 5)'
      ],
      cta: 'Start free',
      href: 'https://sentientiq.app/signup',
      priceId: null,
      popular: false
    },
    {
      name: 'Pro',
      price: '$99',
      period: '/month',
      tagline: 'Full Boardroom + executive briefs.',
      features: [
        '12-persona Boardroom debates',
        'Executive brief (email + Save to Library)',
        'Schedule weekly debates',
        'Edit & publish personas',
        '3 seats for team collaboration'
      ],
      cta: 'Start Pro',
      priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
      popular: true
    },
    {
      name: 'Team',
      price: '$399',
      period: '/month',
      tagline: 'Shared library, scheduling, admin.',
      features: [
        '10–25 seats with RBAC',
        'Recurring debates (multi-cadence)',
        'Persona collections (versioning & approvals)',
        'API/Webhooks + Slack/email notifications',
        'Admin console & audit trail (SSO-ready)'
      ],
      cta: 'Start Team',
      priceId: import.meta.env.VITE_STRIPE_TEAM_PRICE_ID,
      popular: false
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      tagline: 'Private, compliant, custom models.',
      features: [
        'Private/VPC options & data residency',
        'Custom persona libraries & playbooks',
        'Model routing (OpenAI / Anthropic / Groq)',
        'SCIM, advanced RBAC, SSO',
        '99.9%+ SLA & dedicated support'
      ],
      cta: 'Contact Sales',
      href: 'mailto:enterprise@sentientiq.ai?subject=Enterprise%20Inquiry',
      priceId: null,
      popular: false
    }
  ];

  return (
    <section id="pricing" className="section py-20">
      <div className="text-center">
        <p className="kicker">Pricing</p>
        <h2 className="mt-2 text-4xl font-bold">Simple pricing that scales with you</h2>
        <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
          Start free with micro-debates. Upgrade to full Boardroom when you need decisive answers.
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
            
            <div className="p-6">
              <h3 className="text-xl font-bold">{tier.name}</h3>
              <p className="mt-2 text-sm text-purple-400 font-medium">{tier.tagline}</p>
              
              <div className="mt-4">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-white/60">{tier.period}</span>
              </div>
              
              <ul className="mt-6 space-y-3">
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