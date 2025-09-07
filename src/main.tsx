import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import HardSafeClerk from './auth/HardSafeClerk';
import DomainRouter from './DomainRouter';
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
    <HelmetProvider>
      <HardSafeClerk>
        <DomainRouter />
      </HardSafeClerk>
    </HelmetProvider>
  </React.StrictMode>
);