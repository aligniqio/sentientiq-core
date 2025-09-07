// Marketing Landing Page - sentientiq.ai
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Shield, Brain, TrendingUp, Users } from "lucide-react";
import SEO from '../SEO/SEO';
import EVIMonitor from '../components/EVIMonitor';

// Matrix rain effect component
const MatrixRain = () => {
  useEffect(() => {
    const canvas = document.getElementById('matrix') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const matrix = "SENTIENTIQ01アイキュー感情知能";
    const matrixArray = matrix.split("");
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = Math.random() * -100;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 18, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff9f';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 35);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas id="matrix" className="fixed inset-0 opacity-20" />;
};

export default function Landing() {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <>
      <SEO />
      <div className="relative min-h-screen bg-[#0a0a12] text-white overflow-hidden">
        <MatrixRain />
        
        {/* EVI Monitor Bar */}
        <div className="relative z-50">
          <EVIMonitor />
        </div>

        {/* Main Content */}
        <div className="relative z-10">
          {/* Hero Section */}
          <section className="mx-auto max-w-7xl px-6 pt-32 pb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6 text-sm font-medium tracking-wider text-emerald-400"
              >
                EMOTIONAL INTELLIGENCE FOR COMMERCE
              </motion.p>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="mb-8 text-6xl md:text-8xl font-black tracking-tight"
              >
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  The Last Software
                </span>
                <br />
                <span className="text-white">
                  You'll Ever Notice
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mx-auto max-w-3xl text-xl md:text-2xl text-gray-300 mb-12"
              >
                12 PhDs. Zero dashboards. <span className="text-white font-semibold">Decisions, not data.</span>
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button
                  onClick={() => setUnlocked(true)}
                  className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Unlock 3 Recommendations
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
                </button>

                <a
                  href="/auth"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm rounded-xl font-bold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center gap-2 justify-center"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </a>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-12 flex flex-wrap gap-8 justify-center text-sm text-gray-400"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>SOC2 Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Real-time Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span>320B Parameters</span>
                </div>
              </motion.div>
            </motion.div>
          </section>

          {/* Features Grid */}
          <section className="mx-auto max-w-7xl px-6 py-20">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-8"
            >
              {/* Feature 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="p-8 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl border border-purple-500/20 backdrop-blur-sm"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Emotional Value Index</h3>
                <p className="text-gray-400">
                  Real-time emotional volatility tracking across all customer interactions. Like VIX for feelings.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="p-8 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-2xl border border-cyan-500/20 backdrop-blur-sm"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Plutchik's Wheel Analysis</h3>
                <p className="text-gray-400">
                  Eight-dimensional emotional mapping that actually means something. No more guessing.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="p-8 bg-gradient-to-br from-emerald-900/20 to-green-900/20 rounded-2xl border border-emerald-500/20 backdrop-blur-sm"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Collective Intelligence</h3>
                <p className="text-gray-400">
                  12 specialized PhDs working in parallel. 24,000 years of equivalent experience.
                </p>
              </motion.div>
            </motion.div>
          </section>

          {/* Unlock Section */}
          {unlocked && (
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-4xl px-6 py-20"
            >
              <div className="p-8 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-500/30 backdrop-blur-sm">
                <h2 className="text-3xl font-bold mb-6">Your 3 Immediate Opportunities</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h3 className="font-semibold text-emerald-400 mb-2">1. Emotional Arbitrage Window</h3>
                    <p className="text-gray-300">Your competitors are 73% fear-indexed while market sentiment is shifting optimistic. 48-hour opportunity.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h3 className="font-semibold text-cyan-400 mb-2">2. Trust Deficit Alert</h3>
                    <p className="text-gray-300">Industry-wide anticipation spike with no fulfillment follow-through. First mover advantage available.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h3 className="font-semibold text-purple-400 mb-2">3. Joy Gap Identification</h3>
                    <p className="text-gray-300">Your vertical shows 12% joy vs 31% category average. Specific intervention points mapped.</p>
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <a
                    href="/auth"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                  >
                    Get Full Analysis
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.section>
          )}

          {/* Bottom CTA */}
          <section className="mx-auto max-w-4xl px-6 py-20 text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold mb-4">
                Stop measuring. <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Start knowing.</span>
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                While others count clicks, we decode intentions.
              </p>
              <a
                href="/auth"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </a>
            </motion.div>
          </section>
        </div>
      </div>
    </>
  );
}