-- White-Label Multi-Level Tenant Architecture
-- Agencies can have their own tenants (clients)

-- Extend organizations table for white-label
ALTER TABLE organizations ADD COLUMN parent_org_id UUID REFERENCES organizations(id);
ALTER TABLE organizations ADD COLUMN is_white_label BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN white_label_config JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN revenue_share_percent DECIMAL(3,2) DEFAULT 0.30;
ALTER TABLE organizations ADD COLUMN referral_code VARCHAR(50) UNIQUE;

-- White label branding config
CREATE TABLE white_label_brands (
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

-- Track the hierarchy and revenue
CREATE TABLE tenant_hierarchy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_org_id UUID REFERENCES organizations(id),
    child_org_id UUID REFERENCES organizations(id),
    relationship_type VARCHAR(50), -- 'white_label', 'referral', 'direct'
    revenue_share_percent DECIMAL(3,2),
    monthly_revenue_generated DECIMAL(10,2) DEFAULT 0,
    total_revenue_generated DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_org_id, child_org_id)
);

-- Viral referral tracking
CREATE TABLE referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_org_id UUID REFERENCES organizations(id),
    referred_email VARCHAR(255),
    referred_org_id UUID REFERENCES organizations(id),
    referral_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'signed_up', 'activated', 'churned'
    reward_amount DECIMAL(10,2),
    reward_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agency client insights (aggregated)
CREATE TABLE agency_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_org_id UUID REFERENCES organizations(id),
    total_clients INTEGER DEFAULT 0,
    total_fraud_detected INTEGER DEFAULT 0,
    total_savings_generated DECIMAL(12,2) DEFAULT 0,
    average_client_health_score DECIMAL(3,2),
    top_issues JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Revenue sharing transactions
CREATE TABLE revenue_shares (
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

-- Viral mechanics tracking
CREATE TABLE viral_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    event_type VARCHAR(50), -- 'share', 'invite', 'demo_request', 'white_label_signup'
    target_email VARCHAR(255),
    target_company VARCHAR(255),
    conversion_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_hierarchy_parent ON tenant_hierarchy(parent_org_id);
CREATE INDEX idx_hierarchy_child ON tenant_hierarchy(child_org_id);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_org_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_revenue_parent ON revenue_shares(parent_org_id);

-- Views for easy reporting
CREATE VIEW agency_dashboard AS
SELECT 
    o.id as agency_id,
    o.company_name as agency_name,
    COUNT(DISTINCT th.child_org_id) as total_clients,
    SUM(rs.share_amount) as total_revenue_share,
    AVG(ai.average_client_health_score) as avg_client_health
FROM organizations o
LEFT JOIN tenant_hierarchy th ON o.id = th.parent_org_id
LEFT JOIN revenue_shares rs ON o.id = rs.parent_org_id
LEFT JOIN agency_insights ai ON o.id = ai.agency_org_id
WHERE o.is_white_label = true
GROUP BY o.id, o.company_name;

-- Function to calculate negative CAC
CREATE OR REPLACE FUNCTION calculate_negative_cac(org_id UUID)
RETURNS TABLE(
    direct_revenue DECIMAL,
    referral_revenue DECIMAL,
    white_label_revenue DECIMAL,
    total_revenue DECIMAL,
    acquisition_cost DECIMAL,
    effective_cac DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN relationship_type = 'direct' THEN monthly_revenue_generated END), 0) as direct_revenue,
        COALESCE(SUM(CASE WHEN relationship_type = 'referral' THEN monthly_revenue_generated * 0.1 END), 0) as referral_revenue,
        COALESCE(SUM(CASE WHEN relationship_type = 'white_label' THEN monthly_revenue_generated * revenue_share_percent END), 0) as white_label_revenue,
        COALESCE(SUM(monthly_revenue_generated), 0) as total_revenue,
        50.00 as acquisition_cost, -- Assumed CAC
        50.00 - COALESCE(SUM(monthly_revenue_generated * 0.2), 0) as effective_cac
    FROM tenant_hierarchy
    WHERE parent_org_id = org_id;
END;
$$ LANGUAGE plpgsql;