import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './styles.css';
import Landing from './pages/Landing';
import Thanks from './pages/Thanks';
function App() {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (path.startsWith('/thanks'))
        return _jsx(Thanks, {});
    return _jsx(Landing, {});
}
createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(HelmetProvider, { children: _jsx(App, {}) }) }));
