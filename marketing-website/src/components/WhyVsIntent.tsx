import React from 'react';

export default function WhyVsIntent() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-900/5 border border-red-500/20 p-6">
          <h3 className="text-xl font-semibold mb-3">Why Intent Isn't Enough</h3>
          <ul className="space-y-2 text-white/70 text-sm">
            <li>• High intent ≠ high conversion</li>
            <li>• Ignores emotional barriers</li>
            <li>• Misses timing and context</li>
            <li>• Can't predict objection patterns</li>
          </ul>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-900/5 border border-emerald-500/20 p-6">
          <h3 className="text-xl font-semibold mb-3">The SentientIQ Approach</h3>
          <ul className="space-y-2 text-white/70 text-sm">
            <li>• Maps emotional journey stages</li>
            <li>• Identifies friction moments</li>
            <li>• Predicts objection cascades</li>
            <li>• Prescribes timing interventions</li>
          </ul>
        </div>
      </div>
    </section>
  );
}