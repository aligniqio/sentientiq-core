-- Drop the backup table that's causing foreign key issues
DROP TABLE IF EXISTS organizations_old_backup CASCADE;

-- Now create the test organization
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

-- Now we can safely update the users table
UPDATE users
SET organization_id = (SELECT id FROM organizations WHERE tenant_id = 'sidk')
WHERE clerk_user_id = 'user_2zZ59bWotlSk5kLkrLKRtMMxDAn';

-- Verify everything worked
SELECT
    o.id,
    o.tenant_id,
    o.name,
    om.clerk_user_id,
    om.role,
    u.organization_id as user_org_id
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
LEFT JOIN users u ON u.clerk_user_id = om.clerk_user_id
WHERE o.tenant_id = 'sidk';