import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './styles.css';
import Landing from './pages/Landing';
import Thanks from './pages/Thanks';
import WhyDifferent from './pages/WhyDifferent';
import Auth from './pages/Auth';
import HowItWorks from './pages/HowItWorks';
import WhatsBehindThis from './pages/WhatsBehindThis';
import Implementation from './pages/Implementation';

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path.startsWith('/auth')) return <Auth />;
  if (path.startsWith('/thanks')) return <Thanks />;
  if (path.startsWith('/why-different')) return <WhyDifferent />;
  if (path.startsWith('/how-it-works')) return <HowItWorks />;
  if (path.startsWith('/whats-behind-this')) return <WhatsBehindThis />;
  if (path.startsWith('/system/implementation')) return <Implementation />;
  return <Landing />;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
