import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ValueProps() {
    const items = [
        { h: 'Real emotions, not intent guesses', p: 'Deterministic reads from real experience—joy, anger, fear, trust—not fuzzy intent scores.' },
        { h: '3-second onboarding', p: 'Start free. No scripts to paste. No cookies to consent.' },
        { h: 'Daily Refresh', p: 'One small recommendation each day with evidence snippets you can share.' },
        { h: 'Boardroom Debate', p: 'When it matters, invite the full 12-persona faculty to argue it out.' },
    ];
    return (_jsx("section", { id: "value", className: "section py-16", children: _jsx("div", { className: "grid md:grid-cols-2 gap-6", children: items.map((it, i) => (_jsxs("div", { className: "card", children: [_jsx("h3", { className: "text-xl font-semibold", children: it.h }), _jsx("p", { className: "mt-2 text-white/70", children: it.p })] }, i))) }) }));
}
