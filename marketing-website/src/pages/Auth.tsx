import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SEO from '@/components/SEO';
import NeuralBackground from '@/components/NeuralBackground';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your account...');
  
  const checkoutSession = searchParams.get('checkout_session');
  const isFromCheckout = searchParams.get('success') === 'true';
  
  const siteUrl = (import.meta as any)?.env?.VITE_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');

  useEffect(() => {
    if (isFromCheckout && checkoutSession) {
      // Customer just completed payment
      setMessage('Setting up your account...');
      
      // In a real implementation, you'd:
      // 1. Call your backend to verify the checkout session
      // 2. Wait for the webhook to create the Clerk user
      // 3. Then redirect to Clerk's sign-in or directly sign them in
      
      setTimeout(() => {
        setStatus('success');
        setMessage('Your account is ready! Check your email for login instructions.');
        
        // Redirect to Clerk sign-in after a moment
        setTimeout(() => {
          // Replace with your actual Clerk sign-in URL
          window.location.href = 'https://accounts.sentientiq.ai/sign-in';
        }, 3000);
      }, 2000);
    } else {
      // Direct navigation to /auth
      setMessage('Redirecting to sign in...');
      setTimeout(() => {
        window.location.href = 'https://accounts.sentientiq.ai/sign-in';
      }, 1000);
    }
  }, [checkoutSession, isFromCheckout]);

  return (
    <>
      <SEO
        siteUrl={siteUrl}
        path="/auth"
        title="Account Setup — SentientIQ"
        description="Setting up your emotional intelligence engine"
        noindex
      />
      <main className="min-h-screen bg-black text-white relative overflow-hidden">
        <NeuralBackground />
        <div className="relative z-10 max-w-2xl mx-auto px-6 pt-32 pb-16 text-center">
          <div className="card p-12">
            {status === 'loading' && (
              <>
                <div className="mb-8">
                  <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
                <h1 className="text-3xl font-bold mb-4">{message}</h1>
                <p className="text-white/60">
                  {isFromCheckout 
                    ? "We're creating your account and sending login instructions..."
                    : "Please wait while we redirect you..."
                  }
                </p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <div className="mb-8">
                  <div className="text-6xl">✅</div>
                </div>
                <h1 className="text-3xl font-bold mb-4 text-green-400">Account Created!</h1>
                <p className="text-xl text-white/80 mb-8">{message}</p>
                <div className="p-6 bg-green-900/20 rounded-lg border border-green-500/20">
                  <p className="text-green-400 font-bold mb-2">Next Steps:</p>
                  <ol className="text-left text-white/70 space-y-2">
                    <li>1. Check your email for login link</li>
                    <li>2. Click the magic link to sign in</li>
                    <li>3. Get your API key from the dashboard</li>
                    <li>4. Add SentientIQ to your app</li>
                  </ol>
                </div>
                <p className="mt-6 text-sm text-white/50">
                  Redirecting to sign in...
                </p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div className="mb-8">
                  <div className="text-6xl">⚠️</div>
                </div>
                <h1 className="text-3xl font-bold mb-4 text-red-400">Something went wrong</h1>
                <p className="text-white/60 mb-8">
                  We couldn't complete your account setup. Please contact support.
                </p>
                <a 
                  href="mailto:hello@sentientiq.ai?subject=Account%20Setup%20Issue"
                  className="inline-block px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Contact Support
                </a>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}