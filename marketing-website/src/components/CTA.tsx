import React from 'react';

export default function CTA() {
  return (
    <section className="section py-20">
      <div className="card text-center">
        <p className="kicker">Ready when you are</p>
        <h2 className="mt-2 text-3xl font-semibold">Get your emotional fingerprint in minutes.</h2>
        <p className="mt-3 text-white/70">Free to start. No scripts. No cookies. Just answers.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <a className="btn-primary" href="https://sentientiq.app/signup">Start free</a>
          <a className="btn-ghost" href="#how">See how it works</a>
        </div>
      </div>
    </section>
  );
}
