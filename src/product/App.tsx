import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { HelmetProvider } from 'react-helmet-async'

// The ONLY pages that matter
import Layout from '../components/Layout'
import Auth from '../pages/auth'
import HowItWorks from '../pages/how-it-works'
// import AlwaysOnFaculty from '../pages/always-on-faculty' // REMOVED
// import Ask from '../pages/ask' // REMOVED - replaced by Boardroom
import Settings from '../pages/settings'
import Pricing from '../pages/pricing'
import Billing from '../pages/billing'
import SageInbox from '../pages/sage-inbox'
import Boardroom from '../pages/boardroom'
import Onboarding from '../pages/onboarding'
import DynamicRecommendations from '../pages/dynamic-recommendations'
import AccountabilityScorecard from '../components/AccountabilityScorecard'
import EmotionalLiveFeed from '../components/EmotionalLiveFeed'

// Admin pages
import TenantsPage from './admin/TenantsPage'
import InvitesPage from './admin/InvitesPage'
import SuperAdmin from '../pages/super-admin'

// Candy Kit UI enhancements
import { SenseiCandyProvider } from '../components/ui/SenseiCandy'

// Sage - The Crystal Palace of Marketing Truth
import SageCrystalBall from '../components/SageCrystalBall'

// Emotional Intelligence - Now tracks OTHER sites, not this one!

function App() {
  return (
    <HelmetProvider>
      <SenseiCandyProvider confetti cursor toasts>
          <Router>
            <Layout>
            {/* Sage watches from the corner, always */}
            <SageCrystalBall />
          <Routes>
          {/* Root - App only (domain routing handles marketing site) */}
          <Route path="/" element={
            <>
              <SignedIn>
                <Boardroom /> {/* Changed from dead IntelligenceMonitor */}
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
                  <HowItWorks />
                </SignedIn>
                <SignedOut>
                  <Navigate to="/auth" replace />
                </SignedOut>
              </>
            }
          />
          {/* /ask route removed - replaced by /boardroom */}
          
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
                  <Boardroom />
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
          
          {/* Boardroom - The Crystal Palace */}
          <Route path="/boardroom" element={
            <>
              <SignedIn>
                <Boardroom />
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

          {/* SentientIQ Scorecard - The Crystal Palace of Marketing Truth */}
          <Route path="/scorecard" element={
            <>
              <SignedIn>
                <AccountabilityScorecard />
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />

          {/* Emotional Live Feed - Real-time Emotional Intelligence from ANY website */}
          <Route path="/emotional-dashboard" element={
            <>
              <SignedIn>
                <EmotionalLiveFeed />
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />
          
          {/* Admin routes */}
          <Route path="/admin/tenants" element={
            <>
              <SignedIn>
                <TenantsPage />
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />
          
          <Route path="/admin/invites" element={
            <>
              <SignedIn>
                <InvitesPage />
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />
          
          {/* Super Admin - Tenant Management */}
          <Route path="/super-admin" element={
            <>
              <SignedIn>
                <SuperAdmin />
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