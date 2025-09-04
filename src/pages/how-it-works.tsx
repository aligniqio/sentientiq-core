import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Eye, Zap, X, Check } from 'lucide-react';

// The Anti-Feature Page
const HowItWorks: React.FC = () => {
  const [activePhD, setActivePhD] = useState(0);

  
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
      glass: "from-purple-500/10 to-purple-900/10"
    },
    {
      phase: "UNDERSTANDING", 
      description: "Context builds without your input",
      detail: "Your business, your customers, your competition - we already know",
      icon: Brain,
      glass: "from-blue-500/10 to-blue-900/10"
    },
    {
      phase: "DECIDING",
      description: "Actions determined before you ask",
      detail: "The decision is made, verified, and ready when you need it",
      icon: Zap,
      glass: "from-green-500/10 to-green-900/10"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhD((prev) => (prev + 1) % whatActuallyHappens.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Glassmorphic Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/20 rounded-full filter blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full filter blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-600/20 rounded-full filter blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <h1 className="text-6xl font-black mb-4">HOW IT WORKS</h1>
          <p className="text-2xl text-gray-400">
            The only page that matters. No features. Just results.
          </p>
        </motion.div>

        {/* The Truth Section */}
        <div className="max-w-6xl mx-auto px-8">
          {/* Glassmorphic Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-12 mb-16"
          >
            <h2 className="text-4xl font-bold mb-8 text-center">
              SOFTWARE SHOULD BEHAVE LIKE A TEAM, NOT A MANUAL
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {whatActuallyHappens.map((phase, index) => {
                const Icon = phase.icon;
                return (
                  <motion.div
                    key={phase.phase}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className={`relative ${activePhD === index ? 'scale-105' : 'scale-100'} transition-transform duration-300`}
                  >
                    <div className={`
                      backdrop-blur-md bg-gradient-to-br ${phase.glass}
                      border border-white/20 rounded-xl p-8
                      ${activePhD === index ? 'ring-2 ring-white/50' : ''}
                    `}>
                      <Icon className="w-12 h-12 mb-4 text-white/80" />
                      <h3 className="text-2xl font-bold mb-2">{phase.phase}</h3>
                      <p className="text-gray-300 mb-4">{phase.description}</p>
                      <p className="text-sm text-gray-500">{phase.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* What We Kill Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Traditional Way - The Graveyard */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="backdrop-blur-xl bg-red-900/10 border border-red-500/20 rounded-2xl p-8"
            >
              <h3 className="text-2xl font-bold mb-6 text-red-400">
                THE OLD WAY (DEAD)
              </h3>
              <div className="space-y-3">
                {thingsWeDontDo.map((thing, index) => (
                  <motion.div
                    key={thing}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-gray-400 line-through">{thing}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Our Way - The Future */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="backdrop-blur-xl bg-green-900/10 border border-green-500/20 rounded-2xl p-8"
            >
              <h3 className="text-2xl font-bold mb-6 text-green-400">
                THE ONLY WAY (ALIVE)
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-bold mb-1">Intelligence finds you</p>
                    <p className="text-sm text-gray-500">
                      Urgent matters surface immediately. Everything else stays invisible.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-bold mb-1">Decisions, not data</p>
                    <p className="text-sm text-gray-500">
                      We tell you what to do, not what happened.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-bold mb-1">Zero learning curve</p>
                    <p className="text-sm text-gray-500">
                      If it needs instructions, we've already failed.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-bold mb-1">Works on day zero</p>
                    <p className="text-sm text-gray-500">
                      No setup. No configuration. Just intelligence.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* The Reality Check */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl bg-gradient-to-r from-purple-900/10 to-indigo-900/10 
                       border border-purple-500/20 rounded-2xl p-12 text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-6">THE ULTIMATE PARADOX</h2>
            <p className="text-2xl text-gray-300 mb-8">
              We built software so good, it makes itself irrelevant.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="backdrop-blur-sm bg-white/5 rounded-lg p-6">
                <p className="text-7xl mb-4">🤖</p>
                <p className="font-bold mb-2">12 PhDs</p>
                <p className="text-sm text-gray-500">
                  Working 24/7, costing you nothing
                </p>
              </div>
              <div className="backdrop-blur-sm bg-white/5 rounded-lg p-6">
                <p className="text-7xl mb-4">⚡</p>
                <p className="font-bold mb-2">0ms onboarding</p>
                <p className="text-sm text-gray-500">
                  Already working before you log in
                </p>
              </div>
              <div className="backdrop-blur-sm bg-white/5 rounded-lg p-6">
                <p className="text-7xl mb-4">🎯</p>
                <p className="font-bold mb-2">100% invisible</p>
                <p className="text-sm text-gray-500">
                  The last software you'll ever notice
                </p>
              </div>
            </div>
          </motion.div>

          {/* Final Statement */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-12 inline-block">
              <h2 className="text-5xl font-black mb-4">
                EVERYTHING ELSE IS THEATER
              </h2>
              <p className="text-xl text-gray-400">
                Your PhD collective is already working.<br/>
                <span className="text-white font-bold">
                  They'll find you when it matters.
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;