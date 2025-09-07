import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function HowItWorks() {
    const steps = [
        { title: 'Scan', desc: 'Paste your URL. We scan performance and UX signals—no cookies or trackers.' },
        { title: 'Read', desc: 'We map signals to Plutchik emotions to create your emotional fingerprint.' },
        { title: 'Debate', desc: 'Specialist agents argue the best moves. You watch the stream live.' },
        { title: 'Act', desc: 'Daily Refresh turns insights into small, compounding wins.' }
    ];
    return (_jsxs("section", { id: "how", className: "section py-16", children: [_jsx("p", { className: "kicker", children: "How it works" }), _jsx("h2", { className: "mt-2 text-3xl font-semibold", children: "From feeling \u2192 to decision \u2192 to lift" }), _jsx("div", { className: "mt-8 grid md:grid-cols-4 gap-6", children: steps.map((s, i) => (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "text-sm text-white/50", children: ["Step ", i + 1] }), _jsx("div", { className: "mt-1 font-medium", children: s.title }), _jsx("p", { className: "mt-2 text-white/70", children: s.desc })] }, i))) })] }));
}
