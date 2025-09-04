// Stripe Checkout integration
import { loadStripe } from '@stripe/stripe-js';
import { useUser } from '@clerk/clerk-react';

// Only load Stripe if we have a valid key
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey && stripeKey !== 'pk_test_51O3dummyKeyForTestingOnly' 
  ? loadStripe(stripeKey)
  : null;

export interface CheckoutOptions {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe Checkout session and redirect
 */
export async function createCheckoutSession(options: CheckoutOptions, clerkUserId?: string, clerkOrgId?: string) {
  if (!stripePromise) {
    console.warn('Stripe not configured - using demo mode');
    alert('Stripe checkout is not configured. Please add your Stripe keys to continue.');
    return;
  }
  
  const stripe = await stripePromise;
  
  if (!stripe) {
    throw new Error('Stripe not loaded');
  }

  // Build success/cancel URLs
  const successUrl = options.successUrl || `${window.location.origin}/billing?success=true`;
  const cancelUrl = options.cancelUrl || `${window.location.origin}/pricing`;

  // Call backend to create the session
  const response = await fetch('/api/checkout/create-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId: options.priceId,
      successUrl,
      cancelUrl,
      metadata: {
        ...options.metadata,
        ...(clerkUserId ? { clerk_user_id: clerkUserId } : {}),
        ...(clerkOrgId ? { clerk_org_id: clerkOrgId } : {}),
      },
      // Pass Clerk ID as client_reference_id for fallback
      clientReferenceId: clerkUserId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }

  const session = await response.json();

  // Redirect to Stripe Checkout
  const result = await stripe.redirectToCheckout({
    sessionId: session.id,
  });

  if (result.error) {
    throw result.error;
  }
}

/**
 * Hook to handle checkout with Clerk user context
 */
export function useCheckout() {
  const { user } = useUser();

  const checkout = async (priceId: string) => {
    if (!user) {
      // Redirect to sign-in if not authenticated
      window.location.href = '/auth?redirect=/pricing';
      return;
    }

    try {
      await createCheckoutSession(
        { priceId },
        user.id,
        undefined // Organizations will be handled later
      );
    } catch (error) {
      console.error('Checkout failed:', error);
      throw error;
    }
  };

  return { checkout };
}