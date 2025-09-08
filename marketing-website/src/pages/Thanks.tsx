import React from 'react';
import SEO from '@/components/SEO';

function useQuery() {
  const s = typeof window !== 'undefined' ? window.location.search : '';
  return React.useMemo(() => new URLSearchParams(s), [s]);
}

export default function Thanks() {
  const qp = useQuery();
  const sessionId = qp.get('session_id') || '';
  const plan = (qp.get('plan') || 'pro').toLowerCase();
  const siteUrl =
    (import.meta as any)?.env?.VITE_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');

  React.useEffect(() => {
    try {
      fetch('/api/usage/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'checkout_success', meta: { plan, sessionId } })
      });
    } catch {}
  }, [sessionId, plan]);

  return (
    <>
      <SEO
        siteUrl={siteUrl}
        path="/thanks"
        title="Thanks — SentientIQ"
        description="You're in."
        noindex
      />
      <main className="min-h-[70vh] bg-black text-white relative overflow-hidden">
        <Confetti />
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
          <img src="/logo.png" alt="SentientIQ" className="mx-auto h-10 w-10 opacity-90" />
          <h1 className="mt-4 text-3xl md:text-4xl font-semibold">
            You're in. {plan === 'team' ? 'Team' : 'Pro'} unlocked.
          </h1>
          <p className="mt-3 text-white/75">
            Your first <strong>Boardroom Debate</strong> is queued and scheduling is on.
            Check email for receipt & quick-start.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a className="px-4 py-3 rounded-lg bg-white text-black hover:bg-white/90"
               href="https://sentientiq.app/login">Go to the app</a>
            <a className="px-4 py-3 rounded-lg border border-white/20 hover:bg-white/5"
               href="https://sentientiq.app/boardroom?demo=1">Open a demo debate</a>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
            <a className="px-3 py-2 rounded-lg border border-white/15 hover:bg-white/5"
               href="https://sentientiq.app/invite">Invite your team</a>
            <a className="px-3 py-2 rounded-lg border border-white/15 hover:bg-white/5"
               href="https://sentientiq.ai/#path">See the 30-day path</a>
            <a className="px-3 py-2 rounded-lg border border-white/15 hover:bg-white/5"
               href="https://cal.com/your-handle/15">Book a 15-min kickoff</a>
          </div>

          <div className="mt-10 rounded-2xl bg-white/[0.03] border border-white/10 p-5 text-left">
            <div className="text-sm text-white/60">Quick-start checklist</div>
            <ul className="mt-2 text-white/80 text-sm space-y-2 list-disc list-inside">
              <li>Click <em>Get Answer</em> for a fast, shippable plan</li>
              <li>Schedule a weekly Boardroom on your top funnel metric</li>
              <li>Turn on Daily Refresh (1 insight/day)</li>
              <li>Invite PMM, Growth, and CS (2–3 teammates)</li>
            </ul>
          </div>

          <p className="mt-8 text-xs text-white/50">
            Need help? <a className="underline decoration-white/30 hover:decoration-white" href="mailto:hello@sentientiq.ai">hello@sentientiq.ai</a>
          </p>
        </div>
      </main>
    </>
  );
}

function Confetti() {
  React.useEffect(() => {
    const n = 60;
    const root = document.createElement('div');
    root.style.position = 'absolute';
    root.style.inset = '0';
    root.style.pointerEvents = 'none';
    document.body.appendChild(root);
    
    const colors = ['#a78bfa', '#22d3ee', '#34d399', '#f59e0b', '#f472b6'];
    
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.width = '6px';
      el.style.height = '10px';
      el.style.background = colors[i % colors.length];
      el.style.opacity = '0.9';
      el.style.top = '-10px';
      el.style.left = Math.random() * 100 + '%';
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
      el.style.borderRadius = '2px';
      root.appendChild(el);
      
      const x = (Math.random() * 60 - 30);
      const y = 100 + Math.random() * 20;
      const rot = (Math.random() * 720 - 360);
      
      el.animate([
        { transform: `translate(0,0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x}vw, ${y}vh) rotate(${rot}deg)`, opacity: 0.2 }
      ], {
        duration: 2200 + Math.random() * 1000,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        delay: Math.random() * 400,
        fill: 'forwards'
      });
    }
    
    return () => root.remove();
  }, []);
  
  return null;
}