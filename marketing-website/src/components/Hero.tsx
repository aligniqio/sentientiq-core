import React, { useState, useEffect } from 'react';

export default function Hero() {
  const [emotionIndex, setEmotionIndex] = useState(0);
  const emotions = ['rage', 'hesitation', 'confusion', 'abandonment', 'paralysis'];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setEmotionIndex((prev) => (prev + 1) % emotions.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="section pt-6 pb-16 md:pt-10 md:pb-24 text-center">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6 uppercase tracking-wider">
          YOUR CUSTOMERS ARE SCREAMING. YOU JUST CAN'T HEAR THEM.
        </h2>
        <p className="kicker">Marketing at the Speed of Emotion™</p>
        <h1 className="mt-3 text-4xl md:text-6xl font-semibold leading-tight">
          Your $100k customer just felt <span className="gradient-text">{emotions[emotionIndex]}</span>.
          <br />
          <span className="text-white/80">You have 3 seconds to save them.</span>
        </h1>
        <p className="mt-5 text-lg text-white/70 max-w-3xl mx-auto">
          We don't count clicks. We identify <span className="text-white">WHO is feeling WHAT</span> through 
          behavioral physics. When john@fortune500.com shows rage at checkout, 
          you'll know instantly. With their name, company, and lifetime value attached.
        </p>
        
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          <div className="glass-card p-3 text-center">
            <div className="text-2xl font-bold text-green-400">95%</div>
            <div className="text-xs text-white/60">Detection Confidence</div>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">300ms</div>
            <div className="text-xs text-white/60">Response Time</div>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">0</div>
            <div className="text-xs text-white/60">Mock Data</div>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">100%</div>
            <div className="text-xs text-white/60">Accountability</div>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a className="btn-primary text-base px-6 py-3" href="https://app.sentientiq.com/scorecard">
            See Your Accountability Scorecard
          </a>
          <a className="btn-ghost text-base px-6 py-3" href="#emotional-engine">
            Watch emotions in real-time
          </a>
        </div>
        <p className="mt-4 text-xs text-white/50">
          The antithesis to generateBullshitInsights() • Real emotions • Real accountability
        </p>
      </div>
    </section>
  );
}