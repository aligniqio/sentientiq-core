import React from 'react';
import SEO from './components/SEO';
import Navbar from './components/NavBar';
import Hero from './components/Hero';
import LogoCloud from '../src/LogoCloud'
import Problem from '../src/components/Problem';
import HowItWorks from '../src/components/HowItWorks';
import ValueProps from '../src/components/ValueProps';
import Pricing from '../src/components/Pricing';
import FAQ from '../src/components/FAQ';
import CTA from '../src/components/CTA';
import Footer from '../src/components/Footer';

export default function App() {
  const siteUrl = 'https://sentientiq.ai';
  return (
    <>
      <SEO
        siteUrl={siteUrl}
        path="/"
        title="SentientIQ – Replace Fake Intent With Real Emotions"
        description="Plutchik-grade emotional intelligence for marketing. See what people feel in the moment, and act on it. Free to start."
        image={`${siteUrl}/og-image.png`}
        breadcrumbs={[
          { name: 'Home', url: `${siteUrl}/` }
        ]}
        faq={[
          { question: 'How fast is onboarding?', answer: 'About three seconds. Paste your URL, we analyze, and stream recommendations.' },
          { question: 'Do you use cookies?', answer: 'No. We read performance and experience signals—privacy-first by design.' }
        ]}
        preconnectStripe
      />
      <Navbar />
      <Hero />
      <LogoCloud />
      <Problem />
      <HowItWorks />
      <ValueProps />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}
