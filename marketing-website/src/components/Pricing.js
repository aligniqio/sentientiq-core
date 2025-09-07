import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export async function startCheckout(priceId, opts) {
    if (!priceId)
        throw new Error('Missing Stripe price id');
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
        }));
        if (!data?.url)
            throw new Error('Server did not return a checkout URL.');
        window.location.assign(data.url); // reliable redirect
    }
    finally {
        clearTimeout(timer);
    }
}
export default function Pricing() {
    return (_jsxs("section", { id: "pricing", className: "section py-20", children: [_jsx("p", { className: "kicker", children: "Pricing" }), _jsx("h2", { className: "mt-2 text-3xl font-semibold", children: "Start free. Upgrade when you\u2019re ready." }), _jsxs("div", { className: "mt-8 grid md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "card", children: [_jsx("h3", { className: "text-xl font-semibold", children: "Free" }), _jsx("p", { className: "mt-2 text-white/70", children: "Daily Refresh, micro-debates, your Plutchik fingerprint." }), _jsxs("ul", { className: "mt-4 space-y-2 text-white/70", children: [_jsx("li", { children: "\u2022 1 insight per day" }), _jsx("li", { children: "\u2022 Two-persona micro-debates" }), _jsx("li", { children: "\u2022 Shareable evidence snippets" })] }), _jsx("a", { className: "btn-primary mt-6 inline-block", href: "https://sentientiq.app/signup", children: "Start free" })] }), _jsxs("div", { className: "card border-white/20", children: [_jsx("h3", { className: "text-xl font-semibold", children: "Pro" }), _jsx("p", { className: "mt-2 text-white/70", children: "Boardroom debates, scheduling, persona publishing, team seats." }), _jsxs("div", { className: "mt-4 text-3xl font-semibold", children: ["$99", _jsx("span", { className: "text-base font-normal text-white/60", children: "/mo" })] }), _jsxs("ul", { className: "mt-4 space-y-2 text-white/70", children: [_jsx("li", { children: "\u2022 12-persona Boardroom debates" }), _jsx("li", { children: "\u2022 Schedule weekly debates" }), _jsx("li", { children: "\u2022 Edit & publish personas" }), _jsx("li", { children: "\u2022 Team collaboration" })] }), _jsx("button", { className: "btn-primary mt-6", onClick: () => startCheckout(import.meta.env.VITE_STRIPE_PRICE_ID || ''), children: "Upgrade to Pro" }), _jsx("p", { className: "mt-2 text-xs text-white/50", children: "Hosted Stripe Checkout" })] })] })] }));
}
