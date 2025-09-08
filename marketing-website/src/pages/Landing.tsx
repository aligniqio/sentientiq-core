import React from 'react';
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
  const siteUrl = (import.meta as any)?.env?.VITE_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');
  
  return (
    <>
      <SEO 
        siteUrl={siteUrl}
        path="/"
        title="SentientIQ — 3x Your Conversion in 30 Days"
        description="AI-powered debates that find hidden conversion blockers and prescribe exact fixes. Used by Stripe, Notion, Linear."
      />
      <main className="bg-black text-white">
        <NavBar />
        <Hero />
        <TrustBar />
        <WhyVsIntent />
        <HowItWorks />
        <LiveDemo />
        <ThirtyDayPath />
        <CollectiveShowcase />
        <EVISection />
        <Pricing />
        <Security />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
    </>
  );
}