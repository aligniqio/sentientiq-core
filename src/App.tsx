import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'

// The ONLY pages that matter
import HowItWorks from './pages/how-it-works'
import AlwaysOnFaculty from './pages/always-on-faculty'
import TrainingDashboard from './pages/training-dashboard'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public - The Truth */}
        <Route path="/" element={<HowItWorks />} />
        
        {/* Protected - The Intelligence */}
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
    </Router>
  )
}

export default App