-- Multi-level Permission System for SentientIQ
-- SuperAdmin > TenantAdmin > Tenant > User

-- Update users table with role hierarchy
ALTER TABLE users 
DROP COLUMN IF EXISTS role;

ALTER TABLE users 
ADD COLUMN role VARCHAR(50) DEFAULT 'user' 
CHECK (role IN ('super_admin', 'tenant_admin', 'tenant', 'user'));

-- Permissions table for granular control
CREATE TABLE permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) -- 'admin', 'tenant', 'analytics', 'billing'
);

-- Role permissions mapping
CREATE TABLE role_permissions (
    role VARCHAR(50),
    permission_id UUID REFERENCES permissions(id),
    PRIMARY KEY (role, permission_id)
);

-- Insert base permissions
INSERT INTO permissions (name, description, category) VALUES
-- SuperAdmin permissions
('view_all_tenants', 'View all organizations and their data', 'admin'),
('manage_all_tenants', 'Create, update, delete any organization', 'admin'),
('view_all_analytics', 'Access analytics across all organizations', 'admin'),
('manage_billing', 'Handle billing for all organizations', 'admin'),
('impersonate_user', 'Login as any user for support', 'admin'),
('view_system_health', 'Monitor system performance and health', 'admin'),
('manage_white_labels', 'Configure white label partnerships', 'admin'),

-- TenantAdmin permissions  
('view_own_tenant', 'View own organization data', 'tenant'),
('manage_own_tenant', 'Update own organization settings', 'tenant'),
('view_child_tenants', 'View white-labeled client organizations', 'tenant'),
('manage_child_tenants', 'Manage white-labeled clients', 'tenant'),
('view_tenant_analytics', 'Access own and child analytics', 'analytics'),
('invite_users', 'Invite users to organization', 'tenant'),
('manage_integrations', 'Connect and manage integrations', 'tenant'),
('view_billing', 'View organization billing', 'billing'),
('manage_white_label_brand', 'Customize white label branding', 'tenant'),

-- Regular user permissions
('view_dashboard', 'Access main dashboard', 'tenant'),
('run_analysis', 'Run PhD collective analysis', 'analytics'),
('view_reports', 'View generated reports', 'analytics'),
('manage_own_profile', 'Update own user profile', 'tenant');

-- Assign permissions to roles
INSERT INTO role_permissions (role, permission_id) 
SELECT 'super_admin', id FROM permissions; -- SuperAdmin gets everything

INSERT INTO role_permissions (role, permission_id)
SELECT 'tenant_admin', id FROM permissions 
WHERE name IN (
    'view_own_tenant', 'manage_own_tenant', 
    'view_child_tenants', 'manage_child_tenants',
    'view_tenant_analytics', 'invite_users',
    'manage_integrations', 'view_billing',
    'manage_white_label_brand', 'view_dashboard',
    'run_analysis', 'view_reports', 'manage_own_profile'
);

INSERT INTO role_permissions (role, permission_id)
SELECT 'tenant', id FROM permissions 
WHERE name IN (
    'view_own_tenant', 'view_tenant_analytics',
    'manage_integrations', 'view_dashboard',
    'run_analysis', 'view_reports', 'manage_own_profile'
);

INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions 
WHERE name IN (
    'view_dashboard', 'run_analysis', 
    'view_reports', 'manage_own_profile'
);

-- Context switching table (for admins to switch between orgs)
CREATE TABLE context_switches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    from_org_id UUID REFERENCES organizations(id),
    to_org_id UUID REFERENCES organizations(id),
    switched_at TIMESTAMP DEFAULT NOW(),
    switched_back_at TIMESTAMP
);

-- Audit log for permission usage
CREATE TABLE permission_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    permission_name VARCHAR(100),
    action VARCHAR(100),
    target_resource TEXT,
    success BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Helper function to check permissions
CREATE OR REPLACE FUNCTION has_permission(
    p_user_id UUID,
    p_permission_name VARCHAR(100),
    p_target_org_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_user_org_id UUID;
    v_has_permission BOOLEAN;
BEGIN
    -- Get user's role and org
    SELECT role, organization_id INTO v_user_role, v_user_org_id
    FROM users WHERE id = p_user_id;
    
    -- SuperAdmin can do anything
    IF v_user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has the permission
    SELECT EXISTS(
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role = v_user_role AND p.name = p_permission_name
    ) INTO v_has_permission;
    
    IF NOT v_has_permission THEN
        RETURN FALSE;
    END IF;
    
    -- For TenantAdmin, check if target org is their own or a child
    IF v_user_role = 'tenant_admin' AND p_target_org_id IS NOT NULL THEN
        IF p_target_org_id = v_user_org_id THEN
            RETURN TRUE;
        END IF;
        
        -- Check if target is a white-label child
        RETURN EXISTS(
            SELECT 1 FROM organizations
            WHERE id = p_target_org_id 
            AND parent_org_id = v_user_org_id
        );
    END IF;
    
    -- For regular users, only allow access to their own org
    IF p_target_org_id IS NOT NULL AND p_target_org_id != v_user_org_id THEN
        RETURN FALSE;
    END IF;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- View for user's accessible organizations (for context switcher)
CREATE OR REPLACE VIEW user_accessible_orgs AS
SELECT DISTINCT
    u.id as user_id,
    o.id as org_id,
    o.company_name,
    o.domain,
    CASE 
        WHEN u.role = 'super_admin' THEN 'all'
        WHEN o.id = u.organization_id THEN 'own'
        WHEN o.parent_org_id = u.organization_id THEN 'child'
        ELSE 'none'
    END as access_type
FROM users u
CROSS JOIN organizations o
WHERE 
    u.role = 'super_admin' -- SuperAdmin sees all
    OR o.id = u.organization_id -- User sees own org
    OR (u.role = 'tenant_admin' AND o.parent_org_id = u.organization_id); -- TenantAdmin sees children

-- RLS policies using the permission system
CREATE POLICY "Users can view based on permissions" ON organizations
    FOR SELECT USING (
        has_permission(auth.uid(), 'view_all_tenants', id) OR
        has_permission(auth.uid(), 'view_own_tenant', id) OR
        has_permission(auth.uid(), 'view_child_tenants', id)
    );

CREATE POLICY "Users can update based on permissions" ON organizations
    FOR UPDATE USING (
        has_permission(auth.uid(), 'manage_all_tenants', id) OR
        has_permission(auth.uid(), 'manage_own_tenant', id) OR
        has_permission(auth.uid(), 'manage_child_tenants', id)
    );