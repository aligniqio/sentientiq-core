-- =====================================================
-- The Real Human Emotion Spectrum
-- Version: 1.0.0
-- Description: Because humans aren't just "happy" or "sad"
-- =====================================================

-- Drop the old boring constraint
ALTER TABLE emotional_events 
DROP CONSTRAINT IF EXISTS emotional_events_emotion_check;

-- Add the REAL emotion spectrum
ALTER TABLE emotional_events
ADD CONSTRAINT emotional_events_emotion_check
CHECK (emotion IN (
    -- The Original Five
    'rage',              -- 3+ clicks in <300ms = someone's PISSED
    'hesitation',        -- Hovering for 2+ seconds = analysis paralysis
    'confusion',         -- Erratic scrolling = WTF is this?
    'abandonment',       -- 60+ seconds idle = they're gone
    'sticker_shock',     -- Mouse deceleration at price = too expensive
    
    -- The Exhaustion Spectrum
    'fatigue',           -- Decreasing interaction speed over time
    'overwhelm',         -- Rapid tab switching, no completion
    'decision_fatigue',  -- Multiple back-and-forth between options
    
    -- The Suspicion Spectrum  
    'distrust',          -- Repeated checks of privacy/security pages
    'skepticism',        -- Multiple clicks on testimonials/proof
    'paranoia',          -- Inspecting source code, checking URLs
    
    -- The Desire Spectrum
    'excitement',        -- Rapid positive interactions
    'anticipation',      -- Hovering on "buy" but not clicking
    'fomo',             -- Checking availability/stock/timers
    'greed',            -- Multiple adds to cart
    
    -- The Frustration Spectrum
    'impatience',       -- Rapid scrolling to find something
    'annoyance',        -- Dismissing popups aggressively  
    'contempt',         -- Minimal interaction time per page
    
    -- The Cognitive Load Spectrum
    'cognitive_overload', -- Too many form fields = abandonment
    'analysis_paralysis', -- Comparing same items repeatedly
    'information_seeking', -- Deep diving into specs/docs
    
    -- The Social Proof Spectrum
    'social_validation_seeking', -- Checking reviews repeatedly
    'comparison_shopping',       -- Opening competitor sites
    'price_anchoring',          -- Checking prices multiple times
    
    -- The Dark Patterns Detection
    'manipulation_detection',   -- User realizes they're being tricked
    'dark_pattern_rage',        -- Anger at deceptive UI
    
    -- The Commitment Spectrum
    'micro_commitment',         -- Small positive actions
    'macro_hesitation',        -- Pausing before big decisions
    'buyer_remorse_preview',   -- Removing items from cart
    
    -- The Technical Frustration
    'load_rage',              -- Slow page loads causing clicks
    'error_frustration',      -- Form validation errors
    'browser_incompatibility' -- Features not working
));

-- Add emotion categories for better grouping
ALTER TABLE emotional_events
ADD COLUMN IF NOT EXISTS emotion_category VARCHAR(50);

-- Function to categorize emotions
CREATE OR REPLACE FUNCTION categorize_emotion(p_emotion VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE 
        WHEN p_emotion IN ('rage', 'annoyance', 'contempt', 'dark_pattern_rage', 'load_rage', 'error_frustration') 
            THEN 'anger'
        WHEN p_emotion IN ('hesitation', 'skepticism', 'distrust', 'paranoia', 'manipulation_detection') 
            THEN 'suspicion'
        WHEN p_emotion IN ('confusion', 'cognitive_overload', 'analysis_paralysis', 'overwhelm') 
            THEN 'confusion'
        WHEN p_emotion IN ('abandonment', 'fatigue', 'decision_fatigue', 'buyer_remorse_preview') 
            THEN 'abandonment_risk'
        WHEN p_emotion IN ('sticker_shock', 'price_anchoring', 'comparison_shopping') 
            THEN 'price_sensitivity'
        WHEN p_emotion IN ('excitement', 'anticipation', 'fomo', 'greed', 'micro_commitment') 
            THEN 'purchase_intent'
        WHEN p_emotion IN ('impatience', 'information_seeking', 'social_validation_seeking') 
            THEN 'research_mode'
        ELSE 'uncategorized'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing events to have categories
UPDATE emotional_events 
SET emotion_category = categorize_emotion(emotion)
WHERE emotion_category IS NULL;

-- Trigger to auto-categorize new events
CREATE OR REPLACE FUNCTION auto_categorize_emotion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.emotion_category = categorize_emotion(NEW.emotion);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categorize_emotion_trigger
BEFORE INSERT OR UPDATE ON emotional_events
FOR EACH ROW
EXECUTE FUNCTION auto_categorize_emotion();

-- =====================================================
-- INTERVENTION RECOMMENDATIONS BY EMOTION
-- =====================================================

-- Create intervention recommendations table
CREATE TABLE IF NOT EXISTS intervention_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emotion VARCHAR(100) NOT NULL,
    emotion_category VARCHAR(50),
    recommended_intervention VARCHAR(50),
    priority VARCHAR(20),
    message_template TEXT,
    success_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(emotion, recommended_intervention)
);

-- Insert recommendations for each emotion
INSERT INTO intervention_recommendations (emotion, emotion_category, recommended_intervention, priority, message_template, success_rate) VALUES
-- Rage interventions
('rage', 'anger', 'chat', 'critical', 'I see you''re having trouble. Let me help immediately.', 72.5),
('rage', 'anger', 'support', 'critical', 'Connecting you with a specialist right now.', 68.3),
('dark_pattern_rage', 'anger', 'escalation', 'critical', 'Our CEO would like to personally address your concern.', 85.2),

-- Hesitation interventions
('hesitation', 'suspicion', 'discount', 'high', 'Still thinking? Here''s 15% off to help you decide.', 45.7),
('hesitation', 'suspicion', 'chat', 'medium', 'Any questions I can answer?', 38.9),
('macro_hesitation', 'suspicion', 'email', 'low', 'Take your time. Here''s more info for later.', 28.4),

-- Confusion interventions
('confusion', 'confusion', 'chat', 'high', 'Looking for something specific? I know exactly where it is.', 61.2),
('cognitive_overload', 'confusion', 'support', 'high', 'Let''s simplify this. Can I walk you through it?', 70.8),
('analysis_paralysis', 'confusion', 'email', 'medium', 'Here''s a comparison chart to help you decide.', 42.3),

-- Abandonment interventions
('abandonment', 'abandonment_risk', 'email', 'high', 'You left something behind...', 23.4),
('fatigue', 'abandonment_risk', 'slack', 'medium', 'Save your progress and come back anytime.', 31.2),
('buyer_remorse_preview', 'abandonment_risk', 'discount', 'critical', 'Having second thoughts? Here''s 20% off.', 52.8),

-- Price sensitivity interventions
('sticker_shock', 'price_sensitivity', 'discount', 'critical', 'The price surprised you? Let''s fix that.', 67.4),
('price_anchoring', 'price_sensitivity', 'chat', 'high', 'Our ROI calculator might interest you.', 44.6),
('comparison_shopping', 'price_sensitivity', 'email', 'high', 'Here''s why we''re worth the premium.', 35.9),

-- Positive emotion interventions
('excitement', 'purchase_intent', 'chat', 'low', 'You seem excited! Any final questions?', 78.9),
('anticipation', 'purchase_intent', 'discount', 'medium', 'Ready to buy? Here''s a surprise discount!', 81.3),
('fomo', 'purchase_intent', 'slack', 'high', 'Only 3 left at this price!', 73.6),

-- Technical frustration interventions
('load_rage', 'anger', 'support', 'critical', 'Technical issue detected. Support agent alerted.', 83.7),
('error_frustration', 'anger', 'chat', 'critical', 'That error shouldn''t happen. Let me fix it.', 79.4),
('browser_incompatibility', 'anger', 'email', 'high', 'Try our mobile app for a better experience.', 41.2)

ON CONFLICT (emotion, recommended_intervention) DO UPDATE SET
    success_rate = EXCLUDED.success_rate,
    message_template = EXCLUDED.message_template;

-- =====================================================
-- EMOTION DETECTION PATTERNS
-- =====================================================

-- Table to store detection patterns for each emotion
CREATE TABLE IF NOT EXISTS emotion_detection_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emotion VARCHAR(100) NOT NULL UNIQUE,
    detection_rules JSONB NOT NULL,
    min_confidence INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert detection patterns
INSERT INTO emotion_detection_patterns (emotion, detection_rules, min_confidence) VALUES
('rage', '{"clicks": {"count": 3, "timeframe_ms": 300}}', 85),
('hesitation', '{"hover": {"duration_ms": 2000, "element": "button"}}', 70),
('confusion', '{"scroll": {"pattern": "erratic", "reversals": 3}}', 65),
('abandonment', '{"idle": {"duration_ms": 60000}}', 90),
('sticker_shock', '{"mouse": {"deceleration_at": "price", "threshold": 0.7}}', 75),
('fatigue', '{"interaction_speed": {"decline_rate": 0.5, "over_minutes": 10}}', 60),
('distrust', '{"page_views": {"privacy_policy": 2, "terms": 2}}', 70),
('excitement', '{"clicks": {"positive_cta": 3, "speed": "fast"}}', 65),
('fomo', '{"checks": {"stock_status": 2, "timer_element": 3}}', 80),
('cognitive_overload', '{"form": {"abandonment_at_field": 5}}', 75),
('comparison_shopping', '{"tabs": {"competitor_domains": true, "count": 2}}', 85),
('load_rage', '{"page_load": {"time_ms": 5000, "clicks_during": 2}}', 90)
ON CONFLICT (emotion) DO UPDATE SET
    detection_rules = EXCLUDED.detection_rules,
    min_confidence = EXCLUDED.min_confidence;

-- =====================================================
-- VIEWS FOR EMOTIONAL INSIGHTS
-- =====================================================

-- View for emotion frequency by category
CREATE OR REPLACE VIEW emotion_category_insights AS
SELECT 
    o.company_name,
    o.id as organization_id,
    ee.emotion_category,
    COUNT(*) as event_count,
    AVG(ee.confidence) as avg_confidence,
    COUNT(DISTINCT ee.session_id) as unique_sessions,
    COUNT(CASE WHEN ee.intervention_triggered THEN 1 END) as interventions_triggered,
    ROUND(
        COUNT(CASE WHEN ee.intervention_triggered THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as intervention_rate
FROM emotional_events ee
JOIN organizations o ON o.id = ee.organization_id
WHERE o.is_demo = false  -- TRUTH FILTER
GROUP BY o.company_name, o.id, ee.emotion_category;

-- View for most profitable emotions to target
CREATE OR REPLACE VIEW high_value_emotion_opportunities AS
SELECT 
    ee.emotion,
    ee.emotion_category,
    COUNT(*) as frequency,
    AVG(ir.ltv) as avg_user_ltv,
    COUNT(*) * AVG(ir.ltv) as total_opportunity_value,
    ir_rec.recommended_intervention,
    ir_rec.success_rate
FROM emotional_events ee
JOIN identity_resolutions ir ON ir.session_id = ee.session_id
JOIN intervention_recommendations ir_rec ON ir_rec.emotion = ee.emotion
JOIN organizations o ON o.id = ee.organization_id
WHERE o.is_demo = false  -- TRUTH FILTER
  AND ir.ltv > 0
  AND ee.intervention_triggered = false  -- Missed opportunities
GROUP BY ee.emotion, ee.emotion_category, ir_rec.recommended_intervention, ir_rec.success_rate
ORDER BY total_opportunity_value DESC;

-- =====================================================
-- THE TRUTH COUNTER
-- =====================================================

-- Function to get REAL emotion counts
CREATE OR REPLACE FUNCTION get_real_emotion_counts()
RETURNS TABLE (
    emotion VARCHAR,
    real_count BIGINT,
    real_revenue_impact DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ee.emotion,
        COUNT(*) as real_count,
        COALESCE(SUM(ir.ltv), 0) as real_revenue_impact
    FROM emotional_events ee
    LEFT JOIN identity_resolutions ir ON ir.session_id = ee.session_id
    JOIN organizations o ON o.id = ee.organization_id
    WHERE o.is_demo = false  -- ONLY REAL EMOTIONS
    GROUP BY ee.emotion
    ORDER BY real_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_real_emotion_counts() IS 
'Returns ONLY real emotions from real users. No Math.random(). No bullshit. Every emotion here cost or saved real money.';