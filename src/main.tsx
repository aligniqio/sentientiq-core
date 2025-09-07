import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import HardSafeClerk from './auth/HardSafeClerk'
import App from './App'
import './index.css'
import { captureUtms } from "./lib/utm";

// Defensive UTM capture
try {
  captureUtms();
} catch (e) {
  console.warn('UTM capture failed:', e);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <HardSafeClerk>
        <App />
      </HardSafeClerk>
    </HelmetProvider>
  </React.StrictMode>
)