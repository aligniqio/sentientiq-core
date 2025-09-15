-- Insert configs with API keys
-- Insert a test config for demo_tenant
INSERT INTO intervention_configs (
    tenant_id,
    api_key,
    branding,
    offers,
    channels,
    interventions,
    template,
    tier
) VALUES (
    'demo_tenant',
    'sq_demo_test',
    '{"companyName": "Demo Company", "primaryColor": "#7f5af0", "accentColor": "#22c55e"}'::jsonb,
    '{"discountPercent": 20, "discountCode": "SAVE20", "freeTrialDays": 14}'::jsonb,
    '{"supportUrl": "https://calendly.com/demo"}'::jsonb,
    '[{"id": "exit_save", "enabled": true}, {"id": "confusion_help", "enabled": true}]'::jsonb,
    'saas',
    'starter'
) ON CONFLICT (tenant_id) DO UPDATE SET
    api_key = EXCLUDED.api_key,
    branding = EXCLUDED.branding,
    offers = EXCLUDED.offers,
    channels = EXCLUDED.channels,
    interventions = EXCLUDED.interventions,
    template = EXCLUDED.template,
    updated_at = NOW();

-- Insert a config for sidk tenant
INSERT INTO intervention_configs (
    tenant_id,
    api_key,
    branding,
    offers,
    channels,
    interventions,
    template,
    tier
) VALUES (
    'sidk',
    'sq_live_sidk_test',
    '{"companyName": "SentientIQ Test Dealership", "primaryColor": "#10b981", "accentColor": "#f59e0b"}'::jsonb,
    '{"discountPercent": 15, "cashBackAmount": "500", "aprOffer": "0% for 60 months"}'::jsonb,
    '{"supportUrl": "https://calendly.com/test-drive"}'::jsonb,
    '[{"id": "exit_save", "enabled": true}, {"id": "price_hover_assist", "enabled": true}, {"id": "confusion_help", "enabled": true}]'::jsonb,
    'automotive',
    'starter'
) ON CONFLICT (tenant_id) DO UPDATE SET
    api_key = EXCLUDED.api_key,
    branding = EXCLUDED.branding,
    offers = EXCLUDED.offers,
    channels = EXCLUDED.channels,
    interventions = EXCLUDED.interventions,
    template = EXCLUDED.template,
    updated_at = NOW();

-- Verify they were created
SELECT tenant_id, api_key, template, tier FROM intervention_configs;