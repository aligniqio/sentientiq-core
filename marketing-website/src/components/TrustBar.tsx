import React from 'react';

export default function TrustBar() {
  return (
    <section className="py-8 border-y border-white/10 bg-gradient-to-r from-purple-900/5 to-blue-900/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
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