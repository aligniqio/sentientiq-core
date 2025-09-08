import React from 'react';

export default function ThirtyDayPath() {
  return (
    <section id="path" className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-semibold">Your 30-Day Path to 3x Conversion</h2>
        <p className="mt-3 text-white/70 max-w-2xl mx-auto">
          Follow this proven playbook to systematically improve your funnel performance
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6">
          <div className="text-sm text-emerald-400 font-medium">Days 1-10</div>
          <h3 className="mt-2 text-xl font-semibold">Quick Wins</h3>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>• Emotion-optimized paywall copy</li>
            <li>• Remove top 3 friction points</li>
            <li>• Add trust signals at key moments</li>
            <li>• Target: +2-3% conversion</li>
          </ul>
        </div>
        
        <div className="rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6">
          <div className="text-sm text-blue-400 font-medium">Days 11-20</div>
          <h3 className="mt-2 text-xl font-semibold">Systematic Changes</h3>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>• Implement tiered pricing</li>
            <li>• Launch onboarding overhaul</li>
            <li>• Deploy behavioral triggers</li>
            <li>• Target: +3-4% conversion</li>
          </ul>
        </div>
        
        <div className="rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6">
          <div className="text-sm text-purple-400 font-medium">Days 21-30</div>
          <h3 className="mt-2 text-xl font-semibold">Compound Effects</h3>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>• Personalized user journeys</li>
            <li>• Win-back automation</li>
            <li>• Referral incentives</li>
            <li>• Target: 9-10% total conversion</li>
          </ul>
        </div>
      </div>
    </section>
  );
}