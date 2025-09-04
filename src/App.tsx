import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'

// The ONLY pages that matter
import Layout from './components/Layout'
import Landing from './pages/landing'
import HowItWorks from './pages/how-it-works'
import AlwaysOnFaculty from './pages/always-on-faculty'
import TrainingDashboard from './pages/training-dashboard'
import EviDashboard from './pages/evi-dashboard'
import InsuranceCalculator from './pages/insurance-calculator'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Public - The Truth */}
          <Route path="/" element={<Landing />} />
          <Route path="/how" element={<HowItWorks />} />
          
          {/* Protected - The Intelligence */}
          <Route
            path="/evi"
            element={
              <>
                <SignedIn>
                  <EviDashboard />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/insurance"
            element={
              <>
                <SignedIn>
                  <InsuranceCalculator />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/faculty"
            element={
              <>
                <SignedIn>
                  <AlwaysOnFaculty />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/training"
            element={
              <>
                <SignedIn>
                  <TrainingDashboard />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App