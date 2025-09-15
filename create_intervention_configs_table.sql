-- Create intervention_configs table
CREATE TABLE IF NOT EXISTS intervention_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    branding JSONB DEFAULT '{}'::jsonb,
    offers JSONB DEFAULT '{}'::jsonb,
    channels JSONB DEFAULT '{}'::jsonb,
    interventions JSONB DEFAULT '[]'::jsonb,
    template TEXT DEFAULT 'saas',
    tier TEXT DEFAULT 'starter',
    apiKey TEXT,
    published_version BIGINT,
    published_at TIMESTAMPTZ,
    cdn_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_intervention_configs_tenant_id ON intervention_configs(tenant_id);

-- Enable Row Level Security
ALTER TABLE intervention_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Service role full access" ON intervention_configs FOR ALL USING (TRUE);

-- Insert a test config for demo_tenant
INSERT INTO intervention_configs (
    tenant_id,
    organization_id,
    branding,
    offers,
    channels,
    interventions,
    template,
    tier
) VALUES (
    'demo_tenant',
    NULL, -- No org for demo
    '{"companyName": "Demo Company", "primaryColor": "#7f5af0", "accentColor": "#22c55e"}'::jsonb,
    '{"discountPercent": 20, "discountCode": "SAVE20", "freeTrialDays": 14}'::jsonb,
    '{"supportUrl": "https://calendly.com/demo"}'::jsonb,
    '[{"id": "exit_save", "enabled": true}, {"id": "confusion_help", "enabled": true}]'::jsonb,
    'saas',
    'starter'
) ON CONFLICT (tenant_id) DO NOTHING;

-- Insert a config for sidk tenant
INSERT INTO intervention_configs (
    tenant_id,
    organization_id,
    branding,
    offers,
    channels,
    interventions,
    template,
    tier
) VALUES (
    'sidk',
    (SELECT id FROM organizations WHERE tenant_id = 'sidk'),
    '{"companyName": "SentientIQ Test Dealership", "primaryColor": "#10b981", "accentColor": "#f59e0b"}'::jsonb,
    '{"discountPercent": 15, "cashBackAmount": "500", "aprOffer": "0% for 60 months"}'::jsonb,
    '{"supportUrl": "https://calendly.com/test-drive"}'::jsonb,
    '[{"id": "exit_save", "enabled": true}, {"id": "price_hover_assist", "enabled": true}, {"id": "confusion_help", "enabled": true}]'::jsonb,
    'automotive',
    'starter'
) ON CONFLICT (tenant_id) DO NOTHING;