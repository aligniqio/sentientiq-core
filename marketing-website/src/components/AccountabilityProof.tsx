import React, { useState, useEffect } from 'react';

export default function AccountabilityProof() {
  const [liveMetrics, setLiveMetrics] = useState({
    recommendations: 147,
    ignored: 43,
    revenueLost: 342000,
    customerLost: 8
  });
  
  // Simulate live updates
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveMetrics(prev => ({
        recommendations: prev.recommendations + Math.floor(Math.random() * 3),
        ignored: prev.ignored + (Math.random() > 0.7 ? 1 : 0),
        revenueLost: prev.revenueLost + (Math.random() > 0.7 ? Math.floor(Math.random() * 50000) : 0),
        customerLost: prev.customerLost + (Math.random() > 0.9 ? 1 : 0)
      }));
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <section className="section py-24 relative">
      {/* Dramatic background */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="kicker text-red-400">Accountability</p>
          <h2 className="mt-3 text-5xl font-bold">
            We show you exactly what <span className="text-red-400">ignoring emotions</span> costs
          </h2>
          <p className="mt-6 text-xl text-white/70 max-w-3xl mx-auto">
            Every recommendation. Every ignored alert. Every lost customer.
            All tracked with revenue impact. No place to hide.
          </p>
        </div>
        
        {/* Live Accountability Dashboard */}
        <div className="glass-card p-8 rounded-2xl border-red-500/20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-semibold">Company X - Last 30 Days</h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-white/60">LIVE</span>
            </div>
          </div>
          
          {/* Accountability Score */}
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-red-400 mb-2">F</div>
            <div className="text-2xl text-white/60">Accountability Grade</div>
            <div className="text-lg text-white/40 mt-2">29% action rate</div>
          </div>
          
          {/* Metrics Grid */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="glass-card p-6 bg-gradient-to-br from-blue-500/10 to-blue-900/5">
              <div className="text-sm text-blue-400 mb-2">Total Recommendations</div>
              <div className="text-3xl font-bold">{liveMetrics.recommendations}</div>
              <div className="text-xs text-white/40 mt-1">High-confidence interventions</div>
            </div>
            
            <div className="glass-card p-6 bg-gradient-to-br from-red-500/10 to-red-900/5">
              <div className="text-sm text-red-400 mb-2">Ignored</div>
              <div className="text-3xl font-bold text-red-400">{liveMetrics.ignored}</div>
              <div className="text-xs text-white/40 mt-1">No action taken</div>
            </div>
            
            <div className="glass-card p-6 bg-gradient-to-br from-red-600/10 to-red-900/5">
              <div className="text-sm text-red-400 mb-2">Revenue Lost</div>
              <div className="text-3xl font-bold text-red-500">
                ${(liveMetrics.revenueLost / 1000).toFixed(0)}k
              </div>
              <div className="text-xs text-white/40 mt-1">From ignored interventions</div>
            </div>
            
            <div className="glass-card p-6 bg-gradient-to-br from-orange-500/10 to-orange-900/5">
              <div className="text-sm text-orange-400 mb-2">Customers Lost</div>
              <div className="text-3xl font-bold text-orange-400">{liveMetrics.customerLost}</div>
              <div className="text-xs text-white/40 mt-1">Preventable churn</div>
            </div>
          </div>
          
          {/* Ignored Recommendations Log */}
          <div className="space-y-3">
            <h4 className="text-sm text-white/60 uppercase tracking-wider mb-3">
              Recent Ignored Critical Alerts
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 glass-card bg-red-500/5 border-red-500/20">
                <div className="flex items-center gap-4">
                  <span className="text-red-400 font-mono text-sm">2m ago</span>
                  <span className="text-white/90">Enterprise customer rage on checkout</span>
                  <span className="text-xs glass-card px-2 py-1">$120k ARR</span>
                </div>
                <span className="text-red-400 font-semibold">IGNORED</span>
              </div>
              
              <div className="flex items-center justify-between p-3 glass-card bg-red-500/5 border-red-500/20">
                <div className="flex items-center gap-4">
                  <span className="text-red-400 font-mono text-sm">17m ago</span>
                  <span className="text-white/90">VIP abandonment detected</span>
                  <span className="text-xs glass-card px-2 py-1">$85k ARR</span>
                </div>
                <span className="text-red-400 font-semibold">IGNORED</span>
              </div>
              
              <div className="flex items-center justify-between p-3 glass-card bg-red-500/5 border-red-500/20">
                <div className="flex items-center gap-4">
                  <span className="text-red-400 font-mono text-sm">1h ago</span>
                  <span className="text-white/90">Decision paralysis on pricing</span>
                  <span className="text-xs glass-card px-2 py-1">$50k potential</span>
                </div>
                <span className="text-red-400 font-semibold">IGNORED</span>
              </div>
            </div>
          </div>
          
          {/* The Verdict */}
          <div className="mt-8 p-6 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg border border-red-500/30">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div>
                <h4 className="font-semibold mb-2">Accountability Insight</h4>
                <p className="text-white/70">
                  You consistently ignore rage signals (78% ignored). This pattern alone has cost 
                  <span className="text-red-400 font-semibold"> $342,000 in preventable churn</span> this month.
                </p>
                <p className="text-sm text-white/50 mt-2">
                  Recommended: Enable automatic Slack alerts for high-value rage events.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* The Truth */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="text-center">
            <div className="text-4xl font-bold text-white/90 mb-2">
              Every Alert
            </div>
            <p className="text-sm text-white/60">
              Tracked, timestamped, and scored for severity
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white/90 mb-2">
              Every Inaction
            </div>
            <p className="text-sm text-white/60">
              Measured in dollars lost and customers churned
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white/90 mb-2">
              Every Outcome
            </div>
            <p className="text-sm text-white/60">
              Proven ROI of acting vs ignoring emotions
            </p>
          </div>
        </div>
        
        {/* CTA */}
        <div className="text-center mt-12">
          <a href="/scorecard" className="btn-primary text-lg px-8 py-4">
            See Your Accountability Score
          </a>
          <p className="text-sm text-white/40 mt-4">
            No judgment. Just math.
          </p>
        </div>
      </div>
    </section>
  );
}