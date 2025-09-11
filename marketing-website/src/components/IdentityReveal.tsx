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
            We identify <span className="gradient-text">WHO is feeling WHAT</span>.
          </h2>
          <p className="mt-6 text-xl text-white/70 max-w-3xl mx-auto">
            Every emotion has a name, a company, and a dollar value attached.
            This changes everything about how you respond.
          </p>
        </div>
        
        {/* Live Identity Resolution Demo */}
        <div className="glass-card p-8 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-white/60 uppercase tracking-wider">Live Detection</span>
            </div>
            <div className="text-sm text-white/40">
              Identity Resolution Active
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
            <h3 className="font-semibold mb-2">Identity Resolution</h3>
            <p className="text-sm text-white/60">
              Connect emotions to CRM records, email, company, and lifetime value
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
        
        {/* The Hook */}
        <div className="text-center mt-12">
          <p className="text-lg text-white/70">
            <span className="text-white font-semibold">One line of code</span> to know every customer's emotional state.
            <br />
            <code className="text-sm bg-white/10 px-2 py-1 rounded mt-2 inline-block">
              SentientIQ.identify({`{userId, email, value}`})
            </code>
          </p>
        </div>
      </div>
    </section>
  );
}