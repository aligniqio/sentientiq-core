import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import HardSafeClerk from './auth/HardSafeClerk';
import DomainRouter from './DomainRouter';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { captureUtms } from "./lib/utm";

// Defensive UTM capture
try {
  captureUtms();
} catch (e) {
  console.warn('UTM capture failed:', e);
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <HardSafeClerk>
          <DomainRouter />
        </HardSafeClerk>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);