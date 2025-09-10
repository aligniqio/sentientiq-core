import React from 'react';
import SEO from '@/components/SEO';
import NeuralBackground from '@/components/NeuralBackground';
import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import TrustBar from '@/components/TrustBar';
import WhyVsIntent from '@/components/WhyVsIntent';
import EmotionalEngine from '@/components/EmotionalEngine';
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
import EmotionalTracker from '@/components/EmotionalTracker';

export default function Landing() {
  const siteUrl = (import.meta as any)?.env?.VITE_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');
  
  return (
    <>
      <SEO 
        siteUrl={siteUrl}
        path="/"
        title="SentientIQ — Marketing at the Speed of Emotion™"
        description="We detect rage in 300ms. You prevent abandonment in 3 seconds. Real emotions, real predictions, real accountability. Zero mock data. The antithesis to generateBullshitInsights()."
      />
      <div className="relative min-h-screen bg-black">
        <EmotionalTracker />
        <NeuralBackground />
        <main className="relative z-10 text-white">
          <NavBar />
          <Hero />
          <TrustBar />
          <div id="emotional-engine">
            <EmotionalEngine />
          </div>
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
      </div>
    </>
  );
}