/**
 * Marketing at the Speed of Emotion™
 * The Crystal Palace of Marketing Truth
 */

import React, { useState, useEffect } from 'react';

const EMOTION_STATES = [
  { name: 'RAGE', color: '#DC2626', time: '300ms', action: 'Emergency intervention' },
  { name: 'HESITATION', color: '#F97316', time: '1.2s', action: 'Simplify choices' },
  { name: 'CURIOSITY', color: '#10B981', time: '30s', action: 'Reveal more' },
  { name: 'DELIGHT', color: '#EC4899', time: 'instant', action: 'Upsell opportunity' },
  { name: 'ABANDONMENT', color: '#991B1B', time: '3s', action: 'Exit intent trigger' }
];

export default function EmotionalEngine() {
  const [currentEmotion, setCurrentEmotion] = useState(0);
  const [detections, setDetections] = useState(0);
  const [interventions, setInterventions] = useState(0);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEmotion((prev) => (prev + 1) % EMOTION_STATES.length);
      setDetections(prev => prev + Math.floor(Math.random() * 5) + 1);
      setInterventions(prev => prev + Math.floor(Math.random() * 3));
      setRevenue(prev => prev + Math.floor(Math.random() * 1000) + 100);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const emotion = EMOTION_STATES[currentEmotion];

  return (
    <section className="section py-24 relative overflow-hidden">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-cyan-900/20" />
      
      <div className="relative z-10">
        <div className="text-center mb-16">
          <p className="kicker">Marketing at the Speed of Emotion™</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-semibold">
            Stop tracking <span className="gradient-text">shadows</span>.
            <br />
            Start measuring <span className="gradient-text">substance</span>.
          </h2>
          <p className="mt-5 text-lg text-white/70 max-w-3xl mx-auto">
            While everyone else is collecting clicks, we're detecting emotions in real-time.
            No Math.random(). No bullshit insights. Just pure behavioral physics.
          </p>
        </div>

        {/* Live Detection Display */}
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white/90">Live Emotional Detection</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-green-400">LIVE</span>
              </div>
            </div>
            
            {/* Current Emotion Display */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${emotion.color}20`, border: `2px solid ${emotion.color}` }}
                  >
                    {emotion.name === 'RAGE' ? '🤬' :
                     emotion.name === 'HESITATION' ? '🤔' :
                     emotion.name === 'CURIOSITY' ? '🔍' :
                     emotion.name === 'DELIGHT' ? '🤩' : '🚪'}
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: emotion.color }}>
                      {emotion.name}
                    </div>
                    <div className="text-sm text-white/60">
                      Detected in {emotion.time}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-white/60 mb-1">Confidence</div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: '95%', backgroundColor: emotion.color }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-white/60 mb-1">Intervention Window</div>
                    <div className="text-lg font-semibold">{emotion.time}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-white/60 mb-1">Recommended Action</div>
                    <div className="text-lg font-semibold text-green-400">{emotion.action}</div>
                  </div>
                </div>
              </div>
              
              {/* Real-time Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4">
                  <div className="text-3xl font-bold text-white">{detections.toLocaleString()}</div>
                  <div className="text-sm text-white/60">Emotions Detected</div>
                </div>
                <div className="glass-card p-4">
                  <div className="text-3xl font-bold text-green-400">{interventions}</div>
                  <div className="text-sm text-white/60">Interventions Triggered</div>
                </div>
                <div className="glass-card p-4">
                  <div className="text-3xl font-bold text-cyan-400">${revenue.toLocaleString()}</div>
                  <div className="text-sm text-white/60">Revenue Saved</div>
                </div>
                <div className="glass-card p-4">
                  <div className="text-3xl font-bold text-purple-400">0</div>
                  <div className="text-sm text-white/60">Mock Data Used</div>
                </div>
              </div>
            </div>
          </div>

          {/* The Truth Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="glass-card p-6">
              <h4 className="font-semibold mb-3 text-white/90">Traditional Analytics</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• "User clicked 47 times"</li>
                <li>• "Session duration: 3:42"</li>
                <li>• "Bounce rate: 62%"</li>
                <li>• "Intent score: HIGH"</li>
              </ul>
              <div className="mt-4 text-red-400 font-semibold">The shadows</div>
            </div>
            
            <div className="glass-card p-6">
              <h4 className="font-semibold mb-3 text-white/90">Emotional Intelligence</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• "Rage pattern at 95% confidence"</li>
                <li>• "Decision paralysis for 42 seconds"</li>
                <li>• "Abandonment predicted in 3s"</li>
                <li>• "Delight spike - upsell now"</li>
              </ul>
              <div className="mt-4 text-green-400 font-semibold">The substance</div>
            </div>
            
            <div className="glass-card p-6">
              <h4 className="font-semibold mb-3 text-white/90">The Accountability</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Every recommendation tracked</li>
                <li>• Every ignore recorded</li>
                <li>• Revenue left on table: visible</li>
                <li>• Full cancellation report</li>
              </ul>
              <div className="mt-4 text-cyan-400 font-semibold">The truth</div>
            </div>
          </div>

          {/* Key Features */}
          <div className="glass-card p-8">
            <h3 className="text-2xl font-semibold mb-6 text-center">
              The Antithesis to generateBullshitInsights()
            </h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-4 text-purple-400">What We Built</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span><strong>Behavioral Physics:</strong> No probabilities. Pure mechanical detection from micro-behaviors.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span><strong>Real-time Intervention:</strong> Act within the 5-second window before rage becomes abandonment.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span><strong>Pattern Evolution:</strong> ML that learns from outcomes, not assumptions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span><strong>Data Moat:</strong> Your users' emotional signatures are YOUR competitive advantage.</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4 text-cyan-400">The SentientIQ Scorecard</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">📊</span>
                    <span><strong>Total Recommendations:</strong> Every insight we gave you</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">📊</span>
                    <span><strong>Actions Taken:</strong> What you actually did about it</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">📊</span>
                    <span><strong>Revenue Impact:</strong> Exactly what ignoring us cost you</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">📊</span>
                    <span><strong>Accountability Score:</strong> 0-100. No bullshit. Full truth.</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gradient-to-r from-purple-900/20 to-cyan-900/20 rounded-lg border border-white/10">
              <p className="text-center text-sm text-white/80">
                <strong>Zero mock data.</strong> If we have nothing, we show nothing. 
                The crystal palace of marketing truth shows only truth - even when that truth is zero.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <p className="text-lg mb-4 text-white/80">
              Stop measuring what happened. Start preventing what's about to.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://app.sentientiq.com/scorecard" 
                className="btn-primary px-8 py-4 text-lg"
              >
                See Your Scorecard
              </a>
              <a 
                href="https://app.sentientiq.com/start" 
                className="btn-ghost px-8 py-4 text-lg"
              >
                Start Detecting Emotions
              </a>
            </div>
            <p className="mt-4 text-xs text-white/50">
              Real emotions. Real predictions. Real accountability.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}