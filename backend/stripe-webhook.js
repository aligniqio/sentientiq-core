#!/usr/bin/env node
import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '../.env' });

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const PORT = process.env.WEBHOOK_PORT || 8005;

// Map price IDs to plan names
const PRICE_TO_PLAN = {
  'price_1S4F69Ag3cgQ4qmbRsCSI8QI': 'pro',
  'price_1S4F6AAg3cgQ4qmbKvXh6D01': 'team',
  'price_1S4F6AAg3cgQ4qmbpmJWPg6J': 'enterprise'
};

// Raw body needed for webhook signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'stripe-webhook' });
});

// Stripe webhook endpoint
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📨 Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const clerkUserId = session.metadata?.clerk_user_id;

        if (!clerkUserId) {
          console.error('No clerk_user_id in session metadata');
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        const plan = PRICE_TO_PLAN[priceId] || 'free';

        // Update user subscription in Supabase
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            clerk_user_id: clerkUserId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan,
            status: 'active',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'clerk_user_id'
          });

        if (error) {
          console.error('Error updating subscription:', error);
        } else {
          console.log(`✅ Subscription activated for user ${clerkUserId}: ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0].price.id;
        const plan = PRICE_TO_PLAN[priceId] || 'free';

        // Update subscription in Supabase
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            plan,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        } else {
          console.log(`✅ Subscription updated: ${subscription.id}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        // Mark subscription as canceled in Supabase
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            plan: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error canceling subscription:', error);
        } else {
          console.log(`❌ Subscription canceled: ${subscription.id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`💰 Payment succeeded for invoice: ${invoice.id}`);
        
        // Log successful payment
        await supabase
          .from('payment_history')
          .insert({
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: invoice.subscription,
            amount: invoice.amount_paid / 100, // Convert from cents
            currency: invoice.currency,
            status: 'succeeded',
            created_at: new Date().toISOString()
          });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`⚠️ Payment failed for invoice: ${invoice.id}`);
        
        // Update subscription status
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', invoice.subscription);

        // Log failed payment
        await supabase
          .from('payment_history')
          .insert({
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: invoice.subscription,
            amount: invoice.amount_due / 100,
            currency: invoice.currency,
            status: 'failed',
            created_at: new Date().toISOString()
          });
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).send('Webhook processing error');
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`🎯 Stripe webhook server running on port ${PORT}`);
  console.log(`📝 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`\n⚡ Configure in Stripe Dashboard:`);
  console.log(`   1. Go to https://dashboard.stripe.com/webhooks`);
  console.log(`   2. Add endpoint: https://sentientiq.app/api/stripe/webhook`);
  console.log(`   3. Select events:`);
  console.log(`      - checkout.session.completed`);
  console.log(`      - customer.subscription.updated`);
  console.log(`      - customer.subscription.deleted`);
  console.log(`      - invoice.payment_succeeded`);
  console.log(`      - invoice.payment_failed`);
  console.log(`   4. Copy the signing secret to STRIPE_WEBHOOK_SECRET in .env`);
});