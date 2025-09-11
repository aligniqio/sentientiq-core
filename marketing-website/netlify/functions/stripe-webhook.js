const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Clerk SDK for user management
const clerk = require('@clerk/clerk-sdk-node');

// Initialize Clerk with secret key
const clerkClient = clerk.createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  // Verify webhook signature for security
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let stripeEvent;
  
  try {
    // Construct and verify the webhook event
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  // Handle different event types
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(stripeEvent.data.object);
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(stripeEvent.data.object);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(stripeEvent.data.object);
      break;
      
    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};

async function handleCheckoutCompleted(session) {
  console.log('Processing checkout completion for session:', session.id);
  
  try {
    // Get full session details with line items
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items', 'customer']
    });
    
    const customerEmail = fullSession.customer_email || fullSession.customer?.email;
    const customerId = fullSession.customer;
    const subscriptionId = fullSession.subscription;
    
    if (!customerEmail) {
      console.error('No customer email found in session');
      return;
    }
    
    // Get the price ID and map to plan name
    const priceId = fullSession.line_items?.data[0]?.price?.id;
    const planName = getPlanFromPriceId(priceId);
    
    // Check if user already exists in Clerk
    let clerkUser;
    try {
      const users = await clerkClient.users.getUserList({
        emailAddress: [customerEmail]
      });
      
      if (users.data && users.data.length > 0) {
        clerkUser = users.data[0];
        console.log('Found existing Clerk user:', clerkUser.id);
      }
    } catch (error) {
      console.log('User not found, will create new one');
    }
    
    if (clerkUser) {
      // Update existing user with Stripe metadata
      await clerkClient.users.updateUser(clerkUser.id, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          plan: planName,
          planStatus: 'active',
          subscribedAt: new Date().toISOString()
        }
      });
      
      console.log('Updated existing user with Stripe data');
    } else {
      // Create new Clerk user
      clerkUser = await clerkClient.users.createUser({
        emailAddress: [customerEmail],
        publicMetadata: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          plan: planName,
          planStatus: 'active',
          subscribedAt: new Date().toISOString(),
          signupSource: 'stripe_checkout'
        }
      });
      
      console.log('Created new Clerk user:', clerkUser.id);
      
      // Send welcome email via Clerk (if configured)
      // This creates a magic link for first-time login
      try {
        await clerkClient.users.createSignInToken({
          userId: clerkUser.id,
          expiresInSeconds: 86400 // 24 hours
        });
      } catch (error) {
        console.error('Could not create sign-in token:', error);
      }
    }
    
    // Optional: Send custom welcome email via your preferred service
    await sendWelcomeEmail(customerEmail, planName);
    
  } catch (error) {
    console.error('Error processing checkout:', error);
    throw error;
  }
}

async function handleSubscriptionChange(subscription) {
  console.log('Processing subscription change:', subscription.id);
  
  try {
    // Get customer details
    const customer = await stripe.customers.retrieve(subscription.customer);
    const priceId = subscription.items.data[0]?.price?.id;
    const planName = getPlanFromPriceId(priceId);
    
    // Find Clerk user by email
    const users = await clerkClient.users.getUserList({
      emailAddress: [customer.email]
    });
    
    if (users.data && users.data.length > 0) {
      const clerkUser = users.data[0];
      
      // Update subscription metadata
      await clerkClient.users.updateUser(clerkUser.id, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          plan: planName,
          planStatus: subscription.status,
          updatedAt: new Date().toISOString()
        }
      });
      
      console.log('Updated user subscription data');
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionCanceled(subscription) {
  console.log('Processing subscription cancellation:', subscription.id);
  
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    // Find and update Clerk user
    const users = await clerkClient.users.getUserList({
      emailAddress: [customer.email]
    });
    
    if (users.data && users.data.length > 0) {
      const clerkUser = users.data[0];
      
      await clerkClient.users.updateUser(clerkUser.id, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          planStatus: 'canceled',
          canceledAt: new Date().toISOString()
        }
      });
      
      console.log('Marked user subscription as canceled');
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
  }
}

function getPlanFromPriceId(priceId) {
  // Map your Stripe price IDs to plan names
  const planMap = {
    'price_1S3mEsAg3cgQ4qmbGlFjmZLV': 'starter',
    'price_1S3meoAg3cgQ4qmbOEzQKWFM': 'growth',
    'price_1S3mgGAg3cgQ4qmb3eoD2rZN': 'scale'
  };
  
  return planMap[priceId] || 'unknown';
}

async function sendWelcomeEmail(email, plan) {
  // Implement your email service here (SendGrid, Postmark, etc.)
  // For now, just log it
  console.log(`Welcome email would be sent to ${email} for ${plan} plan`);
  
  // Example with SendGrid (uncomment if you have SendGrid):
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: email,
    from: 'hello@sentientiq.ai',
    subject: 'Welcome to SentientIQ - Your Emotional Intelligence is Activated!',
    html: `
      <h1>Welcome to SentientIQ!</h1>
      <p>Your ${plan} plan is now active.</p>
      <p>Get started by adding one line of code to your app:</p>
      <code>SentientIQ.init('your_api_key')</code>
      <p>Need help? Reply to this email or check our docs at docs.sentientiq.ai</p>
    `
  };
  
  await sgMail.send(msg);
  */
}