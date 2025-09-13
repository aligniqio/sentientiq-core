import React, { useState, useEffect } from 'react';

export default function IdentityReveal() {
  const [currentExample, setCurrentExample] = useState(0);
  
  const examples = [
    {
      who: "Your $100k ARR Enterprise Customer",
      emotion: "RAGE",
      confidence: "95%",
      context: "at checkout after 3 failed attempts",
      value: "$100,000/year",
      intervention: "CEO alerted. Support chat auto-opened. Discount applied.",
      outcome: "SAVED"
    },
    {
      who: "Fortune 500 Decision Maker",
      emotion: "CONFUSION",
      confidence: "87%",
      context: "on pricing page for 4 minutes",
      value: "$500,000 potential",
      intervention: "Sales rep notified. Comparison simplified. Demo offered.",
      outcome: "CONVERTED"
    },
    {
      who: "High-Value Trial User",
      emotion: "HESITATION",
      confidence: "82%",
      context: "hovering over cancel button",
      value: "$24,000/year",
      intervention: "Success manager called. Objection addressed. Extended trial.",
      outcome: "RETAINED"
    }
  ];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % examples.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);
  
  const example = examples[currentExample];
  
  return (
    <section className="section py-24 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-transparent" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="kicker">The Revolution</p>
          <h2 className="mt-3 text-5xl font-bold">
            We don't track <span className="text-white/50">anonymous sessions</span>.
            <br />
            We track <span className="gradient-text">YOUR users' emotions</span>.
          </h2>
          <p className="mt-6 text-xl text-white/70 max-w-3xl mx-auto">
            Every emotion has a name, a company, and a dollar value attached.
            This changes everything about how you respond.
          </p>
        </div>
        
        {/* Live Identity + Emotion Demo */}
        <div className="glass-card p-8 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-white/60 uppercase tracking-wider">Live Detection</span>
            </div>
            <div className="text-sm text-white/40">
              Connected to Your User Data
            </div>
          </div>
          
          {/* The Reveal */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Identity */}
            <div className="space-y-6">
              <div>
                <div className="text-sm text-purple-400 mb-2">WHO</div>
                <div className="text-2xl font-semibold">{example.who}</div>
                <div className="text-lg text-green-400 mt-1">{example.value}</div>
              </div>
              
              <div>
                <div className="text-sm text-purple-400 mb-2">WHAT</div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-red-400">{example.emotion}</span>
                  <span className="text-sm glass-card px-3 py-1">{example.confidence} confidence</span>
                </div>
                <div className="text-sm text-white/60 mt-2">{example.context}</div>
              </div>
            </div>
            
            {/* Right: Action & Outcome */}
            <div className="space-y-6">
              <div>
                <div className="text-sm text-purple-400 mb-2">INTERVENTION</div>
                <div className="glass-card p-4 bg-blue-500/5 border-blue-500/20">
                  <p className="text-white/90">{example.intervention}</p>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-purple-400 mb-2">RESULT</div>
                <div className="text-4xl font-bold text-green-400">
                  {example.outcome}
                </div>
              </div>
            </div>
          </div>
          
          {/* Timeline dots */}
          <div className="flex justify-center gap-2 mt-8">
            {examples.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentExample ? 'bg-purple-400' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* The Differentiator */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-semibold mb-2">User Identity Link</h3>
            <p className="text-sm text-white/60">
              Connect emotions to YOUR CRM records, auth system, and lifetime value
            </p>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">Value-Based Priority</h3>
            <p className="text-sm text-white/60">
              Enterprise rage gets CEO attention. Starter confusion gets docs.
            </p>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-3">🔄</div>
            <h3 className="font-semibold mb-2">CRM Integration</h3>
            <p className="text-sm text-white/60">
              Emotions sync to Salesforce & HubSpot. Your team knows before they call.
            </p>
          </div>
        </div>
        
        {/* The HOW - This is the differentiator */}
        <div className="glass-card p-8 mt-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
          <h3 className="text-2xl font-semibold mb-6 text-center">
            "How do you connect users to emotions?" The answer that changes everything.
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-medium text-red-400 mb-4">What Everyone Else Does</h4>
              <ul className="space-y-3 text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">×</span>
                  <span>IP lookup → guess company (30% accurate)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">×</span>
                  <span>Cookie matching → maybe get email (2% match rate)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">×</span>
                  <span>Fingerprinting → anonymous ID (legally questionable)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">×</span>
                  <span>Result: "Someone from Microsoft" clicked something</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-green-400 mb-4">What SentientIQ Does</h4>
              <ul className="space-y-3 text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>YOUR app tells us who's logged in (100% accurate)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>We link their identity to their emotions (permanent)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Sync with YOUR CRM data (real customer value)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Result: "john@fortune500.com ($100k/yr) is raging"</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-black/30 rounded-lg">
            <h4 className="text-lg font-medium mb-4">The Integration That Changes Everything</h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-purple-400 font-medium mb-2">Your App</div>
                <code className="text-xs bg-white/10 px-2 py-1 rounded block">
                  SentientIQ.identify({`{`}<br/>
                  &nbsp;&nbsp;userId: user.id,<br/>
                  &nbsp;&nbsp;email: user.email,<br/>
                  &nbsp;&nbsp;value: user.ltv<br/>
                  {`}`})
                </code>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-2xl">→</span>
              </div>
              <div>
                <div className="text-purple-400 font-medium mb-2">We Detect</div>
                <div className="space-y-1 text-white/80">
                  <div>✓ Who they are</div>
                  <div>✓ What they feel</div>
                  <div>✓ When to intervene</div>
                  <div>✓ How much they're worth</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-lg text-white/90 font-medium">
              We don't guess who your users are. Your app tells us. Then we track what they're feeling.
            </p>
            <p className="text-sm text-white/60 mt-2">
              No IP guessing. No cookie matching. No privacy violations. Just your authenticated users.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}