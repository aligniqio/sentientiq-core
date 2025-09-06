import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'
import { captureUtms } from "./lib/utm";
captureUtms();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Only wrap with ClerkProvider if we have a key (allows landing page to work without auth)
const AppWrapper = clerkPubKey ? (
  <ClerkProvider publishableKey={clerkPubKey}>
    <App />
  </ClerkProvider>
) : (
  <App />
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {AppWrapper}
  </React.StrictMode>
)