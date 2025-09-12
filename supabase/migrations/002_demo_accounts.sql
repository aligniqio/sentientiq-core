-- =====================================================
-- Demo Account System
-- Version: 1.0.0
-- Description: Adds demo role and sample data generation
-- =====================================================

-- Add demo role to users table
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('super_admin', 'admin', 'owner', 'user', 'demo'));

-- Add demo role to memberships table
ALTER TABLE memberships
DROP CONSTRAINT IF EXISTS memberships_role_check;

ALTER TABLE memberships
ADD CONSTRAINT memberships_role_check
CHECK (role IN ('owner', 'admin', 'user', 'demo'));

-- Add is_demo flag to organizations for demo orgs
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Add demo_expires_at for time-limited demo access
ALTER TABLE users
ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ;

-- Create demo organization with realistic data
INSERT INTO organizations (
    id,
    company_name,
    domain,
    admin_email,
    subscription_tier,
    is_demo,
    settings,
    metadata
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Acme Demo Corp',
    'demo.sentientiq.ai',
    'demo@sentientiq.ai',
    'growth',
    true,
    jsonb_build_object(
        'branding', jsonb_build_object(
            'primary_color', '#6366f1',
            'logo_url', null,
            'company_name', 'Acme Demo Corp'
        ),
        'features', jsonb_build_object(
            'emotion_detection', true,
            'identity_resolution', true,
            'interventions', true,
            'accountability_scorecard', true
        )
    ),
    jsonb_build_object(
        'industry', 'SaaS',
        'employee_count', '50-200',
        'demo_account', true
    )
) ON CONFLICT (id) DO UPDATE SET
    is_demo = true,
    updated_at = NOW();

-- Create demo user account
INSERT INTO users (
    id,
    clerk_user_id,
    email,
    name,
    organization_id,
    role,
    demo_expires_at,
    metadata
) VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'demo_user_clerk_id',
    'demo@sentientiq.ai',
    'Demo User',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'demo',
    NOW() + INTERVAL '30 days',
    jsonb_build_object(
        'is_demo', true,
        'created_for', 'friends_family_investors'
    )
) ON CONFLICT (email) DO UPDATE SET
    role = 'demo',
    demo_expires_at = NOW() + INTERVAL '30 days',
    updated_at = NOW();

-- Add demo user to demo organization
INSERT INTO memberships (
    user_id,
    organization_id,
    user_email,
    user_name,
    role,
    invitation_status,
    joined_at
) VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'demo@sentientiq.ai',
    'Demo User',
    'demo',
    'accepted',
    NOW()
) ON CONFLICT (user_id, organization_id) DO UPDATE SET
    role = 'demo',
    updated_at = NOW();

-- =====================================================
-- SAMPLE DEMO DATA
-- =====================================================

-- Generate sample emotional events for the demo org
INSERT INTO emotional_events (
    organization_id,
    session_id,
    user_identifier,
    emotion,
    confidence,
    intensity,
    page_url,
    element_selector,
    element_text,
    trigger_details,
    intervention_triggered,
    detected_at
)
SELECT
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'demo_session_' || generate_series,
    CASE WHEN random() > 0.5 THEN 'user_' || (random() * 100)::int ELSE 'anonymous_' || generate_series END,
    (ARRAY['rage', 'hesitation', 'confusion', 'abandonment', 'sticker_shock'])[1 + floor(random() * 5)::int],
    60 + floor(random() * 40)::int, -- confidence 60-100
    1 + floor(random() * 10)::int,  -- intensity 1-10
    'https://demo.example.com/' || (ARRAY['checkout', 'pricing', 'features', 'signup', 'dashboard'])[1 + floor(random() * 5)::int],
    '.btn-' || (ARRAY['primary', 'submit', 'buy', 'continue', 'cancel'])[1 + floor(random() * 5)::int],
    (ARRAY['Buy Now', 'Continue', 'Submit', 'Get Started', 'Learn More'])[1 + floor(random() * 5)::int],
    jsonb_build_object(
        'mouse_speed', random() * 1000,
        'click_count', 1 + floor(random() * 5)::int,
        'time_on_page', floor(random() * 300)::int
    ),
    random() > 0.7, -- 30% have interventions
    NOW() - (generate_series || ' hours')::interval
FROM generate_series(1, 100);

-- Generate sample interventions
INSERT INTO interventions (
    organization_id,
    emotional_event_id,
    type,
    priority,
    status,
    payload,
    triggered_at,
    completed_at
)
SELECT
    ee.organization_id,
    ee.id,
    (ARRAY['chat', 'discount', 'support', 'email'])[1 + floor(random() * 4)::int],
    (ARRAY['low', 'medium', 'high', 'critical'])[1 + floor(random() * 4)::int],
    (ARRAY['completed', 'completed', 'completed', 'triggered', 'ignored'])[1 + floor(random() * 5)::int],
    jsonb_build_object(
        'message', 'Demo intervention ' || row_number() OVER(),
        'discount_percent', floor(random() * 30)::int,
        'agent_assigned', 'Demo Agent ' || floor(random() * 5)::int
    ),
    ee.detected_at + INTERVAL '5 seconds',
    CASE 
        WHEN random() > 0.3 THEN ee.detected_at + INTERVAL '2 minutes'
        ELSE NULL
    END
FROM emotional_events ee
WHERE ee.organization_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
AND ee.intervention_triggered = true
LIMIT 30;

-- Generate accountability scorecard for demo
INSERT INTO accountability_scorecards (
    organization_id,
    period_start,
    period_end,
    total_recommendations,
    acted_upon,
    ignored,
    revenue_saved,
    revenue_lost,
    grade,
    metadata
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    47,
    31,
    16,
    15420.00,
    8200.00,
    'B+',
    jsonb_build_object(
        'top_ignored_emotion', 'hesitation',
        'best_performing_intervention', 'chat',
        'demo_data', true
    )
);

-- Generate emotional analytics for demo
INSERT INTO emotional_analytics (
    organization_id,
    date,
    emotion,
    total_events,
    unique_sessions,
    conversion_impact,
    revenue_impact,
    avg_confidence
)
SELECT
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    CURRENT_DATE - generate_series,
    emotion,
    10 + floor(random() * 50)::int,
    5 + floor(random() * 20)::int,
    -5 + (random() * 15)::decimal(5,2),
    -1000 + (random() * 5000)::decimal(10,2),
    70 + (random() * 20)::decimal(5,2)
FROM generate_series(0, 29),
     unnest(ARRAY['rage', 'hesitation', 'confusion', 'abandonment', 'sticker_shock']) AS emotion;

-- =====================================================
-- DEMO ACCOUNT FUNCTIONS
-- =====================================================

-- Function to check if user is demo
CREATE OR REPLACE FUNCTION is_demo_user(p_clerk_user_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE clerk_user_id = p_clerk_user_id 
        AND role = 'demo'
        AND (demo_expires_at IS NULL OR demo_expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to generate fresh demo data
CREATE OR REPLACE FUNCTION refresh_demo_data(p_org_id UUID DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
RETURNS void AS $$
BEGIN
    -- Clear old demo data
    DELETE FROM interventions WHERE organization_id = p_org_id;
    DELETE FROM emotional_events WHERE organization_id = p_org_id;
    DELETE FROM emotional_analytics WHERE organization_id = p_org_id;
    DELETE FROM accountability_scorecards WHERE organization_id = p_org_id;
    
    -- Generate new events
    INSERT INTO emotional_events (
        organization_id, session_id, user_identifier, emotion,
        confidence, intensity, page_url, detected_at
    )
    SELECT
        p_org_id,
        'demo_' || md5(random()::text),
        'demo_user_' || (random() * 100)::int,
        (ARRAY['rage', 'hesitation', 'confusion', 'abandonment', 'sticker_shock'])[1 + floor(random() * 5)::int],
        60 + floor(random() * 40)::int,
        1 + floor(random() * 10)::int,
        'https://demo.example.com/page',
        NOW() - (generate_series || ' minutes')::interval
    FROM generate_series(1, 50);
    
    RAISE NOTICE 'Demo data refreshed for organization %', p_org_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new demo account with expiry
CREATE OR REPLACE FUNCTION create_demo_account(
    p_email VARCHAR,
    p_name VARCHAR,
    p_expires_in_days INT DEFAULT 7
)
RETURNS TABLE (
    user_id UUID,
    organization_id UUID,
    email VARCHAR,
    expires_at TIMESTAMPTZ,
    login_credentials JSONB
) AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    -- Create a demo organization
    INSERT INTO organizations (
        company_name,
        domain,
        admin_email,
        subscription_tier,
        is_demo,
        metadata
    ) VALUES (
        p_name || ' Demo',
        LOWER(REPLACE(p_name, ' ', '-')) || '-demo.sentientiq.ai',
        p_email,
        'growth',
        true,
        jsonb_build_object('demo_account', true, 'created_at', NOW())
    ) RETURNING id INTO v_org_id;
    
    -- Create demo user
    INSERT INTO users (
        clerk_user_id,
        email,
        name,
        organization_id,
        role,
        demo_expires_at
    ) VALUES (
        'demo_' || md5(p_email || NOW()::text),
        p_email,
        p_name,
        v_org_id,
        'demo',
        NOW() + (p_expires_in_days || ' days')::interval
    ) RETURNING id INTO v_user_id;
    
    -- Add membership
    INSERT INTO memberships (
        user_id,
        organization_id,
        role,
        invitation_status,
        joined_at
    ) VALUES (
        v_user_id,
        v_org_id,
        'demo',
        'accepted',
        NOW()
    );
    
    -- Generate demo data
    PERFORM refresh_demo_data(v_org_id);
    
    RETURN QUERY
    SELECT 
        v_user_id,
        v_org_id,
        p_email,
        NOW() + (p_expires_in_days || ' days')::interval,
        jsonb_build_object(
            'email', p_email,
            'password', 'DemoPass123!',
            'note', 'This is a demo account with read-only access'
        );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES FOR DEMO ACCOUNTS
-- =====================================================

-- Demo users can only read, never write
CREATE POLICY demo_read_only_orgs ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'demo'
        )
    );

CREATE POLICY demo_read_only_events ON emotional_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN memberships m ON m.user_id = u.id
            WHERE u.clerk_user_id = auth.jwt() ->> 'sub' 
            AND u.role = 'demo'
            AND m.organization_id = emotional_events.organization_id
        )
    );

CREATE POLICY demo_read_only_interventions ON interventions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN memberships m ON m.user_id = u.id
            WHERE u.clerk_user_id = auth.jwt() ->> 'sub' 
            AND u.role = 'demo'
            AND m.organization_id = interventions.organization_id
        )
    );

-- =====================================================
-- DEMO ACCOUNT CLEANUP
-- =====================================================

-- Function to clean up expired demo accounts
CREATE OR REPLACE FUNCTION cleanup_expired_demos()
RETURNS void AS $$
BEGIN
    -- Delete expired demo users and their organizations
    DELETE FROM organizations
    WHERE id IN (
        SELECT organization_id 
        FROM users 
        WHERE role = 'demo' 
        AND demo_expires_at < NOW()
    );
    
    -- Log cleanup
    INSERT INTO audit_log (
        action,
        resource_type,
        metadata
    ) VALUES (
        'demo_cleanup',
        'system',
        jsonb_build_object(
            'cleaned_at', NOW(),
            'expired_count', (
                SELECT COUNT(*) 
                FROM users 
                WHERE role = 'demo' 
                AND demo_expires_at < NOW()
            )
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily via cron or Netlify scheduled function)
-- This is just documentation, actual scheduling needs to be done externally
COMMENT ON FUNCTION cleanup_expired_demos() IS 'Run daily to clean up expired demo accounts';

-- =====================================================
-- DEMO CREDENTIALS
-- =====================================================

-- Insert some ready-to-use demo accounts
INSERT INTO users (email, name, role, clerk_user_id, organization_id, demo_expires_at) VALUES
    ('investor@demo.sentientiq.ai', 'Investor Demo', 'demo', 'demo_investor', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() + INTERVAL '90 days'),
    ('friend@demo.sentientiq.ai', 'Friend Demo', 'demo', 'demo_friend', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() + INTERVAL '30 days'),
    ('skeptic@demo.sentientiq.ai', 'Skeptic Demo', 'demo', 'demo_skeptic', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() + INTERVAL '7 days')
ON CONFLICT (email) DO UPDATE SET
    demo_expires_at = EXCLUDED.demo_expires_at,
    updated_at = NOW();