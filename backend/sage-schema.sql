-- Sage Database Schema
-- The Brutally Honest UX Advisor with pgvector similarity search
-- Drop existing tables if rebuilding

DROP TABLE IF EXISTS sage_analyses CASCADE;
DROP TABLE IF EXISTS sage_patterns CASCADE;
DROP TABLE IF EXISTS sage_insights CASCADE;
DROP TABLE IF EXISTS sage_entities CASCADE;

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- SAGE_ANALYSES - Core analysis storage
-- ==========================================
CREATE TABLE sage_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Message metadata
    message_content TEXT NOT NULL,
    message_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA256 hash for deduplication
    message_embedding vector(1536), -- OpenAI embeddings for similarity search

    -- Sender info
    sender VARCHAR(255),
    sender_domain VARCHAR(255),
    platform VARCHAR(50), -- email, linkedin, slack, etc.
    subject TEXT,

    -- Analysis results
    message_intent VARCHAR(50), -- inbox, advisory, strategic
    bullshit_score DECIMAL(3,2) CHECK (bullshit_score >= 0 AND bullshit_score <= 1),
    recommendation VARCHAR(50), -- DELETE, RESPOND, INVESTIGATE, STRATEGIC
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

    -- Detailed analysis (JSONB for flexibility)
    analysis JSONB NOT NULL,
    manipulation_tactics TEXT[],
    authentic_elements TEXT[],

    -- Emotional intelligence
    emotional_state VARCHAR(100),
    emotional_confidence DECIMAL(3,2),
    sentientiq_insight TEXT,

    -- Metadata
    model_used VARCHAR(50) DEFAULT 'claude-3.5-sonnet',
    sage_version VARCHAR(20) DEFAULT '1.0.0',
    analysis_time_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sage_analyses_sender ON sage_analyses(sender);
CREATE INDEX idx_sage_analyses_bullshit ON sage_analyses(bullshit_score);
CREATE INDEX idx_sage_analyses_created ON sage_analyses(created_at DESC);
CREATE INDEX idx_sage_analyses_intent ON sage_analyses(message_intent);
CREATE INDEX idx_sage_analyses_recommendation ON sage_analyses(recommendation);

-- Vector similarity search index
CREATE INDEX idx_sage_analyses_embedding ON sage_analyses
USING ivfflat (message_embedding vector_cosine_ops)
WITH (lists = 100);

-- ==========================================
-- SAGE_PATTERNS - Learned manipulation patterns
-- ==========================================
CREATE TABLE sage_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pattern_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50), -- manipulation, authentic, strategic
    pattern_signature JSONB,
    pattern_embedding vector(1536),

    -- Detection metrics
    detection_count INTEGER DEFAULT 0,
    accuracy_score DECIMAL(3,2),
    false_positive_rate DECIMAL(3,2),

    -- Examples and learning
    example_messages UUID[], -- References to sage_analyses
    keywords TEXT[],
    phrases TEXT[],

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- SAGE_ENTITIES - Track senders/companies
-- ==========================================
CREATE TABLE sage_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entity identification
    entity_type VARCHAR(50), -- person, company, bot
    entity_name VARCHAR(255) NOT NULL,
    entity_domain VARCHAR(255),
    entity_email VARCHAR(255),

    -- Behavioral metrics
    total_messages INTEGER DEFAULT 1,
    average_bullshit_score DECIMAL(3,2),
    highest_bullshit_score DECIMAL(3,2),
    lowest_bullshit_score DECIMAL(3,2),

    -- Trust metrics
    trust_score DECIMAL(3,2),
    manipulation_count INTEGER DEFAULT 0,
    authentic_count INTEGER DEFAULT 0,

    -- Patterns
    common_tactics TEXT[],
    common_intents VARCHAR(50)[],

    -- Metadata
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,

    UNIQUE(entity_type, entity_name)
);

-- ==========================================
-- SAGE_INSIGHTS - UX and strategic insights
-- ==========================================
CREATE TABLE sage_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Insight details
    insight_type VARCHAR(50), -- ux, strategy, pattern, trend
    insight_category VARCHAR(100),
    insight_title VARCHAR(255) NOT NULL,
    insight_content TEXT NOT NULL,

    -- Relevance and impact
    relevance_score DECIMAL(3,2),
    impact_score DECIMAL(3,2),
    confidence_score DECIMAL(3,2),

    -- Supporting data
    supporting_analyses UUID[], -- References to sage_analyses
    evidence JSONB,
    recommendations TEXT[],
    action_items TEXT[],

    -- Emotional intelligence angle
    emotional_pattern TEXT,
    sentientiq_opportunity TEXT,

    -- Metadata
    is_actionable BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ==========================================
-- FUNCTIONS for pgvector similarity search
-- ==========================================

-- Find similar messages
CREATE OR REPLACE FUNCTION find_similar_messages(
    query_embedding vector(1536),
    limit_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    message_content TEXT,
    sender VARCHAR(255),
    bullshit_score DECIMAL(3,2),
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.id,
        sa.message_content,
        sa.sender,
        sa.bullshit_score,
        1 - (sa.message_embedding <=> query_embedding) AS similarity
    FROM sage_analyses sa
    WHERE sa.message_embedding IS NOT NULL
    ORDER BY sa.message_embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get entity trust score
CREATE OR REPLACE FUNCTION get_entity_trust(
    entity_email VARCHAR(255)
)
RETURNS DECIMAL AS $$
DECLARE
    trust DECIMAL;
BEGIN
    SELECT trust_score INTO trust
    FROM sage_entities
    WHERE entity_email = entity_email
    LIMIT 1;

    RETURN COALESCE(trust, 0.5); -- Default neutral trust
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS for automatic updates
-- ==========================================

-- Update entity metrics when new analysis is added
CREATE OR REPLACE FUNCTION update_entity_metrics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO sage_entities (
        entity_type,
        entity_name,
        entity_email,
        total_messages,
        average_bullshit_score,
        highest_bullshit_score,
        lowest_bullshit_score,
        last_seen
    ) VALUES (
        'person',
        NEW.sender,
        NEW.sender,
        1,
        NEW.bullshit_score,
        NEW.bullshit_score,
        NEW.bullshit_score,
        NOW()
    )
    ON CONFLICT (entity_type, entity_name) DO UPDATE SET
        total_messages = sage_entities.total_messages + 1,
        average_bullshit_score = (
            (sage_entities.average_bullshit_score * sage_entities.total_messages + NEW.bullshit_score)
            / (sage_entities.total_messages + 1)
        ),
        highest_bullshit_score = GREATEST(sage_entities.highest_bullshit_score, NEW.bullshit_score),
        lowest_bullshit_score = LEAST(sage_entities.lowest_bullshit_score, NEW.bullshit_score),
        last_seen = NOW(),
        manipulation_count = CASE
            WHEN NEW.bullshit_score > 0.7
            THEN sage_entities.manipulation_count + 1
            ELSE sage_entities.manipulation_count
        END,
        authentic_count = CASE
            WHEN NEW.bullshit_score < 0.3
            THEN sage_entities.authentic_count + 1
            ELSE sage_entities.authentic_count
        END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entity_metrics
AFTER INSERT ON sage_analyses
FOR EACH ROW
EXECUTE FUNCTION update_entity_metrics();

-- ==========================================
-- VIEWS for common queries
-- ==========================================

-- High-value strategic conversations
CREATE OR REPLACE VIEW sage_strategic_conversations AS
SELECT
    id,
    message_content,
    sender,
    subject,
    analysis->'strategic_assessment' as strategic_assessment,
    analysis->'opportunities' as opportunities,
    confidence_score,
    created_at
FROM sage_analyses
WHERE message_intent = 'advisory' OR message_intent = 'strategic'
ORDER BY created_at DESC;

-- Worst offenders
CREATE OR REPLACE VIEW sage_worst_offenders AS
SELECT
    entity_name,
    entity_email,
    total_messages,
    average_bullshit_score,
    highest_bullshit_score,
    manipulation_count,
    last_seen
FROM sage_entities
WHERE average_bullshit_score > 0.7
ORDER BY average_bullshit_score DESC, total_messages DESC;

-- Recent high-quality insights
CREATE OR REPLACE VIEW sage_recent_insights AS
SELECT
    insight_title,
    insight_content,
    recommendations,
    action_items,
    sentientiq_opportunity,
    relevance_score,
    impact_score,
    generated_at
FROM sage_insights
WHERE is_actionable = true
    AND is_archived = false
    AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY generated_at DESC
LIMIT 20;

-- ==========================================
-- PERMISSIONS (adjust based on your setup)
-- ==========================================

-- Grant permissions to your app user
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- ==========================================
-- INITIAL DATA (Optional)
-- ==========================================

-- Add some known patterns
INSERT INTO sage_patterns (pattern_name, pattern_type, keywords, phrases) VALUES
('Fake Urgency', 'manipulation',
 ARRAY['limited time', 'act now', 'expires soon', 'last chance'],
 ARRAY['offer expires in', 'only X spots left', 'prices go up tomorrow']),

('Trust Building', 'authentic',
 ARRAY['transparency', 'openly', 'honestly', 'full disclosure'],
 ARRAY['want to be transparent', 'in the interest of', 'to be honest with you']),

('Value First', 'strategic',
 ARRAY['value', 'benefit', 'outcome', 'result', 'impact'],
 ARRAY['focus on value', 'demonstrate value before', 'value-driven approach'])
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Sage schema created successfully! 🧠' as message;