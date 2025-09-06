import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PricingSection from '../components/PricingSection';

export default function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [email, setEmail] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Matrix rain effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const columns = Math.floor(canvas.width / 20);
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }
    
    const matrix = 'SENTIENTIQ';
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#8b5cf6';
      ctx.font = '15px monospace';
      
      for (let i = 0; i < drops.length; i++) {
        const text = matrix[Math.floor(Math.random() * matrix.length)];
        ctx.fillText(text, i * 20, drops[i] * 20);
        
        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  const handleInstantStart = async () => {
    if (!email || !email.includes('@')) return;
    
    setIsAnalyzing(true);
    
    // Simulate instant analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 opacity-20" />
      
      {/* HERO: THE LAST SOFTWARE */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="text-sm text-purple-400 mb-4 tracking-widest">
              THE FIRST MARKETING ENGINE BUILT TO MOVE AS FAST AS EMOTION
            </div>
            <h1 className="text-7xl md:text-9xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400 bg-clip-text text-transparent">
                REAL
              </span>
              <br />
              <span className="text-white text-5xl md:text-7xl">EMOTIONAL</span>
              <br />
              <span className="text-green-400">INTELLIGENCE</span>
            </h1>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto"
          >
            Stop asking "what happened?" Start knowing "what's next?"
            <br />
            <span className="text-white font-semibold">Explainable. Transparent. Auditable. Real.</span>
          </motion.p>
          
          {/* INSTANT START - THE ONLY ONBOARDING */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-md mx-auto"
          >
            {!showResults ? (
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-purple-500/20">
                <h3 className="text-2xl font-bold mb-4">
                  Start in 3 seconds. Literally.
                </h3>
                <input
                  type="email"
                  placeholder="your@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleInstantStart()}
                  className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 mb-4"
                  disabled={isAnalyzing}
                />
                <button
                  onClick={handleInstantStart}
                  disabled={isAnalyzing || !email.includes('@')}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isAnalyzing 
                      ? 'bg-purple-600/50 cursor-wait' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90'
                  }`}
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin mr-2">⚡</span>
                      Analyzing your digital emotional footprint...
                    </span>
                  ) : (
                    'Start Free Forever →'
                  )}
                </button>
                <p className="text-xs text-white/40 mt-4 text-center">
                  That's it. That's the entire onboarding.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-xl p-8 border border-purple-500/30"
              >
                <div className="text-3xl mb-4">✨</div>
                <h3 className="text-2xl font-bold mb-4 text-green-400">
                  Intelligence Activated
                </h3>
                <p className="text-white/80 mb-6">
                  We've already analyzed {email.split('@')[1]} and found:
                </p>
                <ul className="text-left space-y-2 mb-6">
                  <li className="text-yellow-400">⚠️ 47% emotional leakage in your messaging</li>
                  <li className="text-red-400">⚠️ 3 vendors using fake intelligence patterns</li>
                  <li className="text-green-400">✅ $2.3M in recoverable pipeline</li>
                </ul>
                <button
                  onClick={() => window.open('https://app.sentientiq.ai', '_blank')}
                  className="w-full py-3 bg-white text-black rounded-lg font-bold hover:bg-gray-100 transition-colors"
                >
                  See Full Analysis →
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* THE THREE PILLARS */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-6xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
              Three Ways to Win
            </span>
          </h2>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Pillar 1: Truth Engine */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-xl p-8 border border-green-500/30"
            >
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold mb-4 text-green-400">
                Truth Engine™
              </h3>
              <p className="text-white/70 mb-4">
                Verify any vendor's claims instantly. Real algorithms, real confidence scores, real transparency. Know what's real vs what's random.
              </p>
              <div className="text-sm text-green-300">
                100% explainable, auditable intelligence
              </div>
            </motion.div>

            {/* Head 2: PhD Collective */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-xl rounded-xl p-8 border border-purple-500/30 cursor-pointer"
              onClick={() => window.open('https://app.sentientiq.ai/phd-collective', '_blank')}
            >
              <div className="text-5xl mb-4">🧠</div>
              <h3 className="text-2xl font-bold mb-4 text-purple-400">
                PhD Collective™
              </h3>
              <p className="text-white/70 mb-4">
                12 PhD advisors scoring emotional readiness in real-time. Consensus-driven decisions, not random guesses. Every insight explainable and auditable.
              </p>
              <div className="text-sm text-purple-300">
                Emotional Readiness Score: 91% confidence
              </div>
            </motion.div>

            {/* Head 3: Zero Dashboard */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-xl p-8 border border-green-500/30"
            >
              <div className="text-5xl mb-4">👻</div>
              <h3 className="text-2xl font-bold mb-4 text-green-400">
                Invisible Intelligence™
              </h3>
              <p className="text-white/70 mb-4">
                No dashboards. No UI. Intelligence finds you through email, Slack, wherever you already work. Software so good, you forget it exists.
              </p>
              <div className="text-sm text-green-300">
                Setup time: 0 seconds
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* THE OLD WAY VS THE ONLY WAY */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-black via-red-950/10 to-black">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* The Old Way (DEAD) */}
            <div className="bg-red-500/5 backdrop-blur rounded-xl p-8 border border-red-500/20">
              <h3 className="text-3xl font-bold mb-8 text-red-400">
                THE OLD WAY (DEAD)
              </h3>
              <ul className="space-y-4 text-white/60">
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Dashboards to learn (47 screens average)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Features to configure (2,000+ settings)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Manuals to read (300+ pages)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Onboarding process (6-12 weeks)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Learning curve (3-6 months)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Integration setup (14 tools average)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Report builders (build your own insights)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>UI to navigate (click, click, click...)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Notifications to manage (87/day average)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <span>Contracts to negotiate (12-36 months)</span>
                </li>
              </ul>
            </div>

            {/* The Only Way (ALIVE) */}
            <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur rounded-xl p-8 border border-green-500/20">
              <h3 className="text-3xl font-bold mb-8 text-green-400">
                THE ONLY WAY (ALIVE)
              </h3>
              <ul className="space-y-6">
                <li>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-green-500 mt-1">✅</span>
                    <span className="text-xl font-semibold">Intelligence finds you</span>
                  </div>
                  <p className="text-white/50 ml-9">
                    Urgent matters surface immediately. Everything else stays invisible.
                  </p>
                </li>
                <li>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-green-500 mt-1">✅</span>
                    <span className="text-xl font-semibold">Decisions, not data</span>
                  </div>
                  <p className="text-white/50 ml-9">
                    We tell you what to do, not what happened.
                  </p>
                </li>
                <li>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-green-500 mt-1">✅</span>
                    <span className="text-xl font-semibold">Zero learning curve</span>
                  </div>
                  <p className="text-white/50 ml-9">
                    If it needs instructions, we've already failed.
                  </p>
                </li>
                <li>
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-green-500 mt-1">✅</span>
                    <span className="text-xl font-semibold">Works on day zero</span>
                  </div>
                  <p className="text-white/50 ml-9">
                    No setup. No configuration. Just intelligence.
                  </p>
                </li>
              </ul>
              
              <div className="mt-8 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p className="text-green-400 font-semibold">
                  Total setup required: Enter email. Done.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE BLUDGEONING TRUTH */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-black via-purple-950/20 to-black">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-6xl md:text-7xl font-bold mb-16 text-center">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              Why Emotional Intelligence
            </span>
            <br />
            <span className="text-white text-4xl md:text-5xl">Is The Only Intelligence</span>
          </h2>
          
          {/* THE CORE TRUTH */}
          <div className="space-y-8 mb-16">
            <div className="text-center">
              <p className="text-2xl md:text-3xl text-white/90 font-light mb-4">
                Traditional analytics count behaviors and guess at intent.
              </p>
              <p className="text-2xl md:text-3xl text-purple-400 font-semibold mb-4">
                SentientIQ™ reads emotions and predicts actions.
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-red-500/10 to-purple-500/10 backdrop-blur-xl rounded-xl p-8 border border-red-500/30">
              <p className="text-xl text-white/60 mb-4">The difference?</p>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-red-400">
                  <p className="text-2xl font-mono">"They clicked 47 times"</p>
                  <p className="text-sm mt-2 text-white/40">Useless noise</p>
                </div>
                <div className="text-green-400">
                  <p className="text-2xl font-mono">"Decision anxiety at 91% confidence"</p>
                  <p className="text-xl font-bold mt-2">Strike window: 13 minutes</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-3xl font-bold">
                <span className="text-white/60">Marketing has always measured the</span>
                <span className="text-red-400"> shadows</span>.
              </p>
              <p className="text-3xl font-bold">
                <span className="text-white/60">SentientIQ measures the</span>
                <span className="text-green-400"> substance</span>.
              </p>
            </div>
          </div>

          {/* HOW IT WORKS - THE BLUDGEONING */}
          <div className="bg-black/50 backdrop-blur-xl rounded-xl p-10 border border-purple-500/20 mb-12">
            <h3 className="text-3xl font-bold mb-8 text-center">
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                How? With Unprecedented Intelligence
              </span>
            </h3>
            
            <div className="space-y-6 text-lg text-white/80">
              <p>
                Our platform deploys <span className="text-purple-400 font-bold">12 PhD-level AI agents</span> working 24/7 across every digital touchpoint. 
                They don't just analyze - <span className="text-white font-bold">they understand</span>.
              </p>
              
              <p>
                When someone tweets frustration about your competitor, posts on LinkedIn about budget approvals, 
                and searches for solutions - our identity resolution connects these dots across platforms with 
                <span className="text-green-400 font-bold">94% confidence</span>.
              </p>
              
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-6 my-8">
                <p className="text-2xl font-bold text-center mb-2">Then the magic happens:</p>
                <p className="text-xl text-center text-purple-300">
                  "Bob Smith has 13 minutes of peak buying intent. Call now."
                </p>
              </div>
              
              <p>
                Your team gets notified instantly - email, SMS, Slack - wherever they are. 
                <span className="text-white font-bold">No committees. No delays. Just action when it matters.</span>
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mt-10">
                <div className="text-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <h4 className="font-bold mb-1">Complete Transparency</h4>
                  <p className="text-sm text-white/60">Every recommendation shows its reasoning</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="font-bold mb-1">Full Control</h4>
                  <p className="text-sm text-white/60">You decide what to automate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">📊</div>
                  <h4 className="font-bold mb-1">Accountable Results</h4>
                  <p className="text-sm text-white/60">Every action tracks its outcome</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* THE FINAL PUNCH */}
          <div className="text-center">
            <p className="text-2xl md:text-3xl text-white/90 mb-8">
              This isn't another analytics dashboard.
            </p>
            <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-12">
              It's a team of genius marketers that never sleep,
              <br />
              catching opportunities others don't even know exist.
            </p>
            
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-8 backdrop-blur mb-8">
              <p className="text-4xl font-bold text-yellow-400 mb-4">
                The Question:
              </p>
              <p className="text-2xl text-white">
                When emotions drive 95% of purchasing decisions,
                <br />
                <span className="text-3xl font-bold">why are you still counting clicks?</span>
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl p-8 backdrop-blur border border-purple-500/30">
              <p className="text-2xl md:text-3xl font-bold text-white">
                Remember:
              </p>
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mt-4">
                It's still not possible to predict tomorrow's rain
                <br />
                by counting the number of umbrellas sold last month.
              </p>
              <p className="text-xl text-white/60 mt-6">
                Stop counting the past. Start reading the present. Predict the future.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INSTANT VALUE PROP */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-black to-purple-950/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-12">
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Here's What Happens Next
            </span>
          </h2>
          
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur rounded-xl p-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">0️⃣</div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Second 0: You enter your email</h3>
                  <p className="text-white/60">That's it. No forms. No demos. No sales calls.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur rounded-xl p-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">1️⃣</div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Second 1: We analyze your digital footprint</h3>
                  <p className="text-white/60">Page speed, emotional patterns, authenticity verification.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur rounded-xl p-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">2️⃣</div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Second 2: Intelligence arrives in your inbox</h3>
                  <p className="text-white/60">Your first insight. No dashboard required.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur rounded-xl p-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">♾️</div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Forever: It just works</h3>
                  <p className="text-white/60">No maintenance. No updates to install. No UI to check.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PRICING - BUY ON SIGHT */}
      <PricingSection />

      {/* FINAL CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-7xl font-bold mb-8"
          >
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              The Last Software
            </span>
            <br />
            <span className="text-white text-5xl">You'll Ever Notice</span>
          </motion.h2>
          
          <p className="text-2xl text-white/60 mb-12">
            No dashboards. No manuals. No bullshit.
            <br />
            <span className="text-white font-bold">Just intelligence.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => window.open('https://app.sentientiq.ai/start', '_blank')}
              className="px-10 py-5 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg text-xl font-bold hover:opacity-90 transition-opacity"
            >
              See It In Action →
            </button>
            <button
              onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-10 py-5 bg-white text-black rounded-lg text-xl font-bold hover:bg-gray-100 transition-colors"
            >
              Start in 3 Seconds
            </button>
          </div>
          
          <p className="text-sm text-white/40 mt-8">
            Free forever. No credit card. No contract. No catch.
          </p>
        </div>
      </section>
    </div>
  );
}