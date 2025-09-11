import React from 'react';

export default function TransparencyManifesto() {
  return (
    <section className="section py-24 relative">
      {/* Crystal palace effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="kicker">The Manifesto</p>
          <h2 className="mt-3 text-5xl font-bold">
            This glassmorphism isn't a <span className="text-white/50">design choice</span>.
            <br />
            It's a <span className="gradient-text">transparency statement</span>.
          </h2>
        </div>
        
        {/* The Crystal Palace of Truth */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* What Dies */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-red-400 mb-6">
              What Dies Today
            </h3>
            
            <div className="glass-card p-6 bg-red-500/5 border-red-500/20">
              <div className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <div>
                  <div className="font-medium mb-1">"Trust our algorithm"</div>
                  <p className="text-sm text-white/60">
                    Black box magic that no one can explain
                  </p>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 bg-red-500/5 border-red-500/20">
              <div className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <div>
                  <div className="font-medium mb-1">"It's on our roadmap"</div>
                  <p className="text-sm text-white/60">
                    Vaporware promises to close deals
                  </p>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 bg-red-500/5 border-red-500/20">
              <div className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <div>
                  <div className="font-medium mb-1">"Your data? Yeah, sorry about that"</div>
                  <p className="text-sm text-white/60">
                    Privacy theater while harvesting everything
                  </p>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 bg-red-500/5 border-red-500/20">
              <div className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <div>
                  <div className="font-medium mb-1">"Impressive 10x ROI*"</div>
                  <p className="text-sm text-white/60">
                    *Results not typical, your mileage may vary
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* What Lives */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-green-400 mb-6">
              What Lives Forever
            </h3>
            
            <div className="glass-card p-6 bg-green-500/5 border-green-500/20">
              <div className="flex items-start gap-3">
                <span className="text-green-400">✓</span>
                <div>
                  <div className="font-medium mb-1">Behavioral Physics</div>
                  <p className="text-sm text-white/60">
                    Deterministic detection you can verify yourself
                  </p>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 bg-green-500/5 border-green-500/20">
              <div className="flex items-start gap-3">
                <span className="text-green-400">✓</span>
                <div>
                  <div className="font-medium mb-1">Live Since Day One</div>
                  <p className="text-sm text-white/60">
                    Everything works. Today. No waitlist games.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 bg-green-500/5 border-green-500/20">
              <div className="flex items-start gap-3">
                <span className="text-green-400">✓</span>
                <div>
                  <div className="font-medium mb-1">Your Data = Your Property</div>
                  <p className="text-sm text-white/60">
                    Export everything. Delete everything. Own everything.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 bg-green-500/5 border-green-500/20">
              <div className="flex items-start gap-3">
                <span className="text-green-400">✓</span>
                <div>
                  <div className="font-medium mb-1">Accountability Scorecard</div>
                  <p className="text-sm text-white/60">
                    See exactly what we saved. And what you lost.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* The Transparency Grid */}
        <div className="glass-card p-8 rounded-2xl mb-12">
          <h3 className="text-2xl font-semibold mb-8 text-center">
            Everything Transparent. Everything Accountable.
          </h3>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">📊</div>
              <h4 className="font-medium mb-2">Real Metrics</h4>
              <p className="text-xs text-white/60">
                No vanity metrics. Just rage, confusion, and revenue.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">🔬</div>
              <h4 className="font-medium mb-2">Open Logic</h4>
              <p className="text-xs text-white/60">
                3 clicks in 300ms = rage. You can verify it yourself.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">💰</div>
              <h4 className="font-medium mb-2">Clear Pricing</h4>
              <p className="text-xs text-white/60">
                No "Contact Sales" for basic pricing. It's all here.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">🎯</div>
              <h4 className="font-medium mb-2">Direct Results</h4>
              <p className="text-xs text-white/60">
                Customer saved or lost. Revenue impact. No ambiguity.
              </p>
            </div>
          </div>
        </div>
        
        {/* The Promise */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
            <h3 className="text-2xl font-semibold mb-4">Our Promise</h3>
            <p className="text-lg text-white/80 leading-relaxed">
              We will show you <span className="text-white font-semibold">exactly</span> who 
              is feeling what. We will prescribe <span className="text-white font-semibold">exactly</span> what 
              to do. We will track <span className="text-white font-semibold">exactly</span> what 
              happens when you act (or don't).
            </p>
            <p className="text-lg text-white/80 mt-4">
              No black boxes. No excuses. No bullshit.
            </p>
            <p className="text-sm text-white/50 mt-6">
              If we can't prove it, we won't claim it.
            </p>
          </div>
        </div>
        
        {/* The Signature */}
        <div className="text-center mt-12">
          <p className="text-white/40 text-sm">
            This is the crystal palace of marketing truth.
            <br />
            Welcome to radical transparency.
          </p>
        </div>
      </div>
    </section>
  );
}