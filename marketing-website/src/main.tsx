import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './styles.css';
import Landing from './pages/Landing';
import Thanks from './pages/Thanks';
import WhyDifferent from './pages/WhyDifferent';
import Auth from './pages/Auth';

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path.startsWith('/auth')) return <Auth />;
  if (path.startsWith('/thanks')) return <Thanks />;
  if (path.startsWith('/why-different')) return <WhyDifferent />;
  return <Landing />;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
