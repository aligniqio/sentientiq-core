import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  AlertTriangle, 
  Shield,
  ChevronRight,
  Activity
} from 'lucide-react';

const Landing: React.FC = () => {
  const [mathRandomCount, setMathRandomCount] = useState(0);
  const [currentEvi, setCurrentEvi] = useState(42);
  const [revealTruth, setRevealTruth] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  // Simulate Math.random() detection
  useEffect(() => {
    const interval = setInterval(() => {
      if (mathRandomCount < 2847) {
        setMathRandomCount(prev => prev + Math.floor(Math.random() * 50) + 10);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [mathRandomCount]);

  // Simulate EVI fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEvi(prev => Math.max(20, Math.min(80, prev + (Math.random() - 0.5) * 10)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const vendors = [
    { name: '6sense', randomCalls: 2847, cost: 60000 },
    { name: 'Demandbase', randomCalls: 3142, cost: 75000 },
    { name: 'ZoomInfo', randomCalls: 1923, cost: 45000 },
    { name: 'Terminus', randomCalls: 2156, cost: 52000 }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Section - The Hook */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-black to-blue-950/20" />
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* The Provocation */}
            <h1 className="text-7xl md:text-8xl font-black mb-6 leading-tight">
              YOUR MARKETING STACK<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                IS MATH.RANDOM()
              </span>
            </h1>
            
            <p className="text-2xl text-gray-400 mb-8 max-w-3xl mx-auto">
              You're paying $60,000/year for coin flips. We can prove it.
            </p>

            {/* Live Counter */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="inline-block p-6 rounded-2xl bg-red-900/20 border border-red-500/30 mb-8"
            >
              <div className="text-sm text-red-400 mb-2">MATH.RANDOM() CALLS DETECTED</div>
              <div className="text-6xl font-black text-red-500">
                {mathRandomCount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mt-2">...and counting</div>
            </motion.div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setRevealTruth(true)}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 font-bold text-xl hover:from-red-700 hover:to-orange-700 transition-all"
              >
                EXPOSE YOUR VENDOR
              </motion.button>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/insurance"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 font-bold text-xl hover:bg-white/20 transition-all"
                >
                  SEE THE TRUTH
                  <ChevronRight className="w-6 h-6" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Vendor Exposure Modal */}
      <AnimatePresence>
        {revealTruth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setRevealTruth(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-8">
                <h2 className="text-4xl font-black mb-8 text-center">
                  PICK YOUR "AI" VENDOR
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {vendors.map((vendor) => (
                    <motion.button
                      key={vendor.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedVendor(vendor.name)}
                      className={`p-6 rounded-xl border transition-all ${
                        selectedVendor === vendor.name
                          ? 'bg-red-900/30 border-red-500'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl font-bold mb-2">{vendor.name}</div>
                      <div className="text-sm text-gray-400">
                        ${vendor.cost.toLocaleString()}/year
                      </div>
                    </motion.button>
                  ))}
                </div>

                {selectedVendor && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-xl bg-red-900/20 border border-red-500/30"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                      <h3 className="text-2xl font-bold text-red-400">
                        FRAUD DETECTED
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Math.random() calls found:</span>
                        <span className="font-bold text-red-400">
                          {vendors.find(v => v.name === selectedVendor)?.randomCalls.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Annual cost:</span>
                        <span className="font-bold text-red-400">
                          ${vendors.find(v => v.name === selectedVendor)?.cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cost per coin flip:</span>
                        <span className="font-bold text-red-400">
                          ${Math.round((vendors.find(v => v.name === selectedVendor)?.cost || 0) / (vendors.find(v => v.name === selectedVendor)?.randomCalls || 1))}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-black/50 rounded-lg">
                      <code className="text-sm text-red-300">
                        // Their "Proprietary AI Algorithm"<br/>
                        function getIntentScore() {'{'}<br/>
                        {'  '}return Math.random() * 100;<br/>
                        {'}'}
                      </code>
                    </div>

                    <div className="mt-6 text-center">
                      <a
                        href="https://chrome.google.com/webstore/unstuck"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 font-bold hover:from-red-700 hover:to-orange-700 transition-all"
                      >
                        INSTALL UNSTUCK & VERIFY
                        <ChevronRight className="w-5 h-5" />
                      </a>
                      <p className="text-xs text-gray-500 mt-2">
                        Chrome extension that exposes the fraud in real-time
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Alternative Section */}
      <section className="relative py-32">
        <div className="max-w-6xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-black mb-6">
              WHAT IF MARKETING INTELLIGENCE<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
                ACTUALLY HAD INTELLIGENCE?
              </span>
            </h2>
          </motion.div>

          {/* The Three Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-8"
            >
              <Brain className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-2xl font-bold mb-3">12 Real PhDs</h3>
              <p className="text-gray-400 mb-4">
                Not algorithms. Actual doctorate-level intelligence from Wharton, MIT, Stanford. 
                Blockchain-verified credentials.
              </p>
              <Link
                to="/faculty"
                className="text-purple-400 hover:text-purple-300 font-bold inline-flex items-center gap-1"
              >
                Meet the Faculty <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-8"
            >
              <Activity className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-2xl font-bold mb-3">One Number</h3>
              <p className="text-gray-400 mb-4">
                The Emotional Volatility Index (EVI™). Know instantly whether to launch or wait. 
                No dashboards. Just decisions.
              </p>
              <Link
                to="/evi"
                className="text-blue-400 hover:text-blue-300 font-bold inline-flex items-center gap-1"
              >
                See Live EVI <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-8"
            >
              <Shield className="w-12 h-12 text-green-400 mb-4" />
              <h3 className="text-2xl font-bold mb-3">Risk Insurance</h3>
              <p className="text-gray-400 mb-4">
                Calculate emotional risk before spending. We've saved clients $7.2M by preventing 
                campaigns during crises.
              </p>
              <Link
                to="/insurance"
                className="text-green-400 hover:text-green-300 font-bold inline-flex items-center gap-1"
              >
                Calculate Risk <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          {/* Live Demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="backdrop-blur-2xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-3xl border border-purple-500/30 p-12 text-center"
          >
            <div className="max-w-3xl mx-auto">
              <h3 className="text-3xl font-bold mb-4">
                SEE THE DIFFERENCE IN 30 SECONDS
              </h3>
              <p className="text-xl text-gray-400 mb-8">
                Watch 12 PhDs debate your marketing challenge in real-time. 
                No signup. No demo request. Just intelligence.
              </p>
              
              {/* Live EVI Display */}
              <div className="inline-block p-6 rounded-xl bg-black/50 border border-white/20 mb-8">
                <div className="text-sm text-gray-400 mb-2">CURRENT MARKET EVI</div>
                <div className="text-6xl font-black">{currentEvi}</div>
                <div className={`text-sm mt-2 ${currentEvi > 60 ? 'text-red-400' : currentEvi > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {currentEvi > 60 ? 'HIGH VOLATILITY - WAIT' : currentEvi > 40 ? 'MODERATE - MONITOR' : 'OPTIMAL - LAUNCH'}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/faculty"
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-xl hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  WATCH LIVE DEBATE
                </Link>
                <button className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 font-bold text-xl hover:bg-white/20 transition-all">
                  BOOK DEEPAK'S REVENGE
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                For the CMO tired of paying for Math.random()
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The Manifesto */}
      <section className="relative py-32 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-black mb-8">
              THE SIMPLE TRUTH
            </h2>
            <div className="space-y-6 text-xl text-gray-400 leading-relaxed">
              <p>
                Every dashboard tells you what happened.
                <span className="text-white font-bold"> We tell you why.</span>
              </p>
              <p>
                Every platform shows you numbers.
                <span className="text-white font-bold"> We show you neurons.</span>
              </p>
              <p>
                Every vendor hides their "AI."
                <span className="text-white font-bold"> We verify ours on the blockchain.</span>
              </p>
              <p className="text-2xl text-white font-bold pt-8">
                Marketing has always measured the shadows.
                <br/>
                SentientIQ measures the substance.
              </p>
            </div>

            <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30">
              <div className="text-3xl font-black mb-4">
                NO MORE MATH.RANDOM()
              </div>
              <div className="text-lg text-gray-400">
                Join the companies that switched from coin flips to intelligence.
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h3 className="text-3xl font-bold mb-8">
            READY FOR REAL INTELLIGENCE?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://chrome.google.com/webstore/unstuck"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 font-bold text-xl hover:from-red-700 hover:to-orange-700 transition-all"
            >
              INSTALL UNSTUCK
            </a>
            <Link
              to="/insurance"
              className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 font-bold text-xl hover:bg-white/20 transition-all"
            >
              START FREE TRIAL
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            The Last Software You'll Ever Notice™
          </p>
        </div>
      </section>
    </div>
  );
};

export default Landing;