import React from 'react';

export default function ValueProps() {
  const items = [
    { h: 'Real emotions, not intent guesses', p: 'Deterministic reads from real experience—joy, anger, fear, trust—not fuzzy intent scores.' },
    { h: '3-second onboarding', p: 'Start free. No scripts to paste. No cookies to consent.' },
    { h: 'Daily Refresh', p: 'One small recommendation each day with evidence snippets you can share.' },
    { h: 'Boardroom Debate', p: 'When it matters, invite the full 12-persona faculty to argue it out.' },
  ];
  return (
    <section id="value" className="section py-16">
      <div className="grid md:grid-cols-2 gap-6">
        {items.map((it,i)=>(
          <div key={i} className="card">
            <h3 className="text-xl font-semibold">{it.h}</h3>
            <p className="mt-2 text-white/70">{it.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
