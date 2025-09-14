-- SentientIQ Tenant Migration Script
-- This handles both fresh installs and migrations from existing tables

-- First, let's check and potentially rename existing tables that might conflict
DO $$
BEGIN
    -- Check if organizations table exists without clerk_org_id
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'organizations'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations'
        AND column_name = 'clerk_org_id'
    ) THEN
        -- Rename old table to preserve data
        ALTER TABLE IF EXISTS organizations RENAME TO organizations_old_backup;
        RAISE NOTICE 'Renamed existing organizations table to organizations_old_backup';
    END IF;
END $$;

-- Now create the new schema
-- Organizations table (maps to Clerk organizations)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_org_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Subscription info from Stripe
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,

    -- Usage limits
    monthly_event_limit INTEGER DEFAULT 10000,
    monthly_events_used INTEGER DEFAULT 0,
    api_keys_limit INTEGER DEFAULT 1,
    team_members_limit INTEGER DEFAULT 1,

    -- Features
    features JSONB DEFAULT '{
        "emotional_detection": true,
        "behavioral_analytics": true,
        "sage_assistant": true,
        "gtm_integration": true,
        "api_access": false,
        "custom_events": false,
        "white_label": false,
        "priority_support": false
    }'::jsonb,

    settings JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Organization members
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    email TEXT,
    name TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{
        "show_onboarding": true,
        "sage_hints_dismissed": false,
        "email_notifications": true
    }'::jsonb,
    UNIQUE(organization_id, clerk_user_id)
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    scopes TEXT[] DEFAULT ARRAY['read:events', 'write:events'],
    rate_limit_per_minute INTEGER DEFAULT 60,
    UNIQUE(key_hash)
);

-- Subscription tiers
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    stripe_price_id TEXT,
    monthly_events INTEGER NOT NULL,
    api_keys INTEGER NOT NULL,
    team_members INTEGER NOT NULL,
    data_retention_days INTEGER NOT NULL,
    features JSONB NOT NULL,
    monthly_price_cents INTEGER,
    annual_price_cents INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization usage
CREATE TABLE IF NOT EXISTS organization_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    event_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    sage_queries INTEGER DEFAULT 0,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, date)
);

-- Sage interactions
CREATE TABLE IF NOT EXISTS sage_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    page_context TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subscription tiers (skip if exists)
INSERT INTO subscription_tiers (id, name, display_name, monthly_events, api_keys, team_members, data_retention_days, features, monthly_price_cents, annual_price_cents)
VALUES
    ('free', 'Free', 'Free', 10000, 1, 1, 7, '{
        "emotional_detection": true,
        "behavioral_analytics": true,
        "sage_assistant": true,
        "gtm_integration": true,
        "api_access": false,
        "custom_events": false,
        "white_label": false,
        "priority_support": false
    }'::jsonb, 0, 0),

    ('starter', 'Starter', 'Starter', 100000, 3, 3, 30, '{
        "emotional_detection": true,
        "behavioral_analytics": true,
        "sage_assistant": true,
        "gtm_integration": true,
        "api_access": true,
        "custom_events": false,
        "white_label": false,
        "priority_support": false
    }'::jsonb, 9900, 99000),

    ('professional', 'Professional', 'Professional', 1000000, 10, 10, 90, '{
        "emotional_detection": true,
        "behavioral_analytics": true,
        "sage_assistant": true,
        "gtm_integration": true,
        "api_access": true,
        "custom_events": true,
        "white_label": false,
        "priority_support": true
    }'::jsonb, 29900, 299000),

    ('enterprise', 'Enterprise', 'Enterprise', -1, -1, -1, 365, '{
        "emotional_detection": true,
        "behavioral_analytics": true,
        "sage_assistant": true,
        "gtm_integration": true,
        "api_access": true,
        "custom_events": true,
        "white_label": true,
        "priority_support": true
    }'::jsonb, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_org_id ON organizations(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_clerk_user_id ON organization_members(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_organization_usage_org_date ON organization_usage(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_sage_interactions_org_user ON sage_interactions(organization_id, user_id);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_interactions ENABLE ROW LEVEL SECURITY;

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_usage_updated_at ON organization_usage;
CREATE TRIGGER update_organization_usage_updated_at
    BEFORE UPDATE ON organization_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Tenant migration completed successfully!';
    RAISE NOTICE 'Tables created: organizations, organization_members, api_keys, subscription_tiers, organization_usage, sage_interactions';
END $$;