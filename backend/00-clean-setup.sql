-- SentientIQ Database Setup
-- This creates everything from scratch, checking for existing objects

-- Drop existing tables if you want a clean slate (CAREFUL!)
-- Uncomment these lines only if you want to start fresh:
-- DROP TABLE IF EXISTS permission_audit CASCADE;
-- DROP TABLE IF EXISTS context_switches CASCADE;
-- DROP TABLE IF EXISTS revenue_shares CASCADE;
-- DROP TABLE IF EXISTS referrals CASCADE;
-- DROP TABLE IF EXISTS tenant_hierarchy CASCADE;
-- DROP TABLE IF EXISTS white_label_brands CASCADE;
-- DROP TABLE IF EXISTS fraud_detections CASCADE;
-- DROP TABLE IF EXISTS emotional_analyses CASCADE;
-- DROP TABLE IF EXISTS integrations CASCADE;
-- DROP TABLE IF EXISTS onboarding_analyses CASCADE;
-- DROP TABLE IF EXISTS role_permissions CASCADE;
-- DROP TABLE IF EXISTS permissions CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS organizations CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (root table)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    industry VARCHAR(100),
    subscription_tier VARCHAR(50) DEFAULT 'trial',
    created_at TIMESTAMP DEFAULT NOW(),
    trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
    stripe_customer_id VARCHAR(255),
    onboarding_completed BOOLEAN DEFAULT FALSE
);

-- 2. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE
);

-- 3. Add white-label columns to organizations if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'parent_org_id') THEN
        ALTER TABLE organizations ADD COLUMN parent_org_id UUID REFERENCES organizations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'is_white_label') THEN
        ALTER TABLE organizations ADD COLUMN is_white_label BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'white_label_config') THEN
        ALTER TABLE organizations ADD COLUMN white_label_config JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'revenue_share_percent') THEN
        ALTER TABLE organizations ADD COLUMN revenue_share_percent DECIMAL(3,2) DEFAULT 0.30;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'referral_code') THEN
        ALTER TABLE organizations ADD COLUMN referral_code VARCHAR(50) UNIQUE;
    END IF;
END $$;

-- 4. Update role column with proper constraints
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'users' 
               AND constraint_type = 'CHECK') THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    END IF;
    
    -- Add new constraint
    ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('super_admin', 'tenant_admin', 'tenant', 'user'));
END $$;

-- 5. All other tables
CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role VARCHAR(50),
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_id)
);

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

CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS emotional_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    source_platform VARCHAR(50),
    analysis_type VARCHAR(100),
    emotional_scores JSONB,
    friction_points JSONB,
    opportunities JSONB,
    phd_consensus JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50),
    detection_type VARCHAR(100),
    evidence JSONB,
    confidence_score DECIMAL(3,2),
    math_random_probability DECIMAL(3,2),
    comparison_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS white_label_brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
    parent_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    child_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50),
    revenue_share_percent DECIMAL(3,2),
    monthly_revenue_generated DECIMAL(10,2) DEFAULT 0,
    total_revenue_generated DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_org_id, child_org_id)
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    referred_email VARCHAR(255),
    referred_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    referral_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    reward_amount DECIMAL(10,2),
    reward_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revenue_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    child_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    transaction_amount DECIMAL(10,2),
    share_amount DECIMAL(10,2),
    share_percent DECIMAL(3,2),
    period_start DATE,
    period_end DATE,
    paid BOOLEAN DEFAULT FALSE,
    stripe_transfer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS context_switches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    from_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    to_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    switched_at TIMESTAMP DEFAULT NOW(),
    switched_back_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permission_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    permission_name VARCHAR(100),
    action VARCHAR(100),
    target_resource TEXT,
    success BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_org_platform ON fraud_detections(organization_id, platform);
CREATE INDEX IF NOT EXISTS idx_hierarchy_parent ON tenant_hierarchy(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_child ON tenant_hierarchy(child_org_id);

-- 7. Success check
DO $$ 
BEGIN 
    RAISE NOTICE 'Setup complete! Tables created:';
    RAISE NOTICE '- organizations';
    RAISE NOTICE '- users';
    RAISE NOTICE '- permissions';
    RAISE NOTICE '- integrations';
    RAISE NOTICE '- fraud_detections';
    RAISE NOTICE '- tenant_hierarchy';
    RAISE NOTICE '... and more!';
END $$;