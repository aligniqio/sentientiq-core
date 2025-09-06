#!/usr/bin/env node
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
  try {
    console.log('🚀 Creating SentientIQ products in Stripe...\n');

    // Create Pro Plan
    const proPlan = await stripe.products.create({
      name: 'SentientIQ Pro',
      description: 'Professional emotional intelligence for solo marketers',
    });
    
    const proPrice = await stripe.prices.create({
      product: proPlan.id,
      unit_amount: 19900, // $199.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Pro Monthly',
    });
    
    console.log('✅ Pro Plan created:');
    console.log(`   Product ID: ${proPlan.id}`);
    console.log(`   Price ID: ${proPrice.id}`);
    console.log(`   Add to .env: VITE_STRIPE_PRO_PRICE_ID=${proPrice.id}\n`);

    // Create Team Plan
    const teamPlan = await stripe.products.create({
      name: 'SentientIQ Team',
      description: 'Team collaboration with shared emotional intelligence',
    });
    
    const teamPrice = await stripe.prices.create({
      product: teamPlan.id,
      unit_amount: 99900, // $999.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Team Monthly',
    });
    
    console.log('✅ Team Plan created:');
    console.log(`   Product ID: ${teamPlan.id}`);
    console.log(`   Price ID: ${teamPrice.id}`);
    console.log(`   Add to .env: VITE_STRIPE_TEAM_PRICE_ID=${teamPrice.id}\n`);

    // Create Enterprise Plan
    const enterprisePlan = await stripe.products.create({
      name: 'SentientIQ Enterprise',
      description: 'Full platform with vertical-specific EVI and white-label options',
    });
    
    const enterprisePrice = await stripe.prices.create({
      product: enterprisePlan.id,
      unit_amount: 499900, // $4999.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Enterprise Monthly',
    });
    
    console.log('✅ Enterprise Plan created:');
    console.log(`   Product ID: ${enterprisePlan.id}`);
    console.log(`   Price ID: ${enterprisePrice.id}`);
    console.log(`   Add to .env: VITE_STRIPE_ENTERPRISE_PRICE_ID=${enterprisePrice.id}\n`);

    console.log('🎉 All products created successfully!\n');
    console.log('📝 Next steps:');
    console.log('1. Copy the Price IDs above');
    console.log('2. Add them to your .env file');
    console.log('3. Add them to Netlify environment variables');
    console.log('4. Trigger a new build on Netlify');

  } catch (error) {
    console.error('❌ Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();