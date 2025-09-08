import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const scripts = {
    pricing: [
        `## 14-Day Moves`,
        `- **Paywall ROI copy + guarantee** → Owner: PMM — ETA: 7d — **KPI:** conv +3 pts; **ARPU ≥ 85% baseline** — **Emotion:** fear ↓30%`,
        `- **Starter tier experiment (40–60%)** with 3 value-locks → Owner: PM — ETA: 10d — **KPI:** +2 pts conv; Net revenue/trial ≥ control`,
        `- **JIT trial extensions** for high-engage/no-"aha" cohort → Owner: CS Ops — ETA: 5d — **KPI (subset):** ≥ control conv`,
        ``,
        `## 30–60 Day Moves`,
        `- Pricing page with **value metric** & proof band; annual default`,
        `- Weekly scheduled Boardroom on top funnel + onboarding`,
        `- Slack/Email alerts when fear/anger spike`,
        ``,
        `## Metrics & Guardrails`,
        `- **Primary:** free→paid **3% → 9–10%** by Day 20`,
        `- **Floors:** ARPU ≥ 85% baseline; refund ≤ +2 pts; 30-day churn ≤ baseline`,
        `- **Stop:** if conv lift < +2 pts after 10 days **or** ARPU < 85%, revert paywall`
    ].join('\n'),
    onboarding: [
        `## Immediate Actions`,
        `- **Simplify setup flow** → Owner: UX — ETA: 5d — **KPI:** completion +15 pts; time-to-value -40%`,
        `- **Interactive demo mode** → Owner: Eng — ETA: 8d — **KPI:** activation +20 pts; support tickets -25%`,
        `- **Progress indicators** with celebration moments → Owner: Design — ETA: 3d — **KPI:** day-1 retention +10 pts`,
        ``,
        `## Week 2-4 Improvements`,
        `- Smart defaults based on user segment`,
        `- Skip-able steps with "complete later" option`,
        `- In-app guided tours for key features`,
        ``,
        `## Success Metrics`,
        `- **Target:** 80% completion rate within 10 minutes`,
        `- **Activation:** 65% reach "aha moment" on day 1`,
        `- **Support:** <5% contact rate during onboarding`
    ].join('\n'),
    churn: [
        `## Retention Sprint`,
        `- **Exit survey with incentive** → Owner: Research — ETA: 2d — **KPI:** 40% response rate; actionable insights`,
        `- **Win-back email sequence** → Owner: Lifecycle — ETA: 5d — **KPI:** 8% reactivation within 30d`,
        `- **Pause option** instead of cancel → Owner: Product — ETA: 7d — **KPI:** 25% choose pause vs cancel`,
        ``,
        `## Prevention Strategy`,
        `- Health score monitoring with alerts`,
        `- Proactive outreach for at-risk accounts`,
        `- Feature adoption campaigns`,
        ``,
        `## Recovery Targets`,
        `- **Voluntary churn:** <3% monthly`,
        `- **Win-back rate:** 10% within 90 days`,
        `- **Pause-to-resume:** 40% within 6 months`
    ].join('\n')
};
export default function LiveDemo() {
    const [selectedScript, setSelectedScript] = React.useState('pricing');
    const [text, setText] = React.useState('');
    const [playing, setPlaying] = React.useState(false);
    const [done, setDone] = React.useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
    const [ctaVariant, setCtaVariant] = React.useState('answer');
    React.useEffect(() => {
        const randomScript = Object.keys(scripts)[Math.floor(Math.random() * Object.keys(scripts).length)];
        setSelectedScript(randomScript);
        setCtaVariant(Math.random() > 0.5 ? 'debate' : 'answer');
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);
        const handleChange = (e) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);
    React.useEffect(() => {
        const script = scripts[selectedScript];
        const totalMs = 8000;
        if (prefersReducedMotion) {
            setText(script);
            setDone(true);
            setPlaying(false);
            return;
        }
        let id;
        let i = 0;
        const len = script.length;
        const step = Math.max(1, Math.floor(len / (totalMs / 16)));
        function tick() {
            i = Math.min(len, i + step + Math.floor(Math.random() * 2));
            setText(script.slice(0, i));
            if (i >= len) {
                setDone(true);
                setPlaying(false);
                cancelAnimationFrame(id);
                return;
            }
            id = requestAnimationFrame(tick);
        }
        if (playing) {
            setDone(false);
            setText('');
            id = requestAnimationFrame(tick);
        }
        return () => {
            if (id)
                cancelAnimationFrame(id);
        };
    }, [playing, selectedScript, prefersReducedMotion]);
    function replay() {
        setPlaying(true);
    }
    function switchScript(type) {
        setSelectedScript(type);
        setPlaying(true);
    }
    React.useEffect(() => {
        if (!playing && !done) {
            setPlaying(true);
        }
    }, []);
    return (_jsx("section", { className: "max-w-7xl mx-auto px-6 py-16", children: _jsxs("div", { className: "rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6 md:p-8", children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-8 w-8 rounded-lg bg-white/10 grid place-items-center", children: _jsx("span", { "aria-hidden": true, children: "\uD83E\uDDE0" }) }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-white/60", children: "Live demo" }), _jsx("h3", { className: "text-xl font-semibold", children: "Moderator Answer" }), _jsxs("p", { className: "text-white/70 text-sm", children: ["What you get when you click ", _jsx("em", { children: ctaVariant === 'answer' ? 'Get Answer' : 'Start a Debate' }), " \u2014 fast, focused, shippable."] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [!done ? (_jsxs("div", { className: "flex items-center gap-2 text-sm text-white/70", children: [_jsx("span", { className: "inline-flex h-2 w-2 bg-emerald-400 rounded-full animate-pulse" }), "Synthesizing\u2026"] })) : (_jsx("button", { className: "px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/5 text-sm", onClick: replay, children: "Replay" })), ctaVariant === 'answer' ? (_jsx("a", { className: "px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 text-sm", href: "https://sentientiq.app", children: "Get Answer" })) : (_jsx("a", { className: "px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 text-sm", href: "https://sentientiq.app", children: "Start a Debate" }))] })] }), _jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-2 text-xs", children: [['ROI Analyst', 'CRO Specialist', 'Emotion Scientist', 'Data Skeptic'].map(n => (_jsx("span", { className: "px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/80", children: n }, n))), _jsx("span", { className: "text-white/50", children: "\u2192 Moderator" })] }), _jsx("div", { className: "mt-3 flex gap-2", children: Object.keys(scripts).map((type) => (_jsx("button", { onClick: () => switchScript(type), className: `px-3 py-1 text-xs rounded-lg transition-colors ${selectedScript === type
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'}`, children: type.charAt(0).toUpperCase() + type.slice(1) }, type))) }), _jsx("div", { className: "mt-4 rounded-xl bg-white/[0.03] border border-white/10 p-4", children: _jsx("pre", { className: "whitespace-pre-wrap font-mono text-[13px] leading-6 text-white/90", children: text || `## ${selectedScript.charAt(0).toUpperCase() + selectedScript.slice(1)} Strategy\n…` }) }), _jsx("div", { className: "mt-4 text-xs text-white/55", children: "Tip: This is a simulated stream. In product, your personas debate live and the Moderator writes while you watch." })] }) }));
}
