// Marketing Landing Page - sentientiq.ai
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Activity, Brain, Sparkles, CheckCircle2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

type PulseItem = { agent: string; evi: number; ts: string; window_seconds: number };
type PulsePayload = { generated_at: string; items: PulseItem[] } | null;

function LivePill({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium ring-1 ring-white/10">
      <span className="relative flex h-2.5 w-2.5">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? "bg-emerald-400" : "bg-amber-400"}`} />
      </span>
      {live ? "LIVE" : "OFFLINE"}
    </span>
  );
}

export default function Landing() {
  const [live, setLive] = useState(false);
  const [pulse, setPulse] = useState<PulsePayload>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const v = await fetch(`${API_BASE}/version`, { cache: "no-store" });
        if (!v.ok) throw new Error();
        const p = await fetch(`${API_BASE}/pulse/snapshot`, { cache: "no-store" });
        if (cancelled) return;
        setLive(v.ok && p.ok);
        if (p.ok) setPulse(await p.json());
      } catch {
        if (!cancelled) setLive(false);
      }
    }
    check();
    const id = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const ticker = useMemo(() => {
    const items = pulse?.items || [];
    const lastByAgent = new Map<string, PulseItem>();
    for (const it of items) if (it.window_seconds === 60) lastByAgent.set(it.agent, it);
    return Array.from(lastByAgent.values())
      .sort((a, b) => b.evi - a.evi)
      .slice(0, 8);
  }, [pulse]);

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#0a0a12_0%,#0b0b14_100%)] text-white">
      {/* subtle neural lightfield */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_18%_-10%,rgba(124,58,237,0.16),transparent_60%),radial-gradient(800px_500px_at_82%_110%,rgba(56,189,248,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_40%,rgba(255,255,255,0.04),transparent)]" />
      </div>

      {/* HERO */}
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pt-20 pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-balance text-5xl font-extrabold tracking-tight sm:text-6xl"
        >
          The First Brain Built for Marketing Truth.
        </motion.h1>
        <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="max-w-2xl text-lg text-white/70"
        >
          12 PhDs. Real neural intelligence. Answers with a <span className="text-white">Why</span>.
        </motion.p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/ask"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-sky-500 px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-500/20 ring-1 ring-white/20 hover:brightness-110"
          >
            Ask the Collective <ArrowRight className="h-4 w-4" />
          </a>
          <a href="/how" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold">
            See How It Works
          </a>
          <div className="ml-auto">
            <LivePill live={live} />
          </div>
        </div>
      </section>

      {/* PhD COLLECTIVE VALUE PROPOSITION */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-3xl bg-gradient-to-br from-purple-900/30 via-indigo-900/30 to-blue-900/30 backdrop-blur-xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-500/10"
        >
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              24,000 PhD Equivalents
            </h2>
            <p className="text-2xl text-white/90 font-semibold mb-2">
              320 Billion Training Tokens
            </p>
            <p className="text-xl text-white/70">
              The largest concentration of analytical intelligence ever assembled for business strategy
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">12</div>
              <div className="text-sm text-white/60">Specialized AI Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">240B</div>
              <div className="text-sm text-white/60">Words Processed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">24,000</div>
              <div className="text-sm text-white/60">PhD Equivalents</div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-lg font-bold text-white mb-2">
              This isn't marketing. It's math.
            </p>
            <p className="text-sm text-white/60">
              No single human consultant, no matter how brilliant, has read this much,<br />
              analyzed this deeply, or can synthesize this broadly.
            </p>
          </div>
        </motion.div>
      </section>

      {/* PROOF OF LIFE */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-sky-500/25 ring-1 ring-white/15">
                <Brain className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <div className="text-sm font-semibold">PhD Collective is online</div>
                <div className="text-xs text-white/60">Real agents. Real models. No Math.random() theater.</div>
              </div>
            </div>
            <div className="ml-auto text-sm">
              <a href="/evi" className="text-violet-300 hover:text-violet-200 inline-flex items-center gap-2">
                View EVI Dashboard <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
          {/* ticker */}
          {ticker.length > 0 && (
            <div className="mt-4 overflow-hidden whitespace-nowrap border-t border-white/10 pt-3 text-xs font-mono text-white/80">
              <div className="animate-[marquee_20s_linear_infinite] inline-block">
                {ticker.map((t, i) => (
                  <span key={i} className="mx-6">
                    {t.agent}: <span className="font-semibold text-emerald-300">{t.evi.toFixed(1)}</span>
                  </span>
                ))}
              </div>
              <style>{`@keyframes marquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}`}</style>
            </div>
          )}
        </div>
      </section>

      {/* FACULTY GRID */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Strategy", "Revenue is a lagging indicator of emotion"],
            ["Emotion", "People buy feelings, not features"],
            ["Chaos", "Volatility is opportunity disguised as risk"],
            ["Brutal", "Hope is not a strategy. Data is"],
            ["ROI", "Every emotion has a price. Most are undervalued"],
            ["Identity", "Resonance beats reach"],
            ["Pattern", "Everything repeats if you zoom out"],
            ["Warfare", "Win market share by timing, not shouting"],
            ["Omni", "Every channel, same feeling"],
            ["First", "Onboarding is destiny"],
            ["Truth", "Attribution without emotion is a lie"],
            ["Context", "The right answer in the wrong moment is wrong"],
          ].map(([name, line]) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/20 to-sky-500/20 opacity-0 blur-2xl transition group-hover:opacity-20" />
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Sparkles className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <div className="font-semibold">{name}</div>
                  <div className="mt-1 text-sm text-white/70">{line}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* EVI SECTION */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-sky-500/25 ring-1 ring-white/15">
                <Activity className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">EVI™ — Emotional Volatility Index</h2>
                <p className="text-sm text-white/70">Know when to launch. Know when to wait.</p>
              </div>
            </div>
            <div className="ml-auto">
              <a href="/evi" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm">
                View Dashboard <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
          {/* minimalist sparkline placeholder */}
          <div className="mt-4 h-24 w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
            {/* simple SVG sparkline from ticker */}
            <svg viewBox="0 0 600 96" className="h-full w-full">
              <polyline
                fill="none"
                stroke="url(#g)"
                strokeWidth="2"
                points={(() => {
                  const arr = (pulse?.items || [])
                    .filter(i => i.window_seconds === 60)
                    .slice(-40);
                  if (arr.length < 2) return "0,48 600,48";
                  return arr
                    .map((p, idx) => {
                      const x = (idx / (arr.length - 1)) * 600;
                      const y = 96 - (p.evi / 100) * 96;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(" ");
                })()}
              />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Truth", "Expose fraud and randomness. See the real emotional signal."],
            ["Speed", "Answers live, not quarterly. Deploy on sentiment, not slides."],
            ["Learning", "Every Ask/Why/Outcome trains the faculty. It gets smarter daily."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> {title}
              </div>
              <p className="mt-2 text-sm text-white/70">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-violet-500/20 via-sky-500/20 to-emerald-500/20 opacity-10 blur-2xl" />
          <div className="flex flex-wrap items-center gap-4">
            <h3 className="text-2xl font-bold">Stop guessing. Start listening to emotion.</h3>
            <a
              href="/ask"
              className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-sky-500 px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-500/20 ring-1 ring-white/20 hover:brightness-110"
            >
              Ask the Collective <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-6xl px-6 pb-12">
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
          <span>© {new Date().getFullYear()} SentientIQ</span>
          <a href="/how" className="hover:text-white">How it Works</a>
          <a href="https://github.com/sentientiq/docs" className="hover:text-white">Docs</a>
          <a href="mailto:truth@sentientiq.ai" className="hover:text-white">Contact</a>
          <span className="ml-auto"><LivePill live={live} /></span>
        </div>
      </footer>
    </div>
  );
}