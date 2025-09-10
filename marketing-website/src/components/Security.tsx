import React from 'react';

export default function Security() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 p-8">
        <h2 className="text-2xl font-semibold mb-6">Enterprise-Grade Security</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-400">✓</span>
              <h3 className="font-medium">End-to-End Encryption</h3>
            </div>
            <p className="text-sm text-white/60">All emotional data encrypted at rest and in transit</p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-400">✓</span>
              <h3 className="font-medium">Zero Data Retention</h3>
            </div>
            <p className="text-sm text-white/60">Your data never trains our models</p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-400">✓</span>
              <h3 className="font-medium">GDPR & CCPA</h3>
            </div>
            <p className="text-sm text-white/60">Full compliance with privacy regulations</p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="/security" className="text-white/70 hover:text-white underline decoration-white/30">Security whitepaper</a>
            <a href="/legal/privacy" className="text-white/70 hover:text-white underline decoration-white/30">Privacy policy</a>
            <a href="/legal/terms" className="text-white/70 hover:text-white underline decoration-white/30">Terms of service</a>
          </div>
        </div>
      </div>
    </section>
  );
}