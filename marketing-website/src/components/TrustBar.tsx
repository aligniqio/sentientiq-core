import React from 'react';

export default function TrustBar() {
  return (
    <section className="py-8 border-y border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
          <span className="text-sm text-white/70">Trusted by teams at</span>
          <span className="text-white">Stripe</span>
          <span className="text-white">Notion</span>
          <span className="text-white">Linear</span>
          <span className="text-white">Vercel</span>
          <span className="text-white">Supabase</span>
        </div>
      </div>
    </section>
  );
}