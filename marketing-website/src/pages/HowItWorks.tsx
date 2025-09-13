import React, { useState, useEffect } from 'react';
import SEO from '@/components/SEO';
import NeuralBackground from '@/components/NeuralBackground';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';

export default function HowItWorks() {
  const [currentStep, setCurrentStep] = useState(0);
  const [edEmotion, setEdEmotion] = useState('evaluating');
  const [dealStatus, setDealStatus] = useState('active');
  const [interventionTriggered, setInterventionTriggered] = useState(false);
  
  const siteUrl = (import.meta as any)?.env?.VITE_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');

  // Auto-play the scenario
  useEffect(() => {
    const timeline = [
      { time: 2000, action: () => setCurrentStep(1) },
      { time: 4000, action: () => setCurrentStep(2) },
      { time: 6000, action: () => { setEdEmotion('frustration'); setCurrentStep(3); }},
      { time: 7000, action: () => { setInterventionTriggered(true); setCurrentStep(4); }},
      { time: 9000, action: () => { setEdEmotion('confidence'); setDealStatus('saved'); setCurrentStep(5); }},
      { time: 12000, action: () => { 
        // Reset and replay
        setCurrentStep(0);
        setEdEmotion('evaluating');
        setDealStatus('active');
        setInterventionTriggered(false);
      }}
    ];
    
    const timers = timeline.map(({ time, action }) => 
      setTimeout(action, time)
    );
    
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    {
      title: "Ed from Boeing lands on your docs",
      description: "CRM shows: $2.4M deal, Stage: Final Review, Champion: Ed Martinez",
      emotion: "evaluating",
      risk: "low"
    },
    {
      title: "SentientIQ identifies Ed instantly",
      description: "Email matched to HubSpot deal. High-value prospect detected.",
      emotion: "evaluating",
      risk: "low"
    },
    {
      title: "Ed clicks a link. It's dead. 404.",
      description: "Frustration detected. Confidence drops. This could kill the deal.",
      emotion: "frustration",
      risk: "critical"
    },
    {
      title: "3-second intervention cascade",
      description: "CEO texted. Dev team alerted. Sales owner calling Ed.",
      emotion: "frustration",
      risk: "responding"
    },
    {
      title: "Deal saved in 5 minutes",
      description: "Link fixed. Ed called. Apology accepted. Trust restored.",
      emotion: "confidence",
      risk: "resolved"
    }
  ];

  return (
    <>
      <SEO 
        siteUrl={siteUrl}
        path="/how-it-works"
        title="How SentientIQ Works - The Ed from Boeing Story"
        description="Watch how we saved a $2.4M deal in 5 minutes. When your champion hits a dead link during final review, every second counts."
      />
      <div className="relative min-h-screen bg-black">
        <NeuralBackground />
        <main className="relative z-10 text-white">
          <NavBar />
          
          {/* Hero Section */}
          <section className="section py-20">
            <div className="max-w-6xl mx-auto text-center">
              <p className="kicker">The Most Important 5 Minutes</p>
              <h1 className="mt-3 text-5xl md:text-6xl font-bold">
                How We Saved Boeing's <span className="gradient-text">$2.4M Deal</span>
              </h1>
              <p className="mt-6 text-xl text-white/70 max-w-3xl mx-auto">
                This isn't a case study. This is happening right now, somewhere, 
                on someone's website. Maybe yours.
              </p>
            </div>
          </section>

          {/* The Live Scenario */}
          <section className="section py-12">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12">
                {/* Left: The Story */}
                <div className="space-y-8">
                  <div className="glass-card p-8">
                    <h2 className="text-2xl font-bold mb-6">The Scenario</h2>
                    
                    {/* Timeline */}
                    <div className="space-y-6">
                      {steps.map((step, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0.3 }}
                          animate={{ 
                            opacity: currentStep >= idx ? 1 : 0.3,
                            scale: currentStep === idx ? 1.02 : 1
                          }}
                          className={`flex gap-4 ${currentStep === idx ? 'glass-card p-4' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                            ${currentStep > idx ? 'bg-green-500' : 
                              currentStep === idx ? 'bg-purple-500 animate-pulse' : 'bg-white/20'}`}>
                            {currentStep > idx ? '✓' : idx + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{step.title}</h3>
                            <p className="text-white/60 text-sm mt-1">{step.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* The Stakes */}
                  <div className="glass-card p-8 bg-gradient-to-br from-red-500/10 to-transparent">
                    <h3 className="text-xl font-bold mb-4">What's Really at Stake</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-white/60">Deal Value</span>
                        <span className="font-bold text-xl">$2,400,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Decision Timeline</span>
                        <span className="font-bold">Tomorrow</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Ed's Role</span>
                        <span className="font-bold">Technical Champion</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">CMO's Question</span>
                        <span className="font-bold">"What do you think, Ed?"</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Live Visualization */}
                <div className="space-y-8">
                  {/* Ed's Browser View */}
                  <div className="glass-card p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">Ed's Screen</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm text-white/60">LIVE</span>
                      </div>
                    </div>
                    
                    {/* Mock Browser */}
                    <div className="bg-black/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <div className="flex-1 bg-white/10 rounded px-3 py-1 text-xs text-white/50 ml-4">
                          yourcompany.com/docs/integration
                        </div>
                      </div>
                      
                      <AnimatePresence mode="wait">
                        {currentStep < 2 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-64 flex items-center justify-center"
                          >
                            <div className="text-center">
                              <h4 className="text-2xl font-bold mb-2">Integration Guide</h4>
                              <p className="text-white/60">Everything looks normal...</p>
                            </div>
                          </motion.div>
                        )}
                        
                        {currentStep >= 2 && currentStep < 5 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-64 flex items-center justify-center"
                          >
                            <div className="text-center">
                              <div className="text-6xl font-bold text-red-500 mb-4">404</div>
                              <p className="text-xl text-white/60">Page Not Found</p>
                              <p className="text-sm text-white/40 mt-2">The link Ed needed is broken</p>
                            </div>
                          </motion.div>
                        )}
                        
                        {currentStep >= 5 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-64 flex items-center justify-center"
                          >
                            <div className="text-center">
                              <div className="text-6xl mb-4">✅</div>
                              <h4 className="text-2xl font-bold mb-2">Integration Guide</h4>
                              <p className="text-green-400">Link fixed. Content restored.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* SentientIQ Dashboard */}
                  <div className="glass-card p-8 bg-gradient-to-br from-purple-500/10 to-transparent">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">SentientIQ Dashboard</h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold
                        ${edEmotion === 'frustration' ? 'bg-red-500' : 
                          edEmotion === 'confidence' ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {edEmotion.toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Identity */}
                      <div className="bg-black/30 rounded-lg p-4">
                        <div className="text-sm text-purple-400 mb-1">VISITOR IDENTIFIED</div>
                        <div className="font-bold">Ed Martinez - Boeing</div>
                        <div className="text-sm text-white/60">ed.martinez@boeing.com</div>
                      </div>
                      
                      {/* Deal Context */}
                      <div className="bg-black/30 rounded-lg p-4">
                        <div className="text-sm text-purple-400 mb-1">HUBSPOT DEAL</div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold">$2.4M - Final Review</span>
                          <span className={`text-sm ${dealStatus === 'saved' ? 'text-green-400' : 
                            dealStatus === 'at-risk' ? 'text-red-400' : 'text-yellow-400'}`}>
                            {dealStatus.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-white/40 mt-1">Close Date: Tomorrow</div>
                      </div>
                      
                      {/* Emotion Detection */}
                      <div className="bg-black/30 rounded-lg p-4">
                        <div className="text-sm text-purple-400 mb-1">EMOTIONAL STATE</div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-lg">{edEmotion}</span>
                            <span className="text-sm text-white/60 ml-2">
                              {currentStep < 2 ? '72%' : currentStep < 5 ? '94%' : '88%'} confidence
                            </span>
                          </div>
                          {currentStep === 2 && (
                            <span className="text-red-400 text-sm animate-pulse">⚠️ DEAD LINK HIT</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Intervention */}
                      <AnimatePresence>
                        {interventionTriggered && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-4 border border-purple-500"
                          >
                            <div className="text-sm text-purple-400 mb-2">INTERVENTION TRIGGERED</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>CEO texted: "Boeing deal at risk"</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>Dev team notified: "FIX LINK NOW"</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-400">✓</span>
                                <span>Sales calling Ed in 30 seconds</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The Breakdown */}
          <section className="section py-20 bg-gradient-to-b from-transparent to-purple-900/10">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                The <span className="gradient-text">5-Minute Breakdown</span>
              </h2>
              
              <div className="grid md:grid-cols-5 gap-6">
                <div className="glass-card p-6 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">0:00</div>
                  <h3 className="font-semibold mb-2">Ed Arrives</h3>
                  <p className="text-sm text-white/60">
                    Reviewing docs before tomorrow's decision
                  </p>
                </div>
                
                <div className="glass-card p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">0:30</div>
                  <h3 className="font-semibold mb-2">Identity Match</h3>
                  <p className="text-sm text-white/60">
                    Email → HubSpot → $2.4M deal found
                  </p>
                </div>
                
                <div className="glass-card p-6 text-center">
                  <div className="text-3xl font-bold text-red-400 mb-2">1:47</div>
                  <h3 className="font-semibold mb-2">404 Detected</h3>
                  <p className="text-sm text-white/60">
                    Frustration spike. Deal risk identified.
                  </p>
                </div>
                
                <div className="glass-card p-6 text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">1:50</div>
                  <h3 className="font-semibold mb-2">CEO Alerted</h3>
                  <p className="text-sm text-white/60">
                    Text sent. Team mobilized. Fix initiated.
                  </p>
                </div>
                
                <div className="glass-card p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">5:00</div>
                  <h3 className="font-semibold mb-2">Deal Saved</h3>
                  <p className="text-sm text-white/60">
                    Link fixed. Ed happy. Trust restored.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* The Alternative Reality */}
          <section className="section py-20">
            <div className="max-w-6xl mx-auto">
              <div className="glass-card p-12 bg-gradient-to-br from-red-500/10 to-transparent">
                <h2 className="text-3xl font-bold mb-8 text-center">
                  Without SentientIQ: <span className="text-red-400">The $2.4M Loss</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-red-400">What Actually Happens</h3>
                    <ul className="space-y-3 text-white/70">
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">→</span>
                        <span>Ed hits 404, gets frustrated, closes tab</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">→</span>
                        <span>CMO asks: "What do you think?"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">→</span>
                        <span>Ed: "Their docs are broken. Seems sloppy."</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">→</span>
                        <span>CMO: "Let's go with the competitor"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">→</span>
                        <span>You find out next quarter in the loss report</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-green-400">With SentientIQ</h3>
                    <ul className="space-y-3 text-white/70">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">→</span>
                        <span>Ed hits 404, we detect frustration instantly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">→</span>
                        <span>Your phone buzzes: "Boeing at risk"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">→</span>
                        <span>Sales calls Ed: "So sorry, fixing now"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">→</span>
                        <span>Ed: "Wow, incredible response time"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">→</span>
                        <span>Deal closes tomorrow. $2.4M secured.</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="text-center mt-12 p-6 bg-black/30 rounded-lg">
                  <p className="text-2xl font-bold mb-2">
                    The difference: <span className="gradient-text">Knowing WHO and WHEN</span>
                  </p>
                  <p className="text-white/60">
                    Not "someone hit a 404" but "Ed from Boeing with $2.4M on the line hit a 404"
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* The Technology */}
          <section className="section py-20 bg-gradient-to-b from-transparent to-purple-900/10">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                How We <span className="gradient-text">Make This Possible</span>
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="glass-card p-8">
                  <div className="text-4xl mb-4">🔗</div>
                  <h3 className="text-xl font-bold mb-3">CRM Integration</h3>
                  <p className="text-white/70 mb-4">
                    We sync with HubSpot & Salesforce every 5 minutes. 
                    Every visitor is checked against active deals.
                  </p>
                  <div className="bg-black/30 rounded p-3 text-sm font-mono">
                    <div className="text-purple-400">// Real-time lookup</div>
                    <div>email: "ed@boeing.com"</div>
                    <div>→ deal: $2.4M</div>
                    <div>→ stage: "Final Review"</div>
                  </div>
                </div>
                
                <div className="glass-card p-8">
                  <div className="text-4xl mb-4">🧠</div>
                  <h3 className="text-xl font-bold mb-3">Behavioral Physics</h3>
                  <p className="text-white/70 mb-4">
                    Mouse velocity, click patterns, scroll behavior. 
                    We detect frustration in 300ms.
                  </p>
                  <div className="bg-black/30 rounded p-3 text-sm font-mono">
                    <div className="text-purple-400">// Emotion detection</div>
                    <div>velocity: 847px/s</div>
                    <div>pattern: "recoil"</div>
                    <div>→ emotion: "frustration"</div>
                  </div>
                </div>
                
                <div className="glass-card p-8">
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="text-xl font-bold mb-3">Instant Cascade</h3>
                  <p className="text-white/70 mb-4">
                    High-value + negative emotion = immediate intervention. 
                    CEO text in 3 seconds.
                  </p>
                  <div className="bg-black/30 rounded p-3 text-sm font-mono">
                    <div className="text-purple-400">// Intervention logic</div>
                    <div>if (value > $1M &&</div>
                    <div>&nbsp;&nbsp;&nbsp;&nbsp;emotion === "rage")</div>
                    <div>→ alert.CEO.NOW()</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The Proof */}
          <section className="section py-20">
            <div className="max-w-6xl mx-auto">
              <div className="glass-card p-12 text-center">
                <h2 className="text-4xl font-bold mb-8">
                  This Isn't Theory. <span className="gradient-text">This Is Live.</span>
                </h2>
                
                <div className="grid md:grid-cols-4 gap-6 mb-12">
                  <div>
                    <div className="text-4xl font-bold gradient-text">12</div>
                    <div className="text-white/60">Dead links fixed</div>
                    <div className="text-sm text-white/40">Last 30 days</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold gradient-text">$8.3M</div>
                    <div className="text-white/60">Revenue saved</div>
                    <div className="text-sm text-white/40">From interventions</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold gradient-text">3 sec</div>
                    <div className="text-white/60">Avg alert time</div>
                    <div className="text-sm text-white/40">For $100k+ deals</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold gradient-text">94%</div>
                    <div className="text-white/60">Save rate</div>
                    <div className="text-sm text-white/40">When we intervene</div>
                  </div>
                </div>
                
                <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
                  Every day, deals die from tiny failures. A dead link. A confusing form. 
                  A price that causes sticker shock. You never know. Until now.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="/auth"
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Start Saving Deals
                  </a>
                  <a
                    href="/marketing-website/src/components/LiveEmotionDemo"
                    className="px-8 py-4 glass-card hover:bg-white/10 rounded-lg font-semibold text-lg transition-all"
                  >
                    See Live Demo
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* The Bottom Line */}
          <section className="section py-20 bg-gradient-to-b from-transparent to-purple-900/20">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">
                Your Next <span className="gradient-text">Ed from Boeing</span> Moment
              </h2>
              <p className="text-xl text-white/80 mb-8">
                Is happening right now. On your site. With your prospects.
              </p>
              <p className="text-lg text-white/60 mb-12">
                The only question is: Will you know about it in time to save the deal?
              </p>
              
              <div className="glass-card p-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                <h3 className="text-2xl font-bold mb-4">With SentientIQ, you will.</h3>
                <p className="text-white/70 mb-6">
                  Install in 15 minutes. Save your first deal today.
                </p>
                <a
                  href="/auth"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Protect Your Revenue Now
                </a>
              </div>
            </div>
          </section>
          
          <Footer />
        </main>
      </div>
    </>
  );
}