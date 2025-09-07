import React from 'react';
import { isAppHost } from '../utils/isAppHost';

export default function HardSafeClerk({ children }: { children: React.ReactNode }) {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (!isAppHost(host)) return <>{children}</>; // no auth on .ai

    const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
    if (!pk) return <>{children}</>;

    const { ClerkProvider } = require('@clerk/clerk-react');
    const rawProxy = import.meta.env.VITE_CLERK_PROXY_URL?.trim();
    const proxyUrl = rawProxy && /^https?:\/\//i.test(rawProxy) ? rawProxy : undefined;

    return <ClerkProvider publishableKey={pk} {...(proxyUrl ? { proxyUrl } : {})}>{children}</ClerkProvider>;
  } catch (e) {
    console.error('Clerk init skipped:', e);
    return <>{children}</>;
  }
}