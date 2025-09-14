-- SentientIQ Tenant/Organization Schema
-- Integrates with Clerk (auth) and Stripe (billing)

-- Organizations table (maps to Clerk organizations)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_org_id TEXT UNIQUE NOT NULL, -- Clerk organization ID
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Subscription info from Stripe
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_tier TEXT DEFAULT 'free', -- free, starter, professional, enterprise
    subscription_status TEXT DEFAULT 'active', -- active, canceled, past_due, trialing
    trial_ends_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,

    -- Usage limits based on tier
    monthly_event_limit INTEGER DEFAULT 10000,
    monthly_events_used INTEGER DEFAULT 0,
    api_keys_limit INTEGER DEFAULT 1,
    team_members_limit INTEGER DEFAULT 1,

    -- Features flags
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

    -- Metadata
    settings JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Organization members (maps to Clerk users)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- owner, admin, member, viewer
    email TEXT,
    name TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,

    -- User preferences
    preferences JSONB DEFAULT '{
        "show_onboarding": true,
        "sage_hints_dismissed": false,
        "email_notifications": true
    }'::jsonb,

    UNIQUE(organization_id, clerk_user_id)
);

-- API Keys for organizations
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL, -- Store hashed version for security
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    name TEXT NOT NULL,
    created_by TEXT, -- Clerk user ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    -- Permissions/scopes
    scopes TEXT[] DEFAULT ARRAY['read:events', 'write:events'],

    -- Rate limiting
    rate_limit_per_minute INTEGER DEFAULT 60,

    UNIQUE(key_hash)
);

-- Subscription tiers configuration
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id TEXT PRIMARY KEY, -- free, starter, professional, enterprise
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    stripe_price_id TEXT, -- Stripe Price ID for this tier

    -- Limits
    monthly_events INTEGER NOT NULL,
    api_keys INTEGER NOT NULL,
    team_members INTEGER NOT NULL,
    data_retention_days INTEGER NOT NULL,

    -- Features
    features JSONB NOT NULL,

    -- Pricing
    monthly_price_cents INTEGER,
    annual_price_cents INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, display_name, monthly_events, api_keys, team_members, data_retention_days, features, monthly_price_cents, annual_price_cents) VALUES
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

-- Usage tracking
CREATE TABLE IF NOT EXISTS organization_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    event_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    sage_queries INTEGER DEFAULT 0,

    -- Detailed metrics
    metrics JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, date)
);

-- Sage interaction tracking (for showing/hiding hints)
CREATE TABLE IF NOT EXISTS sage_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Clerk user ID
    interaction_type TEXT NOT NULL, -- hint_shown, hint_dismissed, query_made, feedback_given
    page_context TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_organizations_clerk_org_id ON organizations(clerk_org_id);
CREATE INDEX idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX idx_organization_members_clerk_user_id ON organization_members(clerk_user_id);
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_api_keys_org_id ON api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_organization_usage_org_date ON organization_usage(organization_id, date);
CREATE INDEX idx_sage_interactions_org_user ON sage_interactions(organization_id, user_id);

-- Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_interactions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id TEXT)
RETURNS UUID AS $$
    SELECT organization_id
    FROM organization_members
    WHERE clerk_user_id = user_id
    LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- RLS Policies
-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id
            FROM organization_members
            WHERE clerk_user_id = auth.uid()
        )
    );

-- Organization members: Users can see members of their organization
CREATE POLICY "Users can view organization members" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE clerk_user_id = auth.uid()
        )
    );

-- API Keys: Only organization admins can manage
CREATE POLICY "Admins can manage API keys" ON api_keys
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE clerk_user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Usage: Users can view their organization's usage
CREATE POLICY "Users can view organization usage" ON organization_usage
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE clerk_user_id = auth.uid()
        )
    );

-- Sage interactions: Users can manage their own interactions
CREATE POLICY "Users can manage their sage interactions" ON sage_interactions
    FOR ALL USING (
        user_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE clerk_user_id = auth.uid()
        )
    );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_usage_updated_at BEFORE UPDATE ON organization_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();