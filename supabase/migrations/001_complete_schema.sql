-- =====================================================
-- SentientIQ Complete Database Schema
-- Version: 1.0.0
-- Description: Fresh schema with Clerk integration
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- CLEAN SLATE (Preserve sage_ tables)
-- =====================================================

-- Drop all existing tables except sage_* tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all non-sage tables
    FOR r IN (SELECT tablename FROM pg_tables 
              WHERE schemaname = 'public' 
              AND tablename NOT LIKE 'sage_%'
              AND tablename != 'schema_migrations') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Organizations (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    admin_email VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'starter',
    is_white_label BOOLEAN DEFAULT FALSE,
    parent_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    revenue_share_percent DECIMAL(3,2) DEFAULT 0.30,
    referral_code VARCHAR(50) UNIQUE,
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Synced with Clerk)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'owner', 'user')),
    metadata JSONB DEFAULT '{}',
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memberships (Many-to-Many: Users <-> Organizations)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_email VARCHAR(255), -- For invitations before user exists
    user_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    clerk_invitation_id VARCHAR(255),
    invitation_status VARCHAR(50) DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'expired')),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_org UNIQUE(user_id, organization_id),
    CONSTRAINT unique_email_org UNIQUE(user_email, organization_id)
);

-- =====================================================
-- EMOTION DETECTION TABLES
-- =====================================================

-- Emotional Events (Core detection data)
CREATE TABLE emotional_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    user_identifier VARCHAR(255), -- Could be email, user_id, or anonymous
    emotion VARCHAR(50) NOT NULL CHECK (emotion IN ('rage', 'hesitation', 'confusion', 'abandonment', 'sticker_shock')),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
    page_url TEXT,
    element_selector TEXT,
    element_text TEXT,
    trigger_details JSONB,
    intervention_triggered BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Identity Resolution (Link sessions to known users)
CREATE TABLE identity_resolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    company VARCHAR(255),
    ltv DECIMAL(10,2),
    tier VARCHAR(50),
    resolved_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, session_id)
);

-- Interventions (Actions taken based on emotions)
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    emotional_event_id UUID REFERENCES emotional_events(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('chat', 'discount', 'support', 'escalation', 'email', 'slack')),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'completed', 'failed', 'ignored')),
    payload JSONB,
    result JSONB,
    triggered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ACCOUNTABILITY & ANALYTICS
-- =====================================================

-- Accountability Scorecards
CREATE TABLE accountability_scorecards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_recommendations INTEGER DEFAULT 0,
    acted_upon INTEGER DEFAULT 0,
    ignored INTEGER DEFAULT 0,
    revenue_saved DECIMAL(10,2) DEFAULT 0,
    revenue_lost DECIMAL(10,2) DEFAULT 0,
    grade VARCHAR(2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, period_start, period_end)
);

-- Emotional Analytics (Aggregated metrics)
CREATE TABLE emotional_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    emotion VARCHAR(50) NOT NULL,
    total_events INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    conversion_impact DECIMAL(5,2),
    revenue_impact DECIMAL(10,2),
    avg_confidence DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, date, emotion)
);

-- =====================================================
-- BILLING & SUBSCRIPTIONS
-- =====================================================

-- Subscription History
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255),
    tier VARCHAR(50),
    status VARCHAR(50),
    mrr DECIMAL(10,2),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    emotion_events_count INTEGER DEFAULT 0,
    interventions_count INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    overage_charges DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, month)
);

-- =====================================================
-- SYSTEM TABLES
-- =====================================================

-- Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Events (For Clerk sync)
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL, -- 'clerk', 'stripe', etc.
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) UNIQUE,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Organizations
CREATE INDEX idx_organizations_domain ON organizations(domain);
CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX idx_organizations_parent ON organizations(parent_org_id);

-- Users
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);

-- Memberships
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(organization_id);
CREATE INDEX idx_memberships_email ON memberships(user_email);
CREATE INDEX idx_memberships_status ON memberships(invitation_status);

-- Emotional Events
CREATE INDEX idx_emotional_events_org ON emotional_events(organization_id);
CREATE INDEX idx_emotional_events_session ON emotional_events(session_id);
CREATE INDEX idx_emotional_events_emotion ON emotional_events(emotion);
CREATE INDEX idx_emotional_events_detected ON emotional_events(detected_at);

-- Identity Resolution
CREATE INDEX idx_identity_org_session ON identity_resolutions(organization_id, session_id);
CREATE INDEX idx_identity_user ON identity_resolutions(user_id);

-- Interventions
CREATE INDEX idx_interventions_org ON interventions(organization_id);
CREATE INDEX idx_interventions_event ON interventions(emotional_event_id);
CREATE INDEX idx_interventions_status ON interventions(status);

-- Analytics
CREATE INDEX idx_analytics_org_date ON emotional_analytics(organization_id, date);
CREATE INDEX idx_accountability_org_period ON accountability_scorecards(organization_id, period_start);

-- Audit
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_org ON audit_log(organization_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for backend operations)
CREATE POLICY service_role_all ON organizations FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON users FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON memberships FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON emotional_events FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON identity_resolutions FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON interventions FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON accountability_scorecards FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON emotional_analytics FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON subscription_history FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON usage_tracking FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON audit_log FOR ALL TO service_role USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(p_clerk_user_id VARCHAR)
RETURNS TABLE (
    organization_id UUID,
    company_name VARCHAR,
    domain VARCHAR,
    role VARCHAR,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as organization_id,
        o.company_name,
        o.domain,
        COALESCE(m.role, u.role) as role,
        (u.organization_id = o.id) as is_primary
    FROM users u
    LEFT JOIN memberships m ON m.user_id = u.id
    LEFT JOIN organizations o ON o.id = COALESCE(m.organization_id, u.organization_id)
    WHERE u.clerk_user_id = p_clerk_user_id
    AND o.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_clerk_user_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE clerk_user_id = p_clerk_user_id 
        AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert super admin users (update these emails as needed)
INSERT INTO users (clerk_user_id, email, name, role) VALUES
    ('pending_clerk_sync_matt', 'matt@aligniq.ai', 'Matt Kiselstein', 'super_admin'),
    ('pending_clerk_sync_info', 'info@sentientiq.ai', 'SentientIQ Admin', 'super_admin')
ON CONFLICT (email) DO UPDATE SET 
    role = 'super_admin',
    updated_at = NOW();

-- =====================================================
-- GRANTS (for different access levels)
-- =====================================================

-- Create roles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END$$;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Limited access for anonymous
GRANT SELECT ON organizations TO anon;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE organizations IS 'Core tenant/organization table - each paying customer';
COMMENT ON TABLE users IS 'Users synced from Clerk authentication';
COMMENT ON TABLE memberships IS 'Many-to-many relationship between users and organizations';
COMMENT ON TABLE emotional_events IS 'Raw emotion detection events from client websites';
COMMENT ON TABLE identity_resolutions IS 'Links anonymous sessions to known users/customers';
COMMENT ON TABLE interventions IS 'Actions triggered based on detected emotions';
COMMENT ON TABLE accountability_scorecards IS 'Tracks intervention recommendations vs actions taken';
COMMENT ON COLUMN organizations.is_white_label IS 'True for agency partners who can resell';
COMMENT ON COLUMN organizations.revenue_share_percent IS 'Commission rate for white-label partners';
COMMENT ON COLUMN users.role IS 'super_admin > admin > owner > user';