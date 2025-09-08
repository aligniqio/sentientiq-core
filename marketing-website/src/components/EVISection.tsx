import React from 'react';

export default function EVISection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-semibold">Emotional Velocity Index™</h2>
        <p className="mt-3 text-white/70 max-w-2xl mx-auto">
          The missing metric that predicts conversion better than any intent signal
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="text-center">
          <div className="text-4xl font-bold text-emerald-400">87%</div>
          <div className="mt-2 text-sm text-white/70">Correlation with conversion</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-400">2.4x</div>
          <div className="mt-2 text-sm text-white/70">More predictive than intent</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-purple-400">5 min</div>
          <div className="mt-2 text-sm text-white/70">To generate actionable insights</div>
        </div>
      </div>
      
      <div className="rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6">
        <h3 className="text-lg font-medium mb-4">How EVI Works</h3>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div className="space-y-2">
            <div className="text-white/50">1. Map</div>
            <div className="text-white/80">Track emotional states across your funnel</div>
          </div>
          <div className="space-y-2">
            <div className="text-white/50">2. Measure</div>
            <div className="text-white/80">Quantify fear, doubt, excitement patterns</div>
          </div>
          <div className="space-y-2">
            <div className="text-white/50">3. Model</div>
            <div className="text-white/80">Predict conversion likelihood by segment</div>
          </div>
          <div className="space-y-2">
            <div className="text-white/50">4. Modify</div>
            <div className="text-white/80">Deploy targeted emotional interventions</div>
          </div>
        </div>
      </div>
    </section>
  );
}