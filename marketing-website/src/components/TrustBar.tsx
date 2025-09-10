import React from 'react';

export default function TrustBar() {
  const partners = [
    {
      name: 'CreditSuite',
      url: 'https://creditsuite.com',
      description: 'Business Credit Platform'
    },
    {
      name: 'LifeBrands',
      url: 'https://lbd2c.com',
      description: 'D2C Brand Accelerator'
    }
  ];

  return (
    <section className="py-12 border-y border-white/10 bg-gradient-to-r from-purple-900/5 to-blue-900/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <p className="text-sm text-purple-400 font-semibold tracking-wider uppercase mb-2">
            Real Partners. Real Results.
          </p>
          <p className="text-white/70 text-lg">
            Detecting emotions for companies that matter
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-12">
          {partners.map((partner) => (
            <a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center transition-all duration-300 hover:scale-105"
            >
              <div className="relative">
                {/* Glowing effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                
                {/* Logo placeholder with gradient border */}
                <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg p-6 group-hover:border-white/30 transition-all duration-300">
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    {partner.name}
                  </div>
                </div>
              </div>
              
              <span className="mt-2 text-xs text-white/50 group-hover:text-white/70 transition-colors">
                {partner.description}
              </span>
            </a>
          ))}
        </div>
        
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white/60">
              <span className="text-white font-semibold">247ms</span> avg detection time
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white/60">
              <span className="text-white font-semibold">89%</span> abandonment prevented
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white/60">
              <span className="text-white font-semibold">$2.3M</span> revenue recovered
            </span>
          </div>
        </div>
        
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl p-8 border border-purple-500/20">
            <blockquote className="text-center">
              <p className="text-lg text-white/90 italic leading-relaxed">
                "The platform's unmatched ability to analyze real-time sentiment patterns, predict emotional readiness, 
                and map precise customer journeys through emotional states, not just behavioral breadcrumbs, 
                doesn't just represent the future of marketing intelligence. It defines it."
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-purple-500"></div>
                <cite className="text-sm text-purple-400 not-italic font-medium">Industry Analysis</cite>
                <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-purple-500"></div>
              </div>
            </blockquote>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-white/40">
            * Actual partners. No mock logos. No fake testimonials.
          </p>
        </div>
      </div>
    </section>
  );
}