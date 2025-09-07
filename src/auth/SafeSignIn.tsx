// src/auth/SafeSignIn.tsx
import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { isAppHost } from '../utils/isAppHost';

export function SafeSignIn({ children = 'Sign in' }: { children?: React.ReactNode }) {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isApp = isAppHost(host);
  
  if (!isApp) {
    return (
      <a className="btn-ghost" href="https://sentientiq.app/auth">
        {children}
      </a>
    );
  }
  
  return <SignInButton mode="modal">{children}</SignInButton>;
}

export function SafeSignUp({ children = 'Start free' }: { children?: React.ReactNode }) {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isApp = isAppHost(host);
  
  if (!isApp) {
    return (
      <a className="btn-primary" href="https://sentientiq.app/auth">
        {children}
      </a>
    );
  }
  
  return <SignUpButton mode="modal">{children}</SignUpButton>;
}