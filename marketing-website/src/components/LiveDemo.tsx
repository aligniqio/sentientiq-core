import React from 'react';

const scripts = {
  pricing: [
`## 14-Day Moves`,
`- **Paywall ROI copy + guarantee** → Owner: PMM — ETA: 7d — **KPI:** conv +3 pts; **ARPU ≥ 85% baseline** — **Emotion:** fear ↓30%`,
`- **Starter tier experiment (40–60%)** with 3 value-locks → Owner: PM — ETA: 10d — **KPI:** +2 pts conv; Net revenue/trial ≥ control`,
`- **JIT trial extensions** for high-engage/no-"aha" cohort → Owner: CS Ops — ETA: 5d — **KPI (subset):** ≥ control conv`,
``,
`## 30–60 Day Moves`,
`- Pricing page with **value metric** & proof band; annual default`,
`- Weekly scheduled Boardroom on top funnel + onboarding`,
`- Slack/Email alerts when fear/anger spike`,
``,
`## Metrics & Guardrails`,
`- **Primary:** free→paid **3% → 9–10%** by Day 20`,
`- **Floors:** ARPU ≥ 85% baseline; refund ≤ +2 pts; 30-day churn ≤ baseline`,
`- **Stop:** if conv lift < +2 pts after 10 days **or** ARPU < 85%, revert paywall`
  ].join('\n'),
  
  onboarding: [
`## Immediate Actions`,
`- **Simplify setup flow** → Owner: UX — ETA: 5d — **KPI:** completion +15 pts; time-to-value -40%`,
`- **Interactive demo mode** → Owner: Eng — ETA: 8d — **KPI:** activation +20 pts; support tickets -25%`,
`- **Progress indicators** with celebration moments → Owner: Design — ETA: 3d — **KPI:** day-1 retention +10 pts`,
``,
`## Week 2-4 Improvements`,
`- Smart defaults based on user segment`,
`- Skip-able steps with "complete later" option`,
`- In-app guided tours for key features`,
``,
`## Success Metrics`,
`- **Target:** 80% completion rate within 10 minutes`,
`- **Activation:** 65% reach "aha moment" on day 1`,
`- **Support:** <5% contact rate during onboarding`
  ].join('\n'),
  
  churn: [
`## Retention Sprint`,
`- **Exit survey with incentive** → Owner: Research — ETA: 2d — **KPI:** 40% response rate; actionable insights`,
`- **Win-back email sequence** → Owner: Lifecycle — ETA: 5d — **KPI:** 8% reactivation within 30d`,
`- **Pause option** instead of cancel → Owner: Product — ETA: 7d — **KPI:** 25% choose pause vs cancel`,
``,
`## Prevention Strategy`,
`- Health score monitoring with alerts`,
`- Proactive outreach for at-risk accounts`,
`- Feature adoption campaigns`,
``,
`## Recovery Targets`,
`- **Voluntary churn:** <3% monthly`,
`- **Win-back rate:** 10% within 90 days`,
`- **Pause-to-resume:** 40% within 6 months`
  ].join('\n')
};

export default function LiveDemo() {
  const [selectedScript, setSelectedScript] = React.useState<keyof typeof scripts>('pricing');
  const [text, setText] = React.useState('');
  const [playing, setPlaying] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  const [ctaVariant, setCtaVariant] = React.useState<'answer' | 'debate'>('answer');

  React.useEffect(() => {
    const randomScript = Object.keys(scripts)[Math.floor(Math.random() * Object.keys(scripts).length)] as keyof typeof scripts;
    setSelectedScript(randomScript);
    
    setCtaVariant(Math.random() > 0.5 ? 'debate' : 'answer');
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  React.useEffect(() => {
    const script = scripts[selectedScript];
    const totalMs = 8000;
    
    if (prefersReducedMotion) {
      setText(script);
      setDone(true);
      setPlaying(false);
      return;
    }
    
    let id: number | undefined;
    let i = 0;
    const len = script.length;
    const step = Math.max(1, Math.floor(len / (totalMs / 16)));
    
    function tick() {
      i = Math.min(len, i + step + Math.floor(Math.random() * 2));
      setText(script.slice(0, i));
      if (i >= len) {
        setDone(true);
        setPlaying(false);
        cancelAnimationFrame(id!);
        return;
      }
      id = requestAnimationFrame(tick);
    }
    
    if (playing) {
      setDone(false);
      setText('');
      id = requestAnimationFrame(tick);
    }
    
    return () => {
      if (id) cancelAnimationFrame(id);
    };
  }, [playing, selectedScript, prefersReducedMotion]);

  function replay() { 
    setPlaying(true); 
  }
  
  function switchScript(type: keyof typeof scripts) {
    setSelectedScript(type);
    setPlaying(true);
  }

  React.useEffect(() => {
    if (!playing && !done) {
      setPlaying(true);
    }
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/10 grid place-items-center">
              <span aria-hidden>🧠</span>
            </div>
            <div>
              <div className="text-sm text-white/60">Live demo</div>
              <h3 className="text-xl font-semibold">Moderator Answer</h3>
              <p className="text-white/70 text-sm">
                What you get when you click <em>{ctaVariant === 'answer' ? 'Get Answer' : 'Start a Debate'}</em> — fast, focused, shippable.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!done ? (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span className="inline-flex h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
                Synthesizing…
              </div>
            ) : (
              <button className="px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/5 text-sm" onClick={replay}>
                Replay
              </button>
            )}
            {ctaVariant === 'answer' ? (
              <a className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 text-sm"
                 href="https://sentientiq.app">Get Answer</a>
            ) : (
              <a className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 text-sm"
                 href="https://sentientiq.app">Start a Debate</a>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          {['ROI Analyst','CRO Specialist','Emotion Scientist','Data Skeptic'].map(n=>(
            <span key={n} className="px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/80">{n}</span>
          ))}
          <span className="text-white/50">→ Moderator</span>
        </div>
        
        <div className="mt-3 flex gap-2">
          {Object.keys(scripts).map((type) => (
            <button
              key={type}
              onClick={() => switchScript(type as keyof typeof scripts)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                selectedScript === type 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/10 p-4">
          <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-white/90">
{text || `## ${selectedScript.charAt(0).toUpperCase() + selectedScript.slice(1)} Strategy\n…`}
          </pre>
        </div>

        <div className="mt-4 text-xs text-white/55">
          Tip: This is a simulated stream. In product, your personas debate live and the Moderator writes while you watch.
        </div>
      </div>
    </section>
  );
}