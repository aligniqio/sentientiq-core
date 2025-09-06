-- Subscription tracking tables for Stripe integration

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
  vertical TEXT, -- For enterprise tier vertical-specific EVI
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  stripe_invoice_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'usd',
  status TEXT CHECK (status IN ('succeeded', 'failed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_clerk_user_id ON user_subscriptions(clerk_user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_payment_history_subscription_id ON payment_history(stripe_subscription_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);

-- Grant permissions for API access
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON payment_history TO authenticated;
GRANT SELECT ON user_subscriptions TO anon;

-- RLS policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid()::text = clerk_user_id);

-- Only system can update subscriptions (via webhook)
CREATE POLICY "System can manage subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');