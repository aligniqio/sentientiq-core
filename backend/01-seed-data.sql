-- Seed initial data AFTER tables are created
-- Run this after 00-clean-setup.sql

-- 1. Insert permissions (if not exists)
INSERT INTO permissions (name, description, category) VALUES
('view_all_tenants', 'View all organizations and their data', 'admin'),
('manage_all_tenants', 'Create, update, delete any organization', 'admin'),
('view_all_analytics', 'Access analytics across all organizations', 'admin'),
('manage_billing', 'Handle billing for all organizations', 'admin'),
('impersonate_user', 'Login as any user for support', 'admin'),
('view_system_health', 'Monitor system performance and health', 'admin'),
('manage_white_labels', 'Configure white label partnerships', 'admin'),
('view_own_tenant', 'View own organization data', 'tenant'),
('manage_own_tenant', 'Update own organization settings', 'tenant'),
('view_child_tenants', 'View white-labeled client organizations', 'tenant'),
('manage_child_tenants', 'Manage white-labeled clients', 'tenant'),
('view_tenant_analytics', 'Access own and child analytics', 'analytics'),
('invite_users', 'Invite users to organization', 'tenant'),
('manage_integrations', 'Connect and manage integrations', 'tenant'),
('view_billing', 'View organization billing', 'billing'),
('manage_white_label_brand', 'Customize white label branding', 'tenant'),
('view_dashboard', 'Access main dashboard', 'tenant'),
('run_analysis', 'Run PhD collective analysis', 'analytics'),
('view_reports', 'View generated reports', 'analytics'),
('manage_own_profile', 'Update own user profile', 'tenant')
ON CONFLICT (name) DO NOTHING;

-- 2. Set up role permissions
-- SuperAdmin gets everything
INSERT INTO role_permissions (role, permission_id) 
SELECT 'super_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- TenantAdmin permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'tenant_admin', id FROM permissions 
WHERE name IN (
    'view_own_tenant', 'manage_own_tenant', 
    'view_child_tenants', 'manage_child_tenants',
    'view_tenant_analytics', 'invite_users',
    'manage_integrations', 'view_billing',
    'manage_white_label_brand', 'view_dashboard',
    'run_analysis', 'view_reports', 'manage_own_profile'
)
ON CONFLICT DO NOTHING;

-- Tenant permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'tenant', id FROM permissions 
WHERE name IN (
    'view_own_tenant', 'view_tenant_analytics',
    'manage_integrations', 'view_dashboard',
    'run_analysis', 'view_reports', 'manage_own_profile'
)
ON CONFLICT DO NOTHING;

-- User permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions 
WHERE name IN (
    'view_dashboard', 'run_analysis', 
    'view_reports', 'manage_own_profile'
)
ON CONFLICT DO NOTHING;

-- 3. Create SentientIQ organization
INSERT INTO organizations (
    domain, 
    company_name, 
    subscription_tier,
    referral_code
)
VALUES (
    'sentientiq.ai', 
    'SentientIQ', 
    'enterprise',
    'TRUTHWINS'
)
ON CONFLICT (domain) DO NOTHING;

-- 4. Create SuperAdmin user
INSERT INTO users (
    email, 
    organization_id, 
    role, 
    first_name, 
    last_name,
    email_verified
)
SELECT 
    'matt@sentientiq.ai',
    id,
    'super_admin',
    'Matt',
    'Kiselstein',
    true
FROM organizations 
WHERE domain = 'sentientiq.ai'
ON CONFLICT (email) DO NOTHING;

-- 5. Create demo agency for testing white-label
INSERT INTO organizations (
    domain, 
    company_name, 
    subscription_tier,
    is_white_label,
    referral_code
)
VALUES (
    'truthagency.com', 
    'Truth Performance Marketing', 
    'agency',
    true,
    'TRUTH001'
)
ON CONFLICT (domain) DO NOTHING;

-- 6. Create agency admin
INSERT INTO users (
    email, 
    organization_id, 
    role, 
    first_name, 
    last_name
)
SELECT 
    'admin@truthagency.com',
    id,
    'tenant_admin',
    'Agency',
    'Admin'
FROM organizations 
WHERE domain = 'truthagency.com'
ON CONFLICT (email) DO NOTHING;

-- 7. Create a white-label client under the agency
INSERT INTO organizations (
    domain, 
    company_name, 
    subscription_tier,
    parent_org_id
)
SELECT 
    'clientcorp.com',
    'Client Corporation',
    'professional',
    id
FROM organizations 
WHERE domain = 'truthagency.com'
ON CONFLICT (domain) DO NOTHING;

-- 8. Set up the hierarchy relationship
INSERT INTO tenant_hierarchy (
    parent_org_id,
    child_org_id,
    relationship_type,
    revenue_share_percent
)
SELECT 
    p.id,
    c.id,
    'white_label',
    0.30
FROM organizations p, organizations c
WHERE p.domain = 'truthagency.com'
AND c.domain = 'clientcorp.com'
ON CONFLICT (parent_org_id, child_org_id) DO NOTHING;

-- 9. Success message
DO $$ 
DECLARE
    v_count INTEGER;
BEGIN 
    SELECT COUNT(*) INTO v_count FROM organizations;
    RAISE NOTICE 'Data seeded successfully!';
    RAISE NOTICE '- Organizations created: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM users;
    RAISE NOTICE '- Users created: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM permissions;
    RAISE NOTICE '- Permissions configured: %', v_count;
    
    RAISE NOTICE '';
    RAISE NOTICE 'SuperAdmin account: matt@sentientiq.ai';
    RAISE NOTICE 'Demo agency: admin@truthagency.com';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to expose Math.random() fraud!';
END $$;