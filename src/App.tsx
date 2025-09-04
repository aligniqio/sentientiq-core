import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'

// The ONLY pages that matter
import Layout from './components/Layout'
import Auth from './pages/auth'
import HowItWorks from './pages/how-it-works'
import AlwaysOnFaculty from './pages/always-on-faculty'
import Ask from './pages/ask'
import Settings from './pages/settings'
import Pricing from './pages/pricing'
import Billing from './pages/billing'
import Landing from './pages/landing'
import Brutal from './pages/brutal'

// Candy Kit UI enhancements
import { SenseiCandyProvider } from './components/ui/SenseiCandy'

function App() {
  return (
    <SenseiCandyProvider confetti cursor toasts>
      <Router>
        <Layout>
        <Routes>
          {/* Root - THE ONE TRUE ROUTE - Ask the PhDs! */}
          <Route path="/" element={
            <>
              <SignedIn>
                <Ask />
              </SignedIn>
              <SignedOut>
                <Auth />
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
          
          {/* Dr. Brutal - The LinkedIn Spam Destroyer */}
          <Route
            path="/brutal"
            element={
              <>
                <SignedIn>
                  <Brutal />
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
          
        </Routes>
      </Layout>
    </Router>
    </SenseiCandyProvider>
  )
}

export default App