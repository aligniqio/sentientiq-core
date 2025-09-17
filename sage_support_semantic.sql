-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create sage_support table with vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS sage_support (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,

    -- Request details
    message TEXT NOT NULL,
    message_embedding vector(1536), -- OpenAI text-embedding-ada-002 dimensions

    -- Rich context from the application
    context JSONB NOT NULL,
    source TEXT NOT NULL, -- 'gtm_implementation', 'configuration', 'intervention_setup', etc.

    -- Response and resolution
    sage_response TEXT,
    sage_response_embedding vector(1536),
    resolution_notes TEXT,
    resolution_time_seconds INTEGER,

    -- Status tracking
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'escalated'
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

    -- Categorization for learning
    issue_category TEXT, -- 'gtm_setup', 'script_error', 'intervention_config', 'billing', etc.
    issue_tags TEXT[],

    -- Satisfaction tracking
    user_satisfaction INTEGER, -- 1-5 rating
    user_feedback TEXT,

    -- Timestamps
    responded_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sage_support_org_id ON sage_support(organization_id);
CREATE INDEX IF NOT EXISTS idx_sage_support_user_id ON sage_support(user_id);
CREATE INDEX IF NOT EXISTS idx_sage_support_status ON sage_support(status);
CREATE INDEX IF NOT EXISTS idx_sage_support_source ON sage_support(source);
CREATE INDEX IF NOT EXISTS idx_sage_support_category ON sage_support(issue_category);
CREATE INDEX IF NOT EXISTS idx_sage_support_created_at ON sage_support(created_at DESC);

-- Create vector similarity search indexes
CREATE INDEX IF NOT EXISTS idx_sage_support_message_embedding
ON sage_support USING ivfflat (message_embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_sage_support_response_embedding
ON sage_support USING ivfflat (sage_response_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create GIN index for JSONB context searches
CREATE INDEX IF NOT EXISTS idx_sage_support_context ON sage_support USING GIN (context);

-- Create GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_sage_support_tags ON sage_support USING GIN (issue_tags);

-- Enable RLS
ALTER TABLE sage_support ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create support requests"
ON sage_support FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own support requests"
ON sage_support FOR SELECT
USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can update support requests"
ON sage_support FOR UPDATE
USING (auth.role() = 'service_role');

-- Create a view for common GTM issues (for Sage to learn from)
CREATE OR REPLACE VIEW sage_gtm_knowledge_base AS
SELECT
    id,
    message,
    sage_response,
    context->>'step' as implementation_step,
    context->'scripts_copied' as scripts_copied_status,
    issue_category,
    issue_tags,
    user_satisfaction,
    resolution_time_seconds
FROM sage_support
WHERE source = 'gtm_implementation'
    AND status = 'resolved'
    AND user_satisfaction >= 4
ORDER BY created_at DESC;

-- Function to find similar support requests using vector similarity
CREATE OR REPLACE FUNCTION find_similar_support_requests(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.8,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    message TEXT,
    sage_response TEXT,
    context JSONB,
    issue_category TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.message,
        s.sage_response,
        s.context,
        s.issue_category,
        1 - (s.message_embedding <=> query_embedding) as similarity
    FROM sage_support s
    WHERE s.message_embedding IS NOT NULL
        AND s.status = 'resolved'
        AND 1 - (s.message_embedding <=> query_embedding) > match_threshold
    ORDER BY s.message_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get support request statistics for an organization
CREATE OR REPLACE FUNCTION get_support_stats(org_id TEXT)
RETURNS TABLE (
    total_requests INTEGER,
    resolved_requests INTEGER,
    average_resolution_time INTEGER,
    average_satisfaction FLOAT,
    common_categories TEXT[],
    recent_issues JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_requests,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END)::INTEGER as resolved_requests,
        AVG(resolution_time_seconds)::INTEGER as average_resolution_time,
        AVG(user_satisfaction)::FLOAT as average_satisfaction,
        ARRAY_AGG(DISTINCT issue_category) FILTER (WHERE issue_category IS NOT NULL) as common_categories,
        jsonb_agg(
            jsonb_build_object(
                'message', message,
                'created_at', created_at,
                'status', status
            ) ORDER BY created_at DESC
        ) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_issues
    FROM sage_support
    WHERE organization_id = org_id;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sage_support_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sage_support_updated_at
    BEFORE UPDATE ON sage_support
    FOR EACH ROW
    EXECUTE FUNCTION update_sage_support_updated_at();

-- Insert some seed data for common GTM issues (for Sage to learn from)
INSERT INTO sage_support (
    user_id,
    organization_id,
    message,
    context,
    source,
    sage_response,
    status,
    issue_category,
    issue_tags,
    user_satisfaction,
    resolution_time_seconds
) VALUES
(
    'seed-user-1',
    'seed-org-1',
    'I cant find where to add the Custom HTML tag in GTM',
    '{"page": "implementation", "step": "telemetry", "debug_mode": true}'::jsonb,
    'gtm_implementation',
    'In GTM, click "Tags" in the left sidebar, then click "New" button (top right). Click on "Tag Configuration" box and select "Custom HTML" from the list. Paste your telemetry script there.',
    'resolved',
    'gtm_setup',
    ARRAY['navigation', 'custom_html', 'step1'],
    5,
    120
),
(
    'seed-user-2',
    'seed-org-2',
    'The preview mode is not showing my tags firing',
    '{"page": "implementation", "step": "intervention", "debug_mode": true, "scripts_copied": {"telemetry": true, "intervention": true}}'::jsonb,
    'gtm_implementation',
    'Make sure you have the correct trigger set. The intervention script needs "DOM Ready" trigger, not just "All Pages". In Preview mode, check the console for debug messages. You should see "[GTM] Intervention tag fired at DOM Ready!" if debug mode is enabled.',
    'resolved',
    'gtm_setup',
    ARRAY['preview_mode', 'triggers', 'debugging'],
    5,
    180
),
(
    'seed-user-3',
    'seed-org-3',
    'What is the difference between All Pages and DOM Ready triggers?',
    '{"page": "implementation", "step": "viewing_instructions", "debug_mode": false}'::jsonb,
    'gtm_implementation',
    'All Pages trigger fires immediately when the page starts loading. DOM Ready waits until the HTML is fully loaded. Use All Pages for the telemetry script (Step 1) and DOM Ready for the intervention script (Step 2) to ensure telemetry initializes first.',
    'resolved',
    'gtm_setup',
    ARRAY['triggers', 'timing', 'configuration'],
    4,
    90
);

-- Comments for Sage integration
COMMENT ON TABLE sage_support IS 'Semantic search-enabled support request system for Sage AI assistant';
COMMENT ON COLUMN sage_support.message_embedding IS 'Vector embedding of user message for semantic similarity search';
COMMENT ON COLUMN sage_support.sage_response_embedding IS 'Vector embedding of Sage response for finding similar solutions';
COMMENT ON COLUMN sage_support.context IS 'Rich context including page location, user state, and configuration';
COMMENT ON FUNCTION find_similar_support_requests IS 'Find similar resolved issues using vector similarity search';