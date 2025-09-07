type CheckoutResponse = { url: string };

export async function startCheckout(priceId: string, opts?: { timeoutMs?: number }) {
  if (!priceId) throw new Error('Missing Stripe price id');

  const timeoutMs = opts?.timeoutMs ?? 15000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ priceId }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => `${res.status} ${res.statusText}`);
      throw new Error(`Checkout failed: ${msg}`);
    }

    const data = (await res.json().catch(async () => {
      const t = await res.text().catch(() => '');
      throw new Error(`Invalid server response${t ? `: ${t.slice(0, 180)}` : ''}`);
    })) as CheckoutResponse;

    if (!data?.url) throw new Error('Server did not return a checkout URL.');
    window.location.assign(data.url); // reliable redirect
  } finally {
    clearTimeout(timer);
  }
}


export default function Pricing() {
  return (
    <section id="pricing" className="section py-20">
      <p className="kicker">Pricing</p>
      <h2 className="mt-2 text-3xl font-semibold">Start free. Upgrade when you’re ready.</h2>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold">Free</h3>
          <p className="mt-2 text-white/70">Daily Refresh, micro-debates, your Plutchik fingerprint.</p>
          <ul className="mt-4 space-y-2 text-white/70">
            <li>• 1 insight per day</li>
            <li>• Two-persona micro-debates</li>
            <li>• Shareable evidence snippets</li>
          </ul>
          <a className="btn-primary mt-6 inline-block" href="https://sentientiq.app/signup">Start free</a>
        </div>

        <div className="card border-white/20">
          <h3 className="text-xl font-semibold">Pro</h3>
          <p className="mt-2 text-white/70">Boardroom debates, scheduling, persona publishing, team seats.</p>
          <div className="mt-4 text-3xl font-semibold">$99<span className="text-base font-normal text-white/60">/mo</span></div>
          <ul className="mt-4 space-y-2 text-white/70">
            <li>• 12-persona Boardroom debates</li>
            <li>• Schedule weekly debates</li>
            <li>• Edit & publish personas</li>
            <li>• Team collaboration</li>
          </ul>
          <button className="btn-primary mt-6" onClick={() => startCheckout(import.meta.env.VITE_STRIPE_PRICE_ID || '')}>
            Upgrade to Pro
          </button>
          <p className="mt-2 text-xs text-white/50">Hosted Stripe Checkout</p>
        </div>
      </div>
    </section>
  );
}
