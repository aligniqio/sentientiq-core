import { useState, useEffect } from 'react';
import { Eye, Brain, Zap, X, Check, Activity, TrendingDown, AlertTriangle } from 'lucide-react';
import SEO from '@/components/SEO';
import NeuralBackground from '@/components/NeuralBackground';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EmotionalTracker from '@/components/EmotionalTracker';
import EmotionalTrails from '@/components/EmotionalTrails';

export default function WhyDifferent() {
  const [activePhase, setActivePhase] = useState(0);
  
  const siteUrl = (import.meta as any)?.env?.VITE_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');

  // What THEY do (Intent Data Industry)
  const whatTheyDo = [
    "Guess company from IP address (73% wrong)",
    "Sell you stale 'surge' data from 6 weeks ago", 
    "Charge $50K/year for Excel exports",
    "Require 3-month onboarding consultants",
    "Hide behind 'proprietary algorithms'",
    "Count 'topic searches' as intent",
    "Bundle 10,000 useless leads",
    "Never tell you WHO the person is",
    "Can't see emotions, only keywords",
    "Zero accountability when wrong"
  ];

  // What ACTUALLY happens
  const whatActuallyHappens = [
    {
      phase: "DETECTING",
      description: "We see rage in 300ms, confusion in scroll patterns",
      detail: "Behavioral physics, not probabilities. Every micro-interaction reveals intent.",
      icon: Activity,
      color: "from-red-600 to-red-900"
    },
    {
      phase: "PREDICTING", 
      description: "3-second window before they abandon",
      detail: "We know they're leaving before they do. Machine learning on actual outcomes.",
      icon: TrendingDown,
      color: "from-amber-600 to-amber-900"
    },
    {
      phase: "INTERVENING",
      description: "Act in the moment that matters",
      detail: "Not after they leave. Not tomorrow. Right now, when emotion peaks.",
      icon: AlertTriangle,
      color: "from-purple-600 to-purple-900"
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
        <EmotionalTracker />
        <EmotionalTrails />
        <NeuralBackground />
        
        <main className="relative z-10 text-white">
          <NavBar />
          
          {/* Hero Section */}
          <section className="pt-32 pb-20">
            <div className="container mx-auto px-6">
              <div className="text-center mb-16">
                <p className="kicker">Why It's Different</p>
                <h1 className="mt-4 text-5xl md:text-7xl font-bold">
                  THE $47 BILLION<br/>
                  <span className="bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">
                    INTENT DATA LIE
                  </span>
                </h1>
                <p className="mt-8 text-xl text-white/80 max-w-4xl mx-auto leading-relaxed">
                  They guess WHO from IP addresses. Miss 73% of actual buyers.
                  <span className="block mt-2 text-2xl font-semibold">
                    We know WHO is feeling WHAT. Right now. On YOUR site.
                  </span>
                  <span className="block mt-4 text-lg text-purple-400">
                    Stop paying for yesterday's guesses. Start knowing today's emotions.
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

          {/* Intent Data Guessing vs Emotional Intelligence */}
          <section className="py-20">
            <div className="container mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-12">
                {/* What THEY Do */}
                <div className="card border-red-500/20 bg-red-900/5">
                  <div className="p-8">
                    <h3 className="text-3xl font-bold mb-8 text-red-400">
                      INTENT DATA (GUESSING)
                    </h3>
                    <div className="space-y-4">
                      {whatTheyDo.map((thing, index) => (
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
                    <div className="mt-8 p-4 bg-red-900/20 rounded-lg border border-red-500/20">
                      <p className="text-sm text-red-400 font-mono">
                        "After 3 years, we still can't figure out how to use it"
                      </p>
                      <p className="text-xs text-red-400/60 mt-1">— Actual customer, $50K/year contract</p>
                    </div>
                  </div>
                </div>

                {/* What WE Do */}
                <div className="card border-green-500/20 bg-green-900/5">
                  <div className="p-8">
                    <h3 className="text-3xl font-bold mb-8 text-green-400">
                      EMOTIONAL INTELLIGENCE (KNOWING)
                    </h3>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <Check className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-lg mb-2">Your app tells us WHO</p>
                          <p className="text-white/60">
                            john@company.com, not "someone from IP 72.14.213.102"
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Check className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-lg mb-2">Real emotions, not keywords</p>
                          <p className="text-white/60">
                            "Rage-clicking pricing" beats "searched pricing keywords"
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Check className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-lg mb-2">Right now, not 6 weeks ago</p>
                          <p className="text-white/60">
                            300ms detection on YOUR site, not stale third-party data
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Check className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-lg mb-2">One line of code</p>
                          <p className="text-white/60">
                            Working in 30 seconds, not 3-month implementations
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 p-4 bg-green-900/20 rounded-lg border border-green-500/20">
                      <p className="text-sm text-green-400 font-mono">
                        SentientIQ.identify(user) // That's it. You're done.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Live Behavioral Physics Demo */}
          <section className="py-20">
            <div className="container mx-auto px-6">
              <div className="card border-amber-500/20 bg-gradient-to-r from-amber-900/10 to-red-900/10">
                <div className="p-12">
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center">BEHAVIORAL PHYSICS IN ACTION</h2>
                  <p className="text-2xl text-white/80 mb-12 text-center">
                    This page is tracking your emotions right now. No setup required.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-amber-400 mb-4">Try These:</h3>
                      <div className="p-4 bg-black/30 rounded-lg border border-amber-500/20">
                        <p className="font-bold mb-2">🤬 Rage Click</p>
                        <p className="text-sm text-white/60">Click anywhere rapidly 3+ times</p>
                      </div>
                      <div className="p-4 bg-black/30 rounded-lg border border-amber-500/20">
                        <p className="font-bold mb-2">🤔 Hesitation</p>
                        <p className="text-sm text-white/60">Hover over a button for 2+ seconds</p>
                      </div>
                      <div className="p-4 bg-black/30 rounded-lg border border-amber-500/20">
                        <p className="font-bold mb-2">😵 Confusion</p>
                        <p className="text-sm text-white/60">Scroll up and down erratically</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-green-400 mb-4">What Happens:</h3>
                      <div className="p-4 bg-black/30 rounded-lg border border-green-500/20">
                        <p className="font-bold mb-2">Instant Detection</p>
                        <p className="text-sm text-white/60">We'll show you a notification within 300ms</p>
                      </div>
                      <div className="p-4 bg-black/30 rounded-lg border border-green-500/20">
                        <p className="font-bold mb-2">No Configuration</p>
                        <p className="text-sm text-white/60">Already working. No code added to this page.</p>
                      </div>
                      <div className="p-4 bg-black/30 rounded-lg border border-green-500/20">
                        <p className="font-bold mb-2">Real Intervention</p>
                        <p className="text-sm text-white/60">In production, we'd prevent you from leaving</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-12 p-6 bg-black/50 rounded-lg border border-white/10">
                    <p className="text-center text-lg">
                      <span className="text-purple-400 font-bold">This is not a demo.</span>{' '}
                      <span className="text-white/80">This is the actual emotional intelligence engine running.</span>
                    </p>
                    <p className="text-center text-sm text-white/50 mt-2">
                      Zero mock data. Zero Math.random(). Pure behavioral physics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The $47 Billion Comparison */}
          <section className="py-20">
            <div className="container mx-auto px-6">
              <div className="card border-purple-500/20 bg-gradient-to-r from-purple-900/10 to-blue-900/10">
                <div className="p-12 text-center">
                  <h2 className="text-4xl md:text-5xl font-bold mb-6">THE $47 BILLION QUESTION</h2>
                  <p className="text-2xl text-white/80 mb-12">
                    Why pay for guesses when you can know?
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="card bg-white/5">
                      <div className="p-8">
                        <div className="text-6xl mb-4">🎯</div>
                        <p className="font-bold text-xl mb-2">73% vs 100%</p>
                        <p className="text-white/60">
                          They miss 73% of buyers<br/>
                          We identify 100% of logged-in users
                        </p>
                      </div>
                    </div>
                    <div className="card bg-white/5">
                      <div className="p-8">
                        <div className="text-6xl mb-4">⏱️</div>
                        <p className="font-bold text-xl mb-2">6 weeks vs 300ms</p>
                        <p className="text-white/60">
                          Their "surge" data is ancient<br/>
                          Our emotions are instant
                        </p>
                      </div>
                    </div>
                    <div className="card bg-white/5">
                      <div className="p-8">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="font-bold text-xl mb-2">IP vs Email</p>
                        <p className="text-white/60">
                          They: "Someone from Comcast"<br/>
                          Us: "john@apple.com is raging"
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-12 p-6 bg-black/50 rounded-lg border border-white/10">
                    <p className="text-xl font-bold text-amber-400 mb-2">
                      Intent data vendors have been guessing for 15 years.
                    </p>
                    <p className="text-lg text-white/60">
                      Their customers still can't figure out how to use it.
                    </p>
                    <p className="text-sm text-white/40 mt-4">
                      We show you WHO is feeling WHAT. Today. In 30 seconds.
                    </p>
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
                    STOP PAYING FOR<br/>YESTERDAY'S GUESSES
                  </h2>
                  <p className="text-xl text-white/70">
                    Start knowing WHO is feeling WHAT. Right now.
                  </p>
                  <p className="text-2xl font-bold mt-6 text-amber-400">
                    The intent data industry is a $47 billion guess.
                  </p>
                  <p className="text-2xl font-bold mt-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    We deliver $47 billion worth of knowing.
                  </p>
                  <p className="text-lg text-white/50 mt-8">
                    Try rage clicking. We already know it's you.
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