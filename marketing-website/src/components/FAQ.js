import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function FAQ() {
    const qa = [
        { q: 'Do I need dev help to start?', a: 'No. Paste a URL and go. We stream your first insights instantly.' },
        { q: 'What data do you use?', a: 'Experience and performance signals. No third-party cookies.' },
        { q: 'Can I see the debate?', a: 'Yes. Watch personas argue in real-time and save conclusions to your plan.' },
        { q: 'What happens when I upgrade?', a: 'You unlock Boardroom debates, scheduling, persona publishing, and team seats.' }
    ];
    return (_jsxs("section", { id: "faq", className: "section py-16", children: [_jsx("p", { className: "kicker", children: "FAQ" }), _jsx("h2", { className: "mt-2 text-3xl font-semibold", children: "Answers, quickly" }), _jsx("div", { className: "mt-6 grid md:grid-cols-2 gap-6", children: qa.map((x, i) => (_jsxs("div", { className: "card", children: [_jsx("div", { className: "font-medium", children: x.q }), _jsx("p", { className: "mt-2 text-white/70", children: x.a })] }, i))) })] }));
}
