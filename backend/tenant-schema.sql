-- SentientIQ Multi-Tenant Architecture
-- Each company gets isolated workspace with shared insights

-- Organizations (Tenants)
CREATE TABLE organizations (
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

-- Users belong to organizations
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50) DEFAULT 'member',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE
);

-- Instant value delivery - store initial analysis
CREATE TABLE onboarding_analyses (
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

-- Track connected integrations per org
CREATE TABLE integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    platform VARCHAR(50) NOT NULL, -- 'salesforce', 'hubspot', '6sense', etc
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    metadata JSONB,
    last_sync TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending',
    math_random_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Emotional signal analyses
CREATE TABLE emotional_analyses (
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

-- Fraud detection audit trail
CREATE TABLE fraud_detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    platform VARCHAR(50),
    detection_type VARCHAR(100),
    evidence JSONB,
    confidence_score DECIMAL(3,2),
    math_random_probability DECIMAL(3,2),
    comparison_data JSONB, -- Real data vs fake data
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription and billing
CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    stripe_subscription_id VARCHAR(255),
    plan_name VARCHAR(100),
    price_cents INTEGER,
    status VARCHAR(50),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_integrations_org ON integrations(organization_id);
CREATE INDEX idx_fraud_org_platform ON fraud_detections(organization_id, platform);
CREATE INDEX idx_emotional_org ON emotional_analyses(organization_id);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_detections ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see their org's data
CREATE POLICY "Users can view own org" ON organizations
    FOR SELECT USING (id IN (
        SELECT organization_id FROM users 
        WHERE email = current_user
    ));

CREATE POLICY "Users can view org members" ON users
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users 
        WHERE email = current_user
    ));