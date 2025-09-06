-- Complete Database Setup for SentientIQ
-- Run this to create all tables in the correct order

-- 1. Create base organizations table first
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    industry VARCHAR(100),
    subscription_tier VARCHAR(50) DEFAULT 'trial',
    created_at TIMESTAMP DEFAULT NOW(),
    trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
    stripe_customer_id VARCHAR(255),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    -- White label columns
    parent_org_id UUID REFERENCES organizations(id),
    is_white_label BOOLEAN DEFAULT FALSE,
    white_label_config JSONB DEFAULT '{}',
    revenue_share_percent DECIMAL(3,2) DEFAULT 0.30,
    referral_code VARCHAR(50) UNIQUE
);

-- 2. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50) DEFAULT 'user' 
        CHECK (role IN ('super_admin', 'tenant_admin', 'tenant', 'user')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE
);

-- 3. Permissions system
CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role VARCHAR(50),
    permission_id UUID REFERENCES permissions(id),
    PRIMARY KEY (role, permission_id)
);

-- 4. Onboarding analyses
CREATE TABLE IF NOT EXISTS onboarding_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    pagespeed_data JSONB,
    emotional_analysis JSONB,
    phd_insights JSONB,
    problems_detected INTEGER DEFAULT 0,
    opportunities_found INTEGER DEFAULT 0,
    fraud_indicators JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Integrations tracking
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    platform VARCHAR(50) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    metadata JSONB,
    last_sync TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending',
    math_random_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Emotional analyses
CREATE TABLE IF NOT EXISTS emotional_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    source_platform VARCHAR(50),
    analysis_type VARCHAR(100),
    emotional_scores JSONB,
    friction_points JSONB,
    opportunities JSONB,
    phd_consensus JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Fraud detections
CREATE TABLE IF NOT EXISTS fraud_detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    platform VARCHAR(50),
    detection_type VARCHAR(100),
    evidence JSONB,
    confidence_score DECIMAL(3,2),
    math_random_probability DECIMAL(3,2),
    comparison_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. White label specific tables
CREATE TABLE IF NOT EXISTS white_label_brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    brand_name VARCHAR(255),
    logo_url TEXT,
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    custom_domain VARCHAR(255),
    email_from_name VARCHAR(255),
    support_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_hierarchy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_org_id UUID REFERENCES organizations(id),
    child_org_id UUID REFERENCES organizations(id),
    relationship_type VARCHAR(50),
    revenue_share_percent DECIMAL(3,2),
    monthly_revenue_generated DECIMAL(10,2) DEFAULT 0,
    total_revenue_generated DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_org_id, child_org_id)
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_org_id UUID REFERENCES organizations(id),
    referred_email VARCHAR(255),
    referred_org_id UUID REFERENCES organizations(id),
    referral_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    reward_amount DECIMAL(10,2),
    reward_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revenue_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_org_id UUID REFERENCES organizations(id),
    child_org_id UUID REFERENCES organizations(id),
    transaction_amount DECIMAL(10,2),
    share_amount DECIMAL(10,2),
    share_percent DECIMAL(3,2),
    period_start DATE,
    period_end DATE,
    paid BOOLEAN DEFAULT FALSE,
    stripe_transfer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Context switching and audit
CREATE TABLE IF NOT EXISTS context_switches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    from_org_id UUID REFERENCES organizations(id),
    to_org_id UUID REFERENCES organizations(id),
    switched_at TIMESTAMP DEFAULT NOW(),
    switched_back_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permission_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    permission_name VARCHAR(100),
    action VARCHAR(100),
    target_resource TEXT,
    success BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_org_platform ON fraud_detections(organization_id, platform);
CREATE INDEX IF NOT EXISTS idx_hierarchy_parent ON tenant_hierarchy(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_child ON tenant_hierarchy(child_org_id);

-- 11. Insert permissions
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

-- 12. Assign permissions to roles
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

-- Regular tenant permissions
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

-- 13. Create SuperAdmin user (you!)
INSERT INTO organizations (domain, company_name, subscription_tier)
VALUES ('sentientiq.ai', 'SentientIQ', 'enterprise')
ON CONFLICT (domain) DO NOTHING;

INSERT INTO users (email, organization_id, role, first_name, last_name)
SELECT 
    'matt@sentientiq.ai',
    id,
    'super_admin',
    'Matt',
    'Kiselstein'
FROM organizations 
WHERE domain = 'sentientiq.ai'
ON CONFLICT (email) DO NOTHING;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Database setup complete! SuperAdmin created: matt@sentientiq.ai';
END $$;