import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { HelmetProvider } from 'react-helmet-async'

// The ONLY pages that matter
import Layout from '../components/Layout'
import Auth from '../pages/auth'
import HowItWorks from '../pages/how-it-works'
import AlwaysOnFaculty from '../pages/always-on-faculty'
import Ask from '../pages/ask'
import Settings from '../pages/settings'
import Pricing from '../pages/pricing'
import Billing from '../pages/billing'
import Landing from '../pages/landing'
import IntelligenceMonitor from '../pages/intelligence-monitor'
import SageInbox from '../pages/sage-inbox'
import PhDCollective from '../pages/phd-collective'
import Onboarding from '../pages/onboarding'
// Lazy load SuperAdmin to prevent Supabase initialization on landing page
const SuperAdmin = React.lazy(() => import('../pages/super-admin'))
import DynamicRecommendations from '../pages/dynamic-recommendations'
import AdminRoute from '../components/AdminRoute'

// Candy Kit UI enhancements
import { SenseiCandyProvider } from '../components/ui/SenseiCandy'

function App() {
  return (
    <HelmetProvider>
      <SenseiCandyProvider confetti cursor toasts>
        <Router>
          <Layout>
        <Routes>
          {/* Root - Show Landing for .ai domain, Auth for .app domain */}
          <Route path="/" element={
            window.location.hostname.includes('sentientiq.ai') ? (
              <Landing />
            ) : (
              <>
                <SignedIn>
                  <IntelligenceMonitor />
                </SignedIn>
                <SignedOut>
                  <Auth />
                </SignedOut>
              </>
            )
          } />
          
          {/* Everything requires auth - this is not a public domain */}
          <Route path="/how" element={
            <>
              <SignedIn>
                <HowItWorks />
              </SignedIn>
              <SignedOut>
                <Auth />
              </SignedOut>
            </>
          } />
          
          <Route
            path="/faculty"
            element={
              <>
                <SignedIn>
                  <AlwaysOnFaculty />
                </SignedIn>
                <SignedOut>
                  <Auth />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/ask"
            element={
              <>
                <SignedIn>
                  <Ask />
                </SignedIn>
                <SignedOut>
                  <Auth />
                </SignedOut>
              </>
            }
          />
          
          {/* Sage - The Inbox Protector */}
          <Route
            path="/sage"
            element={
              <>
                <SignedIn>
                  <SageInbox />
                </SignedIn>
                <SignedOut>
                  <Auth />
                </SignedOut>
              </>
            }
          />
          
          {/* PhD Collective - The Expert Swarm */}
          <Route
            path="/collective"
            element={
              <>
                <SignedIn>
                  <PhDCollective />
                </SignedIn>
                <SignedOut>
                  <Auth />
                </SignedOut>
              </>
            }
          />
          
          {/* Settings page */}
          <Route
            path="/settings/*"
            element={
              <>
                <SignedIn>
                  <Settings />
                </SignedIn>
                <SignedOut>
                  <Auth />
                </SignedOut>
              </>
            }
          />
          
          {/* Pricing & Billing */}
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/billing"
            element={
              <>
                <SignedIn>
                  <Billing />
                </SignedIn>
                <SignedOut>
                  <Auth />
                </SignedOut>
              </>
            }
          />
          
          {/* Auth page - explicit route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Marketing landing page */}
          <Route path="/landing" element={<Landing />} />
          
          {/* Instant value onboarding - NO AUTH REQUIRED */}
          <Route path="/start" element={<Onboarding />} />
          
          {/* SuperAdmin Dashboard - GOD MODE - PROTECTED */}
          <Route path="/admin" element={
            <>
              <SignedIn>
                <AdminRoute>
                  <React.Suspense fallback={<div>Loading admin panel...</div>}>
                    <SuperAdmin />
                  </React.Suspense>
                </AdminRoute>
              </SignedIn>
              <SignedOut>
                <Auth />
              </SignedOut>
            </>
          } />
          
          {/* PhD Collective - The Crystal Palace */}
          <Route path="/phd-collective" element={
            <>
              <SignedIn>
                <PhDCollective />
              </SignedIn>
              <SignedOut>
                <Auth />
              </SignedOut>
            </>
          } />

          <Route path="/recommendations" element={
            <>
              <SignedIn>
                <DynamicRecommendations />
              </SignedIn>
              <SignedOut>
                <Auth />
              </SignedOut>
            </>
          } />
          
        </Routes>
      </Layout>
    </Router>
    </SenseiCandyProvider>
    </HelmetProvider>
  )
}

export default App