import React from 'react';

export default function CollectiveShowcase() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-900/5 border border-indigo-500/20 p-8">
        <h2 className="text-2xl md:text-3xl font-semibold">The Collective Intelligence Advantage</h2>
        <p className="mt-3 text-white/70">
          Every debate surfaces insights no single expert would catch alone
        </p>
        
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Traditional Approach</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>• Single perspective dominates</li>
              <li>• Blind spots remain hidden</li>
              <li>• Group-think reinforcement</li>
              <li>• Limited solution space</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">SentientIQ Debates</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>✓ 12+ expert perspectives clash</li>
              <li>✓ Contradictions surface truth</li>
              <li>✓ Bias cancellation built-in</li>
              <li>✓ 3x more actionable ideas</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-white/50 mb-2">Sample debate output</div>
          <p className="text-sm text-white/90 font-mono">
            "While the Growth Hacker pushes for aggressive discounting, the Pricing Strategist warns of 
            devaluation risk. The Behavioral Economist suggests time-limited scarcity instead, which the 
            Data Scientist confirms lifted conversion 4.2% in similar cohorts..."
          </p>
        </div>
      </div>
    </section>
  );
}