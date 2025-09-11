import React from 'react';
import SEO from '@/components/SEO';
import NeuralBackground from '@/components/NeuralBackground';
import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import TrustBar from '@/components/TrustBar';
import EmotionalEngine from '@/components/EmotionalEngine';
import LiveDemo from '@/components/LiveDemo';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';
// import EmotionalTracker from '@/components/EmotionalTracker'; // Removed - too distracting

// New focused components for the cohesive story
import IdentityReveal from '@/components/IdentityReveal';
import InterventionShowcase from '@/components/InterventionShowcase';
import AccountabilityProof from '@/components/AccountabilityProof';
import TransparencyManifesto from '@/components/TransparencyManifesto';

export default function Landing() {
  const siteUrl = (import.meta as any)?.env?.VITE_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');
  
  return (
    <>
      <SEO 
        siteUrl={siteUrl}
        path="/"
        title="SentientIQ — Know WHO is feeling WHAT. Save them before they leave."
        description="Your $100k customer is raging. We detect it in 300ms. You intervene in 3 seconds. Identity + Emotion + Action = Revenue saved. See exactly what ignoring emotions costs you."
      />
      <div className="relative min-h-screen bg-black">
        {/* <EmotionalTracker /> -- Removed: Too distracting on mobile */}
        <NeuralBackground />
        <main className="relative z-10 text-white">
          <NavBar />
          
          {/* Act 1: The Problem - Marketing is blind */}
          <Hero />
          <TrustBar />
          
          {/* Act 2: The Revelation - WHO is feeling WHAT */}
          <IdentityReveal />
          <div id="emotional-engine">
            <EmotionalEngine />
          </div>
          
          {/* Act 3: The Power - Interventions that work */}
          <InterventionShowcase />
          <LiveDemo />
          
          {/* Act 4: The Accountability - What inaction costs */}
          <AccountabilityProof />
          
          {/* Act 5: The Manifesto - Transparency as a feature */}
          <TransparencyManifesto />
          
          {/* The Close */}
          <Pricing />
          <Footer />
        </main>
      </div>
    </>
  );
}