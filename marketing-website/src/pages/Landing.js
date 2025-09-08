import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import SEO from '@/components/SEO';
import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import TrustBar from '@/components/TrustBar';
import WhyVsIntent from '@/components/WhyVsIntent';
import HowItWorks from '@/components/HowItWorks';
import LiveDemo from '@/components/LiveDemo';
import ThirtyDayPath from '@/components/ThirtyDayPath';
import CollectiveShowcase from '@/components/CollectiveShowcase';
import EVISection from '@/components/EVISection';
import Pricing from '@/components/Pricing';
import Security from '@/components/Security';
import FAQ from '@/components/FAQ';
import FinalCTA from '@/components/FinalCTA';
import Footer from '@/components/Footer';
export default function Landing() {
    const siteUrl = import.meta?.env?.VITE_SITE_URL ||
        (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');
    return (_jsxs(_Fragment, { children: [_jsx(SEO, { siteUrl: siteUrl, path: "/", title: "SentientIQ \u2014 3x Your Conversion in 30 Days", description: "AI-powered debates that find hidden conversion blockers and prescribe exact fixes. Used by Stripe, Notion, Linear." }), _jsxs("main", { className: "bg-black text-white", children: [_jsx(NavBar, {}), _jsx(Hero, {}), _jsx(TrustBar, {}), _jsx(WhyVsIntent, {}), _jsx(HowItWorks, {}), _jsx(LiveDemo, {}), _jsx(ThirtyDayPath, {}), _jsx(CollectiveShowcase, {}), _jsx(EVISection, {}), _jsx(Pricing, {}), _jsx(Security, {}), _jsx(FAQ, {}), _jsx(FinalCTA, {}), _jsx(Footer, {})] })] }));
}
