import { useState, useEffect } from 'react';
import { Eye, Brain, Zap, X, Check } from 'lucide-react';
import SEO from '@/components/SEO';
import NeuralBackground from '@/components/NeuralBackground';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function WhyDifferent() {
  const [activePhase, setActivePhase] = useState(0);
  
  const siteUrl = (import.meta as any)?.env?.VITE_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');

  // What we DON'T do
  const thingsWeDontDo = [
    "No dashboards to learn",
    "No features to configure", 
    "No settings to manage",
    "No manuals to read",
    "No onboarding process",
    "No learning curve",
    "No integration setup",
    "No report builders",
    "No UI to navigate",
    "No notifications to manage"
  ];

  // What ACTUALLY happens
  const whatActuallyHappens = [
    {
      phase: "WATCHING",
      description: "12 PhDs monitor every signal, 24/7",
      detail: "600K+ documents analyzed, patterns emerge before you notice",
      icon: Eye,
      color: "from-purple-600 to-purple-900"
    },
    {
      phase: "UNDERSTANDING", 
      description: "Context builds without your input",
      detail: "Your business, your customers, your competition - we already know",
      icon: Brain,
      color: "from-blue-600 to-blue-900"
    },
    {
      phase: "DECIDING",
      description: "Actions determined before you ask",
      detail: "The decision is made, verified, and ready when you need it",
      icon: Zap,
      color: "from-green-600 to-green-900"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhase((prev) => (prev + 1) % whatActuallyHappens.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <SEO 
        siteUrl={siteUrl}
        path="/why-different"
        title="Why It's Different — SentientIQ"
        description="Software should behave like a team, not a manual. The old way is dashboards, features, and configs. The only way forward: intelligence that finds you, decisions not data, zero learning curve."
      />
      
      <div className="relative min-h-screen bg-black">
        <NeuralBackground />
        
        <main className="relative z-10 text-white">
          <NavBar />
          
          {/* Hero Section */}
          <section className="pt-32 pb-20">
            <div className="container mx-auto px-6">
              <div className="text-center mb-16">
                <p className="kicker">Why It's Different</p>
                <h1 className="mt-4 text-5xl md:text-7xl font-bold">
                  SOFTWARE SHOULD BEHAVE<br/>
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    LIKE A TEAM, NOT A MANUAL
                  </span>
                </h1>
                <p className="mt-8 text-xl text-white/80 max-w-4xl mx-auto leading-relaxed">
                  The old way is dashboards, features, and configs. 
                  <span className="block mt-2 text-2xl font-semibold">
                    The only way forward: intelligence that finds you, decisions not data, zero learning curve.
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* The Three Phases */}
          <section className="py-20">
            <div className="container mx-auto px-6">
              <div className="grid md:grid-cols-3 gap-8">
                {whatActuallyHappens.map((phase, index) => {
                  const Icon = phase.icon;
                  return (
                    <div
                      key={phase.phase}
                      className={`
                        card relative transition-all duration-500
                        ${activePhase === index ? 'scale-105 border-white/30' : 'scale-100'}
                      `}
                    >
                      <div className={`
                        absolute inset-0 opacity-20 rounded-xl
                        bg-gradient-to-br ${phase.color}
                      `} />
                      
                      <div className="relative p-8">
                        <div className={`
                          w-16 h-16 rounded-lg mb-6 flex items-center justify-center
                          bg-gradient-to-br ${phase.color}
                        `}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        
                        <h3 className="text-2xl font-bold mb-3">{phase.phase}</h3>
                        <p className="text-white/80 mb-4">{phase.description}</p>
                        <p className="text-sm text-white/50">{phase.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Old Way vs New Way */}
          <section className="py-20">
            <div className="container mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-12">
                {/* The Old Way */}
                <div className="card border-red-500/20 bg-red-900/5">
                  <div className="p-8">
                    <h3 className="text-3xl font-bold mb-8 text-red-400">
                      THE OLD WAY (DEAD)
                    </h3>
                    <div className="space-y-4">
                      {thingsWeDontDo.map((thing, index) => (
                        <div
                          key={thing}
                          className="flex items-center gap-3 opacity-60"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <span className="text-gray-400 line-through">{thing}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* The New Way */}
                <div className="card border-green-500/20 bg-green-900/5">
                  <div className="p-8">
                    <h3 className="text-3xl font-bold mb-8 text-green-400">
                      THE ONLY WAY (ALIVE)
                    </h3>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <Check className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-lg mb-2">Intelligence finds you</p>
                          <p className="text-white/60">
                            Urgent matters surface immediately. Everything else stays invisible.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Check className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-lg mb-2">Decisions, not data</p>
                          <p className="text-white/60">
                            We tell you what to do, not what happened.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Check className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-lg mb-2">Zero learning curve</p>
                          <p className="text-white/60">
                            If it needs instructions, we've already failed.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Check className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-lg mb-2">Works on day zero</p>
                          <p className="text-white/60">
                            No setup. No configuration. Just intelligence.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The Ultimate Paradox */}
          <section className="py-20">
            <div className="container mx-auto px-6">
              <div className="card border-purple-500/20 bg-gradient-to-r from-purple-900/10 to-blue-900/10">
                <div className="p-12 text-center">
                  <h2 className="text-4xl md:text-5xl font-bold mb-6">THE ULTIMATE PARADOX</h2>
                  <p className="text-2xl text-white/80 mb-12">
                    We built software so good, it makes itself irrelevant.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="card bg-white/5">
                      <div className="p-8">
                        <div className="text-6xl mb-4">🤖</div>
                        <p className="font-bold text-xl mb-2">12 PhDs</p>
                        <p className="text-white/60">
                          Working 24/7, costing you nothing
                        </p>
                      </div>
                    </div>
                    <div className="card bg-white/5">
                      <div className="p-8">
                        <div className="text-6xl mb-4">⚡</div>
                        <p className="font-bold text-xl mb-2">0ms onboarding</p>
                        <p className="text-white/60">
                          Already working before you log in
                        </p>
                      </div>
                    </div>
                    <div className="card bg-white/5">
                      <div className="p-8">
                        <div className="text-6xl mb-4">🎯</div>
                        <p className="font-bold text-xl mb-2">100% invisible</p>
                        <p className="text-white/60">
                          The last software you'll ever notice
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Final Statement */}
          <section className="py-32">
            <div className="container mx-auto px-6 text-center">
              <div className="card inline-block border-white/20">
                <div className="p-16">
                  <h2 className="text-5xl md:text-7xl font-black mb-6">
                    EVERYTHING ELSE<br/>IS THEATER
                  </h2>
                  <p className="text-xl text-white/70">
                    Your PhD collective is already working.
                  </p>
                  <p className="text-2xl font-bold mt-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    They'll find you when it matters.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Footer />
        </main>
      </div>
    </>
  );
}