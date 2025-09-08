import React from 'react';

export default function FinalCTA() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-semibold">
          Stop guessing. Start shipping.
        </h2>
        <p className="mt-4 text-white/70 text-lg max-w-2xl mx-auto">
          Join teams who've 3x'd their conversion in 30 days with AI-powered debates
        </p>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a href="https://sentientiq.app/signup" 
             className="px-6 py-3 rounded-lg bg-white text-black hover:bg-white/90 font-medium">
            Start free trial
          </a>
          <a href="https://sentientiq.app/boardroom?demo=1" 
             className="px-6 py-3 rounded-lg border border-white/20 hover:bg-white/5 font-medium">
            Watch a live debate
          </a>
        </div>
        
        <p className="mt-6 text-sm text-white/50">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  );
}