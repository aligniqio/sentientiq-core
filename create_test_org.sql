-- Create a test organization for the admin user
INSERT INTO organizations (
    clerk_org_id,
    name,
    slug,
    tenant_id,
    subscription_tier,
    subscription_status,
    features
) VALUES (
    'org_test_sentientiq',
    'SentientIQ Test Dealership',
    'sentientiq-test',
    'sidk',  -- This matches what your GTM is using!
    'starter',
    'active',
    '{
        "emotional_detection": true,
        "behavioral_analytics": true,
        "sage_assistant": true,
        "gtm_integration": true,
        "api_access": true,
        "custom_events": false,
        "white_label": false,
        "priority_support": false
    }'::jsonb
) ON CONFLICT (clerk_org_id) DO NOTHING;

-- Link the admin user to this organization
INSERT INTO organization_members (
    organization_id,
    clerk_user_id,
    email,
    name,
    role
) VALUES (
    (SELECT id FROM organizations WHERE tenant_id = 'sidk'),
    'user_2zZ59bWotlSk5kLkrLKRtMMxDAn',
    'info@sentientiq.ai',
    'SentientIQ Admin',
    'owner'
) ON CONFLICT (organization_id, clerk_user_id) DO NOTHING;

-- Also update the admin user to have an organization
UPDATE users
SET organization_id = (SELECT id FROM organizations WHERE tenant_id = 'sidk')
WHERE clerk_user_id = 'user_2zZ59bWotlSk5kLkrLKRtMMxDAn';