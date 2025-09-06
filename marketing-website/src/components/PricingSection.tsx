import React, { useState } from 'react';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    Stripe?: any;
  }
}

export default function PricingSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'growth' | 'enterprise'>('growth');

  const handleCheckout = async (priceId: string, planName: string) => {
    setIsLoading(true);
    
    // Direct to public onboarding with plan preselected (no auth required)
    setTimeout(() => {
      window.open(`https://app.sentientiq.ai/start?plan=${priceId}&checkout=true`, '_blank');
      setIsLoading(false);
    }, 500);
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$99',
      period: '/month',
      priceId: 'price_starter',
      color: 'from-blue-500 to-cyan-500',
      features: [
        '✅ Truth verification tools',
        '✅ 100 PhD consultations/month',
        '✅ Email intelligence only',
        '✅ Real-time intelligence alerts',
        '✅ Basic emotional analysis',
        '❌ Slack integration',
        '❌ Custom PhD training',
        '❌ White-label options'
      ],
      description: 'Perfect for individuals seeking truth'
    },
    {
      id: 'growth',
      name: 'Professional',
      price: '$499',
      period: '/month',
      priceId: 'price_growth',
      color: 'from-purple-500 to-pink-500',
      features: [
        '✅ Everything in Starter',
        '✅ Unlimited PhD consultations',
        '✅ Slack + Email intelligence',
        '✅ Real-time emotional heatmaps',
        '✅ Competitive intelligence dashboard',
        '✅ Custom PhD personalities',
        '✅ Priority support',
        '❌ White-label options'
      ],
      description: 'For teams ready to measure substance',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      priceId: 'price_enterprise',
      color: 'from-orange-500 to-red-500',
      features: [
        '✅ Everything in Intelligence Force',
        '✅ White-label deployment',
        '✅ Custom PhD board of advisors',
        '✅ On-premise option available',
        '✅ API access for integration',
        '✅ Dedicated success manager',
        '✅ Custom emotional models',
        '✅ SLA guarantees'
      ],
      description: 'For organizations becoming the truth'
    }
  ];

  return (
    <section className="relative py-32 px-6 bg-gradient-to-b from-black via-purple-950/10 to-black">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Buy Truth. Today.
            </span>
          </h2>
          <p className="text-2xl text-white/60">
            No sales calls. No demos. No negotiations.
            <br />
            <span className="text-white font-semibold">Just click and own intelligence.</span>
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedPlan(plan.id as any)}
              className={`relative bg-white/5 backdrop-blur-xl rounded-2xl p-8 border-2 cursor-pointer transition-all ${
                selectedPlan === plan.id 
                  ? 'border-purple-500 shadow-2xl shadow-purple-500/20' 
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                    MOST POPULAR
                  </div>
                </div>
              )}

              <div className={`bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                <h3 className="text-3xl font-bold mb-2">{plan.name}</h3>
              </div>
              
              <p className="text-white/60 mb-6">{plan.description}</p>
              
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">{plan.price}</span>
                <span className="text-white/60">{plan.period}</span>
              </div>

              <div className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="text-sm text-white/80">
                    {feature}
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (plan.id === 'enterprise') {
                    window.location.href = 'mailto:truth@sentientiq.ai?subject=Enterprise Reality Engine';
                  } else {
                    handleCheckout(plan.priceId, plan.name);
                  }
                }}
                disabled={isLoading}
                className={`w-full py-4 rounded-lg font-bold transition-all ${
                  selectedPlan === plan.id
                    ? `bg-gradient-to-r ${plan.color} text-white hover:opacity-90`
                    : 'bg-white/10 text-white hover:bg-white/20'
                } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⚡</span>
                    Activating intelligence...
                  </span>
                ) : plan.id === 'enterprise' ? (
                  'Contact Us →'
                ) : (
                  'Start Now →'
                )}
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 backdrop-blur rounded-xl p-8 max-w-2xl mx-auto border border-green-500/30">
            <h3 className="text-2xl font-bold mb-4 text-green-400">
              The SentientIQ Guarantee
            </h3>
            <p className="text-white/80 mb-4">
              If you don't see measurable improvement in decision quality within 30 days,
              <span className="text-green-400 font-bold"> full refund. No questions.</span>
            </p>
            <div className="flex justify-center gap-8 text-sm text-white/60">
              <div>✅ Cancel anytime</div>
              <div>✅ No contracts</div>
              <div>✅ Instant activation</div>
            </div>
          </div>
        </motion.div>

        <div className="mt-12 text-center text-white/40 text-sm">
          <p>Secure payment via Stripe. Your data never touches our servers.</p>
          <p>Questions? Email truth@sentientiq.ai - We respond in minutes, not days.</p>
        </div>
      </div>
    </section>
  );
}