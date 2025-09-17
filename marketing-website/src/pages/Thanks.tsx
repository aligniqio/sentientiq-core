import React from 'react';
import SEO from '@/components/SEO';
import NeuralBackground from '@/components/NeuralBackground';

function useQuery() {
  const s = typeof window !== 'undefined' ? window.location.search : '';
  return React.useMemo(() => new URLSearchParams(s), [s]);
}

export default function Thanks() {
  const qp = useQuery();
  const sessionId = qp.get('session_id') || '';
  const plan = (qp.get('plan') || 'starter').toLowerCase();
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

  const planName = plan === 'scale' ? 'Scale' : plan === 'growth' ? 'Growth' : 'Starter';

  return (
    <>
      <SEO
        siteUrl={siteUrl}
        path="/thanks"
        title="Welcome to SentientIQ — The Emotions Are Already Flowing"
        description="Your emotional intelligence engine is ready. Time to see WHO is feeling WHAT."
        noindex
      />
      <main className="min-h-screen bg-black text-white relative overflow-hidden">
        <NeuralBackground />
        <Confetti />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-16 text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">⚡</div>
            <h1 className="text-5xl md:text-7xl font-bold">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                EMOTIONAL INTELLIGENCE
              </span>
              <br />
              <span className="text-white">ACTIVATED</span>
            </h1>
          </div>

          <div className="card border-green-500/20 bg-green-900/5 p-8 mb-8">
            <h2 className="text-3xl font-bold text-green-400 mb-4">
              {planName} Plan Confirmed
            </h2>
            <p className="text-xl text-white/80">
              Your emotional detection engine is ready to deploy.
            </p>
            <p className="text-lg text-white/60 mt-2">
              Check your email for setup instructions and API keys.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="card p-6 text-left">
              <h3 className="text-xl font-bold mb-4 text-purple-400">🚀 Next Steps</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Add one line to your app: <code className="text-xs bg-white/10 px-2 py-1 rounded">SentientIQ.init('your_key')</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Identify logged-in users: <code className="text-xs bg-white/10 px-2 py-1 rounded">SentientIQ.identify(user)</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Watch emotions flow in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Set up your first intervention rule</span>
                </li>
              </ul>
            </div>

            <div className="card p-6 text-left">
              <h3 className="text-xl font-bold mb-4 text-amber-400">⚡ What Happens Now</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">→</span>
                  <span>300ms emotion detection on your site</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">→</span>
                  <span>Identity resolution linking emotions to users</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">→</span>
                  <span>Automated interventions before abandonment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">→</span>
                  <span>Weekly accountability scorecard</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="card border-purple-500/20 bg-purple-900/5 p-8 mb-8">
            <h3 className="text-2xl font-bold mb-4">Your First 48 Hours</h3>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              <div className="p-4 bg-black/30 rounded-lg">
                <div className="text-3xl mb-2">0-30min</div>
                <p className="text-sm text-white/70">Install SDK, identify users, watch emotions flow</p>
              </div>
              <div className="p-4 bg-black/30 rounded-lg">
                <div className="text-3xl mb-2">2-6hrs</div>
                <p className="text-sm text-white/70">First rage detection, abandonment prevented</p>
              </div>
              <div className="p-4 bg-black/30 rounded-lg">
                <div className="text-3xl mb-2">24-48hrs</div>
                <p className="text-sm text-white/70">Pattern recognition, intervention optimization</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <a
              href={`/auth?redirect=/onboarding-welcome${sessionId ? `?session_id=${sessionId}&from=stripe` : ''}`}
              className="block card p-6 hover:border-green-500/40 transition-all bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-2 border-green-500/50"
            >
              <span className="text-2xl font-bold text-green-400">🚀 Go to Your Dashboard</span>
              <p className="text-white/60 mt-2">Sign in or create your account to start setup</p>
            </a>

            <a
              href="https://docs.sentientiq.ai/quickstart"
              className="block card p-6 hover:border-purple-500/40 transition-all"
            >
              <span className="text-2xl font-bold text-purple-400">📚 Read the 5-Minute Setup Guide</span>
              <p className="text-white/60 mt-2">Everything you need to go live today</p>
            </a>

            <a
              href="mailto:hello@sentientiq.ai?subject=Just%20Joined%20-%20Need%20Help%20With%20Setup"
              className="block card p-6 hover:border-blue-500/40 transition-all"
            >
              <span className="text-2xl font-bold text-blue-400">💬 Get Direct Setup Help</span>
              <p className="text-white/60 mt-2">We'll walk you through implementation live</p>
            </a>
          </div>

          <div className="text-center">
            <p className="text-xl text-white/50 mb-2">Welcome to the revolution.</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Stop guessing. Start knowing.
            </p>
          </div>
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
    root.style.zIndex = '20';
    document.body.appendChild(root);
    
    const colors = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.width = '8px';
      el.style.height = '8px';
      el.style.background = colors[i % colors.length];
      el.style.opacity = '0.9';
      el.style.top = '-10px';
      el.style.left = Math.random() * 100 + '%';
      el.style.borderRadius = '50%';
      el.style.boxShadow = `0 0 6px ${colors[i % colors.length]}`;
      root.appendChild(el);
      
      const x = (Math.random() * 100 - 50);
      const y = 120 + Math.random() * 20;
      
      el.animate([
        { transform: `translate(0,0) scale(1)`, opacity: 1 },
        { transform: `translate(${x}vw, ${y}vh) scale(0.2)`, opacity: 0 }
      ], {
        duration: 3000 + Math.random() * 2000,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        delay: Math.random() * 500,
        fill: 'forwards'
      });
    }
    
    setTimeout(() => root.remove(), 6000);
    return () => root.remove();
  }, []);
  
  return null;
}