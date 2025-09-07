// src/auth/HardSafeClerk.tsx
import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

export default function HardSafeClerk({ children }: { children: React.ReactNode }) {
  const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  
  // If no publishable key, render without Clerk
  if (!pk) {
    console.warn('Clerk publishable key not found, rendering without authentication');
    return <>{children}</>;
  }
  
  const rawProxy = import.meta.env.VITE_CLERK_PROXY_URL?.trim();
  const proxyUrl = rawProxy && /^https?:\/\//i.test(rawProxy) ? rawProxy : undefined;
  
  return (
    <ClerkProvider 
      publishableKey={pk} 
      {...(proxyUrl ? { proxyUrl } : {})}
    >
      {children}
    </ClerkProvider>
  );
}