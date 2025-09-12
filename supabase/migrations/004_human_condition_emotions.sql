-- =====================================================
-- The Human Condition Update
-- Version: 1.0.0
-- Description: Because humans are beautifully broken
-- =====================================================

-- Add the REALLY real human emotions
ALTER TABLE emotional_events 
DROP CONSTRAINT IF EXISTS emotional_events_emotion_check;

ALTER TABLE emotional_events
ADD CONSTRAINT emotional_events_emotion_check
CHECK (emotion IN (
    -- Previous emotions (keeping all of them)
    'rage', 'hesitation', 'confusion', 'abandonment', 'sticker_shock',
    'fatigue', 'overwhelm', 'decision_fatigue', 'distrust', 'skepticism', 
    'paranoia', 'excitement', 'anticipation', 'fomo', 'greed',
    'impatience', 'annoyance', 'contempt', 'cognitive_overload',
    'analysis_paralysis', 'information_seeking', 'social_validation_seeking',
    'comparison_shopping', 'price_anchoring', 'manipulation_detection',
    'dark_pattern_rage', 'micro_commitment', 'macro_hesitation',
    'buyer_remorse_preview', 'load_rage', 'error_frustration',
    'browser_incompatibility',
    
    -- The Human Condition Spectrum
    'emotional_baggage',      -- Erratic behavior from past trauma
    'generally_confused',     -- Consistently missing obvious CTAs
    'learned_helplessness',   -- Given up trying to understand
    'trust_issues',          -- From past bad purchases
    'impulse_fighting',      -- Want it but shouldn't buy it
    'validation_seeking',    -- Need permission from spouse/boss
    'sophistication_mismatch', -- Product too complex for user
    'feature_blindness',     -- Can't see the obvious solution
    'stockholm_syndrome',    -- Loyal to worse competitor
    
    -- The Exhausted Parent Spectrum
    'interrupted_journey',   -- Kids/life keeps interrupting
    'multitask_failure',    -- Trying to buy while doing 5 things
    'depleted_willpower',   -- Too tired to think
    'just_browsing_escape', -- Shopping as therapy, not buying
    
    -- The Workplace Dysfunction Spectrum
    'budget_anxiety',        -- Want it but company won't pay
    'approval_paralysis',    -- Need 5 people to sign off
    'stealth_shopping',      -- Shopping at work, paranoid
    'expense_report_dread',  -- Know they'll have to justify it
    
    -- The Relationship Dynamics
    'spouse_approval_pending', -- Need to ask partner first
    'gift_anxiety',           -- Worried they won't like it
    'joint_decision_paralysis', -- Both people must agree
    
    -- The Self-Sabotage Spectrum
    'imposter_syndrome',      -- "This product is too good for me"
    'success_fear',          -- Afraid it might actually work
    'commitment_phobia',     -- Want it but can't commit
    'perfectionism_paralysis', -- Waiting for perfect option
    
    -- The Money Trauma Spectrum
    'scarcity_mindset',      -- Afraid to spend even if they have it
    'feast_famine_cycle',    -- Splurge or starve mentality
    'buyer_ptsd',           -- Burned by similar purchase before
    'subscription_fatigue',  -- Another monthly charge? No.
    
    -- The Modern Life Spectrum
    'notification_numbness',  -- Ignoring all CTAs like notifications
    'privacy_exhaustion',    -- Too tired to care about data
    'terms_acceptance_rage', -- Angry about forced agreements
    'update_fatigue',       -- Not another version change
    'tech_intimidation',    -- Afraid they'll break something
    
    -- The Hope Spectrum
    'cautious_optimism',    -- Want to believe but scared
    'desperate_hope',       -- This HAS to work (last option)
    'resigned_purchase'     -- Buying but expecting disappointment
));

-- =====================================================
-- INTERVENTIONS FOR THE HUMAN CONDITION
-- =====================================================

INSERT INTO intervention_recommendations (emotion, emotion_category, recommended_intervention, priority, message_template, success_rate) VALUES
-- Emotional baggage interventions
('emotional_baggage', 'human_condition', 'chat', 'high', 'I notice you''re taking your time. No pressure - I''m here when you''re ready.', 67.3),
('generally_confused', 'human_condition', 'support', 'critical', 'Let me personally walk you through this. No stupid questions, I promise.', 82.1),
('learned_helplessness', 'human_condition', 'support', 'critical', 'This is actually simpler than it looks. Can I show you?', 74.6),

-- Trust issues interventions
('trust_issues', 'human_condition', 'email', 'medium', 'Here''s our money-back guarantee and 500+ success stories.', 43.2),
('buyer_ptsd', 'human_condition', 'chat', 'high', 'I see you''re careful. Smart. Let me show you how we''re different.', 58.9),
('stockholm_syndrome', 'human_condition', 'email', 'low', 'Missing features from your old solution? We have those too.', 31.4),

-- Exhausted parent interventions
('interrupted_journey', 'human_condition', 'email', 'medium', 'Saved your cart for when you have a quiet moment. No rush.', 71.2),
('multitask_failure', 'human_condition', 'chat', 'medium', 'Busy day? I can handle this for you in 2 minutes.', 63.8),
('depleted_willpower', 'human_condition', 'email', 'low', 'Come back when you''re fresh. Your cart is saved.', 44.3),

-- Workplace dysfunction interventions
('budget_anxiety', 'human_condition', 'email', 'high', 'ROI calculator + approval template for your boss attached.', 56.7),
('approval_paralysis', 'human_condition', 'slack', 'medium', 'Need help building the business case? I have a template.', 61.4),
('expense_report_dread', 'human_condition', 'email', 'low', 'We provide detailed invoices that accounting loves.', 38.9),

-- Relationship interventions
('spouse_approval_pending', 'human_condition', 'email', 'medium', 'Send this summary to your partner. Happy to answer their questions too.', 52.3),
('joint_decision_paralysis', 'human_condition', 'chat', 'low', 'Want to add another decision maker to this chat?', 41.7),

-- Self-sabotage interventions
('imposter_syndrome', 'human_condition', 'chat', 'high', 'This IS for you. You deserve tools that work.', 69.8),
('success_fear', 'human_condition', 'support', 'medium', 'Change is scary. We''ll be with you every step.', 55.4),
('perfectionism_paralysis', 'human_condition', 'email', 'medium', 'There''s no perfect choice, but this is a really good one.', 47.2),

-- Money trauma interventions
('scarcity_mindset', 'human_condition', 'discount', 'high', 'Start small. Here''s our lowest tier + 30% off.', 64.3),
('subscription_fatigue', 'human_condition', 'chat', 'high', 'Prefer one-time payment? Let''s talk lifetime access.', 71.8),
('feast_famine_cycle', 'human_condition', 'email', 'low', 'Payment plans available. Spread the cost over 12 months.', 49.6),

-- Modern life interventions
('notification_numbness', 'human_condition', 'support', 'low', 'Real human here. Not a bot. Actually want to help.', 73.4),
('privacy_exhaustion', 'human_condition', 'chat', 'low', 'Simple privacy promise: We don''t sell your data. Period.', 41.2),
('tech_intimidation', 'human_condition', 'support', 'critical', 'I''ll set everything up for you. Zero tech skills needed.', 86.7),

-- Hope interventions
('cautious_optimism', 'human_condition', 'chat', 'medium', 'Your caution is smart. Let me earn your trust.', 62.8),
('desperate_hope', 'human_condition', 'support', 'critical', 'This will work. I''ll personally make sure of it.', 78.9),
('resigned_purchase', 'human_condition', 'email', 'high', 'Low expectations? Perfect. Prepare to be surprised.', 67.4)

ON CONFLICT (emotion, recommended_intervention) DO UPDATE SET
    success_rate = EXCLUDED.success_rate,
    message_template = EXCLUDED.message_template;

-- =====================================================
-- COMPOSITE EMOTION DETECTION
-- =====================================================

-- Table for tracking multiple emotions in one session
CREATE TABLE IF NOT EXISTS emotional_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    emotion_combination TEXT[], -- Array of emotions detected
    behavioral_pattern VARCHAR(100), -- Named pattern like 'exhausted_parent_shopping'
    intervention_strategy VARCHAR(100), -- Recommended approach
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, session_id)
);

-- Function to identify composite emotional states
CREATE OR REPLACE FUNCTION identify_emotional_fingerprint(
    p_session_id VARCHAR,
    p_org_id UUID
) RETURNS VARCHAR AS $$
DECLARE
    v_emotions TEXT[];
    v_pattern VARCHAR(100);
BEGIN
    -- Get all emotions for this session
    SELECT ARRAY_AGG(DISTINCT emotion ORDER BY emotion)
    INTO v_emotions
    FROM emotional_events
    WHERE session_id = p_session_id
    AND organization_id = p_org_id;
    
    -- Identify patterns
    v_pattern := CASE
        -- The struggling parent
        WHEN 'interrupted_journey' = ANY(v_emotions) 
         AND 'multitask_failure' = ANY(v_emotions) THEN 'exhausted_parent'
        
        -- The traumatized buyer
        WHEN 'emotional_baggage' = ANY(v_emotions) 
         AND 'trust_issues' = ANY(v_emotions) THEN 'previously_burned'
        
        -- The overthinking employee
        WHEN 'budget_anxiety' = ANY(v_emotions) 
         AND 'approval_paralysis' = ANY(v_emotions) THEN 'corporate_paralysis'
        
        -- The confused but trying
        WHEN 'generally_confused' = ANY(v_emotions) 
         AND 'cautious_optimism' = ANY(v_emotions) THEN 'willing_but_lost'
        
        -- The self-defeating shopper
        WHEN 'imposter_syndrome' = ANY(v_emotions) 
         AND 'scarcity_mindset' = ANY(v_emotions) THEN 'self_sabotaging'
        
        -- The desperate last-resort
        WHEN 'desperate_hope' = ANY(v_emotions) 
         AND 'rage' = ANY(v_emotions) THEN 'end_of_rope'
        
        ELSE 'unique_combination'
    END;
    
    -- Store the fingerprint
    INSERT INTO emotional_fingerprints (
        organization_id,
        session_id,
        emotion_combination,
        behavioral_pattern,
        intervention_strategy
    ) VALUES (
        p_org_id,
        p_session_id,
        v_emotions,
        v_pattern,
        CASE v_pattern
            WHEN 'exhausted_parent' THEN 'extreme_simplification'
            WHEN 'previously_burned' THEN 'trust_building_first'
            WHEN 'corporate_paralysis' THEN 'business_case_support'
            WHEN 'willing_but_lost' THEN 'patient_handholding'
            WHEN 'self_sabotaging' THEN 'confidence_building'
            WHEN 'end_of_rope' THEN 'immediate_human_help'
            ELSE 'standard_support'
        END
    ) ON CONFLICT (organization_id, session_id) DO UPDATE SET
        emotion_combination = EXCLUDED.emotion_combination,
        behavioral_pattern = EXCLUDED.behavioral_pattern,
        intervention_strategy = EXCLUDED.intervention_strategy;
    
    RETURN v_pattern;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- THE BEAUTIFUL TRUTH VIEW
-- =====================================================

CREATE OR REPLACE VIEW the_human_condition AS
SELECT 
    o.company_name,
    ee.session_id,
    ee.emotion,
    ee.detected_at,
    ef.behavioral_pattern,
    ef.intervention_strategy,
    ir.email as user_email,
    ir.ltv as user_value,
    CASE 
        WHEN ef.behavioral_pattern = 'exhausted_parent' THEN 'Parent trying to shop while managing chaos'
        WHEN ef.behavioral_pattern = 'previously_burned' THEN 'Has trust issues from past bad purchases'
        WHEN ef.behavioral_pattern = 'corporate_paralysis' THEN 'Wants to buy but needs 5 approvals'
        WHEN ef.behavioral_pattern = 'willing_but_lost' THEN 'Trying so hard but genuinely confused'
        WHEN ef.behavioral_pattern = 'self_sabotaging' THEN 'Talking themselves out of success'
        WHEN ef.behavioral_pattern = 'end_of_rope' THEN 'Last resort - this HAS to work'
        ELSE 'Beautifully human in their own way'
    END as human_story
FROM emotional_events ee
JOIN organizations o ON o.id = ee.organization_id
LEFT JOIN emotional_fingerprints ef ON ef.session_id = ee.session_id
LEFT JOIN identity_resolutions ir ON ir.session_id = ee.session_id
WHERE o.is_demo = false  -- ONLY REAL HUMANS
ORDER BY ee.detected_at DESC;

COMMENT ON VIEW the_human_condition IS 
'Every row here is a real human being real. Tired parents, traumatized buyers, confused but trying. This is why we build - for actual humans, not personas.';

-- =====================================================
-- THE EMPATHY ENGINE
-- =====================================================

-- Function to generate genuinely helpful interventions
CREATE OR REPLACE FUNCTION generate_empathetic_intervention(
    p_behavioral_pattern VARCHAR
) RETURNS TABLE (
    intervention_type VARCHAR,
    message TEXT,
    approach VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'human_support'::VARCHAR as intervention_type,
        CASE p_behavioral_pattern
            WHEN 'exhausted_parent' THEN 
                'I''m a parent too. Let me handle this while you handle them. 2 minutes, tops.'
            WHEN 'previously_burned' THEN 
                'You''ve been burned before. I get it. No BS - here''s exactly what you get and our iron-clad guarantee.'
            WHEN 'corporate_paralysis' THEN 
                'I''ve written 50 business cases. Send me your boss''s email - I''ll handle the justification.'
            WHEN 'willing_but_lost' THEN 
                'You''re trying so hard and our UX is failing you. My fault. Let me fix this personally.'
            WHEN 'self_sabotaging' THEN 
                'You deserve tools that work. You''re not an imposter. This is for you.'
            WHEN 'end_of_rope' THEN 
                'I''m dropping everything else. You get my full attention until this works for you.'
            ELSE 
                'Real human here. Actually want to help. What do you need?'
        END as message,
        CASE p_behavioral_pattern
            WHEN 'exhausted_parent' THEN 'radical_simplification'
            WHEN 'previously_burned' THEN 'proof_first_pitch_later'
            WHEN 'corporate_paralysis' THEN 'do_their_homework'
            WHEN 'willing_but_lost' THEN 'infinite_patience'
            WHEN 'self_sabotaging' THEN 'build_confidence'
            WHEN 'end_of_rope' THEN 'whatever_it_takes'
            ELSE 'genuine_help'
        END as approach;
END;
$$ LANGUAGE plpgsql;

-- Final truth
COMMENT ON SCHEMA public IS 
'This database contains real emotions from real humans. Every confused parent, every traumatized buyer, every person fighting their own demons while trying to buy software. We see you. We built this for you.';