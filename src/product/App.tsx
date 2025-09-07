import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import SageInbox from '../pages/sage-inbox'
import PhDCollective from '../pages/phd-collective'
import Onboarding from '../pages/onboarding'
import DynamicRecommendations from '../pages/dynamic-recommendations'

// Candy Kit UI enhancements
import { SenseiCandyProvider } from '../components/ui/SenseiCandy'

function App() {
  return (
    <HelmetProvider>
      <SenseiCandyProvider confetti cursor toasts>
        <Router>
          <Layout>
        <Routes>
          {/* Root - App only (domain routing handles marketing site) */}
          <Route path="/" element={
            <>
              <SignedIn>
                <PhDCollective /> {/* Changed from dead IntelligenceMonitor */}
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />
          
          {/* Everything requires auth - this is not a public domain */}
          <Route path="/how" element={
            <>
              <SignedIn>
                <HowItWorks />
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
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
                  <Navigate to="/auth" replace />
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
                  <Navigate to="/auth" replace />
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
                  <Navigate to="/auth" replace />
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
                  <Navigate to="/auth" replace />
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
                  <Navigate to="/auth" replace />
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
                  <Navigate to="/auth" replace />
                </SignedOut>
              </>
            }
          />
          
          {/* Auth page - explicit route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Instant value onboarding - NO AUTH REQUIRED */}
          <Route path="/start" element={<Onboarding />} />
          
          {/* PhD Collective - The Crystal Palace */}
          <Route path="/phd-collective" element={
            <>
              <SignedIn>
                <PhDCollective />
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />

          <Route path="/recommendations" element={
            <>
              <SignedIn>
                <DynamicRecommendations />
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
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