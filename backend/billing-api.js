import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Webhook } from 'svix';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PORT = process.env.BILLING_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.raw({ type: 'application/json' }));

// =====================================
// CLERK WEBHOOK - User Created
// =====================================
app.post('/webhook/clerk', async (req, res) => {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    
    // Verify webhook signature
    const svix = new Webhook(webhookSecret);
    const payload = req.body;
    const headers = req.headers;
    
    let evt;
    try {
      evt = svix.verify(payload, headers);
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const { type, data } = evt;
    
    if (type === 'user.created') {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: data.email_addresses[0].email_address,
        metadata: {
          clerk_user_id: data.id,
          created_at: new Date().toISOString()
        }
      });
      
      // Store in Supabase
      await supabase
        .from('users')
        .upsert({
          clerk_user_id: data.id,
          stripe_customer_id: customer.id,
          email: data.email_addresses[0].email_address,
          tier: 'free',
          questions_this_month: 0,
          created_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 day trial
        });
      
      // Update Clerk user metadata
      await fetch(`https://api.clerk.com/v1/users/${data.id}/metadata`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          public_metadata: {
            stripe_customer_id: customer.id,
            tier: 'free',
            trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });
      
      console.log(`✅ Created Stripe customer ${customer.id} for Clerk user ${data.id}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// STRIPE WEBHOOK - Subscription Events
// =====================================
app.post('/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Get the subscription
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Determine tier from price
        let tier = 'free';
        if (subscription.items.data[0].price.id === process.env.STRIPE_PRICE_STARTER) {
          tier = 'starter';
        } else if (subscription.items.data[0].price.id === process.env.STRIPE_PRICE_GROWTH) {
          tier = 'professional';
        } else if (subscription.items.data[0].price.id === process.env.STRIPE_PRICE_ENTERPRISE) {
          tier = 'enterprise';
        }
        
        // Update user in Supabase
        await supabase
          .from('users')
          .update({
            tier,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_customer_id', session.customer);
        
        // Get Clerk user ID
        const { data: userData } = await supabase
          .from('users')
          .select('clerk_user_id')
          .eq('stripe_customer_id', session.customer)
          .single();
        
        if (userData) {
          // Update Clerk metadata
          await fetch(`https://api.clerk.com/v1/users/${userData.clerk_user_id}/metadata`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              public_metadata: {
                tier,
                subscription_status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
              }
            })
          });
        }
        
        console.log(`✅ Subscription created for customer ${session.customer}`);
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const updatedSub = event.data.object;
        
        // Update Supabase
        await supabase
          .from('users')
          .update({
            subscription_status: updatedSub.status,
            current_period_end: new Date(updatedSub.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', updatedSub.id);
        
        console.log(`✅ Subscription ${updatedSub.id} updated to status: ${updatedSub.status}`);
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// USAGE TRACKING
// =====================================
app.post('/api/usage/track', express.json(), async (req, res) => {
  try {
    const { userId, action } = req.body;
    
    // Get current usage
    const { data: user } = await supabase
      .from('users')
      .select('questions_this_month, tier, current_period_end')
      .eq('clerk_user_id', userId)
      .single();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if we need to reset monthly counter
    const now = new Date();
    const periodEnd = new Date(user.current_period_end);
    if (now > periodEnd) {
      // Reset counter for new billing period
      await supabase
        .from('users')
        .update({ 
          questions_this_month: 0,
          current_period_end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
        })
        .eq('clerk_user_id', userId);
      user.questions_this_month = 0;
    }
    
    // Check limits
    const limits = {
      free: 20,
      starter: 100,
      professional: -1, // unlimited
      enterprise: -1 // unlimited
    };
    
    const limit = limits[user.tier] || 20;
    
    if (limit !== -1 && user.questions_this_month >= limit) {
      return res.status(429).json({ 
        error: 'Usage limit exceeded',
        limit,
        used: user.questions_this_month
      });
    }
    
    // Track the usage
    if (action === 'question') {
      await supabase
        .from('users')
        .update({ questions_this_month: user.questions_this_month + 1 })
        .eq('clerk_user_id', userId);
      
      // Log to usage_logs table for analytics
      await supabase
        .from('usage_logs')
        .insert({
          user_id: userId,
          action: 'phd_question',
          timestamp: new Date().toISOString(),
          metadata: { tier: user.tier }
        });
    }
    
    res.json({ 
      success: true,
      used: user.questions_this_month + 1,
      limit,
      remaining: limit === -1 ? 'unlimited' : limit - (user.questions_this_month + 1)
    });
    
  } catch (error) {
    console.error('Usage tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// GET USER USAGE
// =====================================
app.get('/api/usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: user } = await supabase
      .from('users')
      .select('questions_this_month, tier, current_period_end')
      .eq('clerk_user_id', userId)
      .single();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const limits = {
      free: 20,
      starter: 100,
      professional: -1,
      enterprise: -1
    };
    
    const limit = limits[user.tier] || 20;
    
    res.json({
      questionsUsed: user.questions_this_month,
      questionsLimit: limit,
      tier: user.tier,
      periodEnd: user.current_period_end,
      canAsk: limit === -1 || user.questions_this_month < limit
    });
    
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// CREATE STRIPE CHECKOUT SESSION
// =====================================
app.post('/api/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { priceId, userId, email } = req.body;
    
    // Get or create Stripe customer
    let customerId;
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('clerk_user_id', userId)
      .single();
    
    if (user?.stripe_customer_id) {
      customerId = user.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { clerk_user_id: userId }
      });
      customerId = customer.id;
      
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('clerk_user_id', userId);
    }
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/billing?success=true`,
      cancel_url: `${process.env.APP_URL}/billing?canceled=true`,
      metadata: {
        clerk_user_id: userId
      }
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   SENTIENTIQ BILLING API                  ║
║   Port: ${PORT}                               ║
║   Ready to track truth and collect money  ║
╚════════════════════════════════════════════╝
  `);
});