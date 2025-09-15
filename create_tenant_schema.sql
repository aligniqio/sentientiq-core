-- SentientIQ Complete Tenant Schema
-- Integrates with Clerk (auth) and Stripe (billing)

-- Organizations table (maps to Clerk organizations)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_org_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
    subscription_status TEXT DEFAULT 'trialing',
    subscription_ends_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    features JSONB DEFAULT '{
        "emotional_detection": true,
        "behavioral_analytics": false,
        "sage_assistant": false,
        "gtm_integration": false,
        "api_access": false,
        "custom_events": false,
        "white_label": false,
        "priority_support": false
    }'::jsonb,
    monthly_event_limit INTEGER DEFAULT 10000,
    monthly_events_used INTEGER DEFAULT 0,
    api_keys_limit INTEGER DEFAULT 1,
    team_members_limit INTEGER DEFAULT 3,
    settings JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    email TEXT NOT NULL,
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

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    key_hash TEXT NOT NULL, -- SHA256 hash of full key
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{
        "read_events": true,
        "write_events": true,
        "read_analytics": true,
        "manage_interventions": false
    }'::jsonb,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT NOT NULL, -- clerk_user_id
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(key_hash)
);

-- Subscription tiers configuration
DROP TABLE IF EXISTS subscription_tiers CASCADE;
CREATE TABLE subscription_tiers (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    monthly_price DECIMAL(10,2),
    annual_price DECIMAL(10,2),
    features JSONB NOT NULL,
    event_limit INTEGER,
    api_keys_limit INTEGER,
    team_members_limit INTEGER,
    description TEXT
);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, display_name, monthly_price, annual_price, features, event_limit, api_keys_limit, team_members_limit, description) VALUES
('free', 'Free', 0, 0, '{
    "emotional_detection": true,
    "behavioral_analytics": false,
    "sage_assistant": false,
    "gtm_integration": false,
    "api_access": false,
    "custom_events": false,
    "white_label": false,
    "priority_support": false
}'::jsonb, 10000, 1, 3, 'Perfect for testing and small projects'),
('starter', 'Starter', 99, 990, '{
    "emotional_detection": true,
    "behavioral_analytics": true,
    "sage_assistant": true,
    "gtm_integration": true,
    "api_access": true,
    "custom_events": false,
    "white_label": false,
    "priority_support": false
}'::jsonb, 100000, 3, 5, 'For growing businesses'),
('professional', 'Professional', 299, 2990, '{
    "emotional_detection": true,
    "behavioral_analytics": true,
    "sage_assistant": true,
    "gtm_integration": true,
    "api_access": true,
    "custom_events": true,
    "white_label": false,
    "priority_support": true
}'::jsonb, 1000000, 10, 20, 'For established businesses'),
('enterprise', 'Enterprise', NULL, NULL, '{
    "emotional_detection": true,
    "behavioral_analytics": true,
    "sage_assistant": true,
    "gtm_integration": true,
    "api_access": true,
    "custom_events": true,
    "white_label": true,
    "priority_support": true
}'::jsonb, NULL, NULL, NULL, 'Custom pricing and unlimited usage')
ON CONFLICT (id) DO NOTHING;

-- Sage interactions tracking
CREATE TABLE IF NOT EXISTS sage_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    interaction_type TEXT CHECK (interaction_type IN ('hint_shown', 'hint_dismissed', 'query_made', 'feedback_given')),
    page_context TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_org_id ON organizations(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_clerk_user_id ON organization_members(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_sage_interactions_org_id ON sage_interactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_org_id ON usage_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Service role full access" ON organizations FOR ALL USING (TRUE);
CREATE POLICY "Users can view their organizations" ON organizations FOR SELECT USING (TRUE);

-- RLS Policies for organization_members
CREATE POLICY "Service role full access" ON organization_members FOR ALL USING (TRUE);
CREATE POLICY "Users can view members in their org" ON organization_members FOR SELECT USING (TRUE);

-- RLS Policies for api_keys
CREATE POLICY "Service role full access" ON api_keys FOR ALL USING (TRUE);
CREATE POLICY "Users can view their org api keys" ON api_keys FOR SELECT USING (TRUE);

-- RLS Policies for sage_interactions
CREATE POLICY "Service role full access" ON sage_interactions FOR ALL USING (TRUE);

-- RLS Policies for usage_events
CREATE POLICY "Service role full access" ON usage_events FOR ALL USING (TRUE);

-- Function to update monthly usage
CREATE OR REPLACE FUNCTION update_monthly_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE organizations
    SET monthly_events_used = monthly_events_used + 1,
        updated_at = NOW()
    WHERE id = NEW.organization_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update usage on new events
CREATE TRIGGER update_usage_on_event
AFTER INSERT ON usage_events
FOR EACH ROW
EXECUTE FUNCTION update_monthly_usage();

-- Function to reset monthly usage (run via cron job on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
    UPDATE organizations
    SET monthly_events_used = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;