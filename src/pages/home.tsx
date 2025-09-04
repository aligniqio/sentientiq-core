import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useUser } from '@clerk/clerk-react';
import { Brain, Users2, Beaker, Activity, MessageSquare } from "lucide-react";
import PageHeader from "../components/PageHeader";

const items = [
  { to: "/evi",       icon: Activity, title: "EVI™ Dashboard",  desc: "Minute + hour volatility. Launch or wait, on signal."     , cta: "Open Dashboard" },
  { to: "/faculty", icon: Users2, title: "PhD Collective", desc: "Twelve agents, one faculty. See them debate in real time." , cta: "Enter Faculty" },
  { to: "/ask",       icon: MessageSquare, title: "Ask the Collective", desc: "Direct answers with a Why from any PhD.", cta: "Ask a Question" },
  { to: "/training",  icon: Beaker,  title: "Training Lab",   desc: "Credentials, metrics, versions. Truth over theater."      , cta: "View Credentials" },
  { to: "/how", icon: Brain, title: "How It Works", desc: "Inside the neural pipeline: data → models → answers.", cta: "Learn More" },
];

// Removed LightField - using global neural-bg now

function Card({ to, icon: Icon, title, desc, cta, idx }:{
  to:string; icon:any; title:string; desc:string; cta:string; idx:number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.04 * idx }}
      className="group relative"
    >
      {/* backlight on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition
                      bg-[radial-gradient(250px_120px_at_20%_10%,rgba(124,58,237,0.18),transparent),
                          radial-gradient(220px_120px_at_80%_90%,rgba(56,189,248,0.16),transparent)] blur-2xl" />
      <Link to={to} className="block glass-card glass-card-hover p-7 ring-1 ring-white/10 hover:ring-white/20 transition">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl
                          bg-gradient-to-br from-violet-500/20 to-sky-500/20 ring-1 ring-white/15">
            <Icon className="h-5 w-5 text-violet-200" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-1 text-sm text-white/70">{desc}</p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-violet-300">
              {cta} →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const Home: React.FC = () => {
  const { user } = useUser();
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Neural Cathedral Background */}
      <div className="neural-bg" />
      
      <div className="relative z-10">
      
      {/* Header */}
      <div className="mx-auto max-w-6xl px-6 pt-12">
        <PageHeader 
          title={`Welcome back${user?.firstName ? `, ${user.firstName}` : ''}`}
          subtitle="Your Emotional Intelligence Infrastructure"
        />
      </div>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {items.map((it, i) => <Card key={it.to} idx={i} {...it} />)}
        </div>
      </section>

      {/* Status */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex flex-wrap items-center gap-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium ring-1 ring-white/10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              LIVE
            </span>
            <div className="flex items-center gap-8 text-sm">
              <div><span className="text-white/50">Active PhDs</span><div className="font-semibold">12</div></div>
              <div><span className="text-white/50">Docs</span><div className="font-semibold">600K+</div></div>
              <div><span className="text-white/50">Accuracy</span><div className="font-semibold">94.7%</div></div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default Home;