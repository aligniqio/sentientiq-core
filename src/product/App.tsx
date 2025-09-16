import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { HelmetProvider } from 'react-helmet-async'

// The ONLY pages that matter
import Layout from '../components/Layout'
import Auth from '../pages/auth'
// import AlwaysOnFaculty from '../pages/always-on-faculty' // REMOVED
// import Ask from '../pages/ask' // REMOVED - replaced by Boardroom
import Settings from '../pages/settings'
import Pricing from '../pages/pricing'
import Billing from '../pages/billing'
import UsageDashboard from '../pages/usage-dashboard'
import SageInbox from '../pages/sage-inbox'
import EmotionalLiveFeed from '../components/EmotionalLiveFeed'

// Admin pages
import TenantsPage from './admin/TenantsPage'
import InvitesPage from './admin/InvitesPage'
import SuperAdmin from '../pages/super-admin'
import DebugSuperAdmin from '../pages/debug-super-admin'
import SystemImplementation from '../pages/system/implementation'
import SystemConfiguration from '../pages/system/configuration'

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
            {/* Sage watches from the corner, always */}
            <SageCrystalBall />
          <Routes>
          {/* Root - App only (domain routing handles marketing site) */}
          <Route path="/" element={
            <>
              <SignedIn>
                <Layout>
                  <EmotionalLiveFeed /> {/* Main dashboard - real emotions from real users */}
                </Layout>
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />
          
          {/* /ask route removed - not needed */}
          
          {/* Sage - The Inbox Protector */}
          <Route
            path="/sage"
            element={
              <>
                <SignedIn>
                  <Layout>
                    <SageInbox />
                  </Layout>
                </SignedIn>
                <SignedOut>
                  <Navigate to="/auth" replace />
                </SignedOut>
              </>
            }
          />
          
          {/* PhD Collective */}
          <Route
            path="/collective"
            element={
              <>
                <SignedIn>
                  <Layout>
                    <EmotionalLiveFeed />
                  </Layout>
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
                  <Layout>
                    <Settings />
                  </Layout>
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
                  <Layout>
                    <Billing />
                  </Layout>
                </SignedIn>
                <SignedOut>
                  <Navigate to="/auth" replace />
                </SignedOut>
              </>
            }
          />

          {/* Usage Dashboard */}
          <Route
            path="/usage-dashboard"
            element={
              <>
                <SignedIn>
                  <Layout>
                    <UsageDashboard />
                  </Layout>
                </SignedIn>
                <SignedOut>
                  <Navigate to="/auth" replace />
                </SignedOut>
              </>
            }
          />

          {/* Auth page - explicit route */}
          <Route path="/auth" element={<Auth />} />

          {/* Removed legacy routes - /start and /boardroom */}


          {/* Emotional Live Feed - Real-time Emotional Intelligence from ANY website */}
          <Route path="/emotional-dashboard" element={
            <>
              <SignedIn>
                <Layout>
                  <EmotionalLiveFeed />
                </Layout>
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
                <Layout>
                  <TenantsPage />
                </Layout>
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />
          
          <Route path="/admin/invites" element={
            <>
              <SignedIn>
                <Layout>
                  <InvitesPage />
                </Layout>
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
                <Layout>
                  <SuperAdmin />
                </Layout>
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />
          
          {/* Debug route for super admin issues */}
          <Route path="/debug-super-admin" element={
            <>
              <SignedIn>
                <Layout>
                  <DebugSuperAdmin />
                </Layout>
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />
          
          {/* System Implementation Guide */}
          <Route path="/system/implementation" element={
            <>
              <SignedIn>
                <Layout>
                  <SystemImplementation />
                </Layout>
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />

          {/* System Configuration - Interventions */}
          <Route path="/system/configuration" element={
            <>
              <SignedIn>
                <Layout>
                  <SystemConfiguration />
                </Layout>
              </SignedIn>
              <SignedOut>
                <Navigate to="/auth" replace />
              </SignedOut>
            </>
          } />

        </Routes>
    </Router>
    </SenseiCandyProvider>
    </HelmetProvider>
  )
}

export default App